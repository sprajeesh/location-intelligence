## Objective

Extend the scoring by including the Hazards found for the address.

## What already exists (complement, do not rebuild)

The Natural Hazards Portal (naturalhazardsportal.govt.nz), run by the Natural Hazards Commission, already provides per-property hazard information and settled EQC/NHC claims from 1997 onwards, drawing on GeoNet, the National Seismic Hazard Model, and council layers. This build differs by producing a single normalised, re-weightable, country-wide composite view rather than a per-property lookup. Treat the Portal and GeoNet as reference and validation sources, not things to replicate.

## The two hard problems (design around these first)

**1. Data is fragmented, especially flood.** There is no single national flood layer. Each regional council maintains its own flood hazard mapping in different formats, extents, and detail. Tsunami evacuation zones are similarly held per regional Civil Defence group. Do not assume a clean national dataset exists for these. The pipeline must ingest source by source and record provenance per layer. Phase the build so national-scale layers ship first and council-level flood data is integrated progressively.

**2. Hazards do not stack in the same places, so averaging hides danger.** Going inland lowers tsunami risk but not fault or flood risk. Elevation helps flood but not shaking. A naive weighted average can make a location with one catastrophic risk look moderate. The scoring model must therefore output both a composite score and a "worst single hazard" value plus per-hazard severe flags, so a single extreme exposure is never averaged away.

## Unit of analysis

Use a hex grid (H3) as the primary spatial unit so hazards measured in different geometries (rasters, polygons, zones, point densities) can be aggregated to a common cell. Suggested resolution: H3 res 7 for the national view (~5 km² cells) with drill-down to res 8 or 9 where source data supports it. A 1 km raster grid is an acceptable alternative if the team prefers raster tooling. Store one row per cell with all hazard sub-scores, the composite, the worst-hazard value, source references, and data-currency dates.

## Data sources (verify current endpoint and licence before ingesting each)

Do not trust hard-coded URLs from this spec. For every source, confirm the live endpoint, format, licence, and attribution requirement before use, and record them.

| Hazard              | Primary source                                                   | What it provides                                                              | Access mode                                                     |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Earthquake shaking  | National Seismic Hazard Model (NSHM 2022), GNS                   | Modelled shaking hazard by location                                           | Downloadable model outputs / grids                              |
| Active faults       | NZ Active Faults Database, GNS                                   | Fault traces, proximity input                                                 | GIS layer / web service                                         |
| Volcanic            | GNS volcanic hazard zones                                        | Zone membership (e.g. Taupō Volcanic Zone, Auckland Volcanic Field, Taranaki) | Reports / GIS zones                                             |
| Landslide           | GNS national landslide susceptibility model                      | Susceptibility class by location                                              | GIS raster / service                                            |
| Tsunami             | Regional CDEM evacuation zones; national tsunami modelling (GNS) | Zone membership; proxy via coastal proximity + low elevation                  | Fragmented ArcGIS per region; derive proxy from DEM             |
| Flood               | Regional council flood hazard layers (~16 councils)              | Flood extent / depth / return period                                          | Mostly ArcGIS REST FeatureServer/MapServer, per council, varied |
| Coastal / elevation | LINZ Data Service (DEM, coastline)                               | Elevation, coastal proximity, low-lying derivation                            | API (key required)                                              |
| Validation overlay  | NHC/EQC claims via Natural Hazards Portal                        | Historical claim density as ground-truth check                                | Per-property, not a bulk hazard layer                           |

Where an authoritative national layer is missing (tsunami, flood), build a transparent proxy from LINZ elevation and coastline (for example, low elevation within a set distance of the coast as a first-pass tsunami proxy), clearly labelled as a proxy, and replace it with real council data as it is integrated.

## Scoring model

Normalise each hazard to a common 0-100 sub-score using an explicit, documented rule per hazard (for example, shaking mapped from modelled ground acceleration bands, flood from return-period and depth bands, landslide from susceptibility class, tsunami and volcanic from zone membership). Then compute:

- **Composite score** = weighted sum of sub-scores, with weights the user can adjust live in the UI.
- **Worst single hazard** = the maximum sub-score across hazards for that cell.
- **Severe flags** = boolean per hazard where a cell exceeds a defined severe threshold.

Default weights should be sensible and stated, but the point of the tool is that the user re-weights to their own priorities. Always surface the worst-hazard value alongside the composite so a single extreme risk is visible.

## Outputs

1. A reproducible data pipeline (scripted, re-runnable, provenance-logged) that produces the per-cell dataset.
2. An interactive web map with: layer toggles per hazard, live weighting sliders that recompute the composite client-side, cell drill-down showing every sub-score and its source and date, a clear legend, and prominent disclaimers.
3. The per-cell dataset exported in a portable format for reuse.

## Suggested tech stack (not prescriptive)

Pipeline in Python (geopandas, rasterio or rioxarray, the h3 library), with DuckDB or GeoParquet for the cell store. Vector tiles via tippecanoe to PMTiles for cheap static hosting. Frontend in MapLibre GL JS. The whole thing should be static-hostable so it can run without a live backend.

## Build phases

- **Phase 0 — Scaffold.** Grid generation, cell schema, provenance logging, empty pipeline that runs end to end with one dummy hazard.
- **Phase 1 — Nationally available hazards.** Ingest seismic, faults, volcanic zones, landslide susceptibility, plus DEM-derived tsunami and coastal proxies. Ship a working national composite from these alone.
- **Phase 2 — Flood integration.** Add council flood layers one region at a time, replacing proxies. Track coverage so the map can show which regions have real flood data versus proxy.
- **Phase 3 — Interactivity.** Client-side re-weighting, drill-down, worst-hazard display, layer toggles.
- **Phase 4 — Trust and polish.** Disclaimers, per-layer currency dates, source attribution, coverage indicator, legend, export.

## Mandatory constraints

- Verify each source's endpoint, format, licence, and attribution before ingesting, and record them in the pipeline.
- Stamp every cell and layer with its data-currency date; show it in drill-down.
- Display a persistent disclaimer: this is an illustrative, resolution-limited view built from available data, not a LIM, not property-specific advice, and not a prediction of events.
- Never present property-level certainty. The finest honest resolution is the grid cell, and coarser where source data is coarse.
- Show coverage honestly: where a hazard uses a proxy rather than authoritative data, label it.

## Non-goals

Not a Land Information Memorandum or substitute for one. Not event prediction. Not insurance pricing. Not legal or financial advice. Not a per-address guarantee.

## Kick-off prompt (paste to the LLM/agent)

> Build the tool described in the attached spec. Start with Phase 0 and Phase 1 only. Before writing ingestion code for any data source, confirm its current live endpoint, format, and licence, and tell me what you found and any gaps. Use H3 res 7 for the national grid. Produce a runnable pipeline and a static MapLibre map showing a national composite from the nationally available hazards, with the worst-single-hazard value visible per cell and a disclaimer banner. Do not fabricate data for sources you cannot access; use a clearly labelled elevation-and-coastline proxy for tsunami until real data is integrated, and flag every proxy in the UI.
