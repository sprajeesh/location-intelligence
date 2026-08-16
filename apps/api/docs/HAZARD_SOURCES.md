# Hazard Data Source Verification

Stage 0 of the hazard-scoring rollout (see `HAZARD.md` at the repo root for
the full build spec). Before any ingestion code is written, every candidate
source must have its live endpoint, format, licence, and attribution
confirmed — the spec explicitly warns not to trust its own hard-coded URLs
and not to fabricate access to a source that isn't actually reachable. This
document is that confirmation pass, current as of 2026-08-16. **Re-verify
before ingesting** — several endpoints below are already noted as unstable
or in flux.

## Cross-cutting caveat: GNS Science renamed

GNS Science merged into **Earth Sciences New Zealand** on 2025-06-30. Every
`gns.cri.nz` URL below may migrate without notice. Do not hard-code any GNS
endpoint into an ingestion script without a live reachability check
immediately before each run.

## Status legend

- **Confirmed** — live endpoint reached, format/licence verified this pass.
- **Partial** — endpoint or dataset confirmed to exist, but licence and/or
  exact service URL could not be independently verified this session.
- **Gap** — no accessible bulk/queryable endpoint exists today. Per the
  spec's "do not fabricate" instruction, these are not proxied with a
  plausible-sounding URL; they're recorded as open gaps.

---

## A. Earthquake shaking — National Seismic Hazard Model (NSHM 2022)

**Status: Gap** (for bulk ingestion)

- Endpoint found: `https://nshm.gns.cri.nz/` — a point-query hazard viewer
  (lat/lon/Vs30/AEP in, hazard curve + response spectrum out). Not a bulk
  grid/raster download.
- Underlying modelling code is open-source on GitHub
  (`GNS-Science/nzshm-opensha`, `nzshm-hazlab`, `nshm-toshi-api`) and 30
  science reports are published as PDFs at `nshm-static-reports.gns.cri.nz`.
- No confirmed national PGA/shaking grid (GeoTIFF/shapefile) for bulk
  download, and no stated licence/attribution text found on the viewer
  itself after repeated fetch attempts.
- **Implication for Phase 1**: either script against the point-query
  mechanism per-cell (H3 centroid → query → store — likely slow at national
  scale and may violate reasonable-use expectations for a query tool) or
  treat this hazard as deferred until a bulk grid is confirmed available.
  Do not assume a downloadable national grid exists.

## B. Active faults — NZ Active Faults Database (NZAFD)

**Status: Confirmed, with a licence caveat that needs a product decision**

- Endpoints: `https://data.gns.cri.nz/af/` (portal with download), ArcGIS
  REST services at
  `https://gis.gns.cri.nz/server/rest/services/NZAFD/ActiveFaultsDatabase/MapServer`
  and `.../Active_Faults/NZActiveFaultDatasets/MapServer`. Also catalogued
  at `catalogue.data.govt.nz/dataset/new-zealand-active-faults-database-1-250000-scale1`.
- Format: Shapefile, KML, GeoJSON, OGC WMS/WFS, or direct ArcGIS MapServer
  consumption. No API key/registration needed for the web service.
- **Licence: "Other licensing — check with source agency," not CC BY —
  explicitly includes a non-commercial-use restriction** ("may not be used
  for commercial purposes"). Contact `spatialdata@gns.cri.nz` to clarify
  terms for a property-scoring product before ingesting.
- Attribution required if permitted: *"GNS Science as the source of the
  NZAFD in any publication"* — citation: "GNS Science. (2016). New Zealand
  Active Faults Database 1:250,000 scale [Data set]. GNS Science."
  (DOI: 10.21420/R1QN-BM52).
- Scale constraint: the 1:250,000 dataset must not be used below that
  scale (i.e. don't imply parcel-level fault proximity precision from it).
- **Action before Phase 1**: get written clarification from GNS/Earth
  Sciences NZ on whether this app's use counts as "commercial" — this
  blocks ingestion, not just attribution wording.

## C. Volcanic hazard zones

**Status: Gap**

- No single national volcanic-hazard-zone GIS layer exists.
- Auckland Volcanic Field: DEVORA programme (GNS + University of Auckland +
  Auckland Council + EQC) produced multi-hazard eruption scenario shapefiles,
  documented in GNS Science report 2018/29 (paid/requested PDF via
  `shop.gns.cri.nz/2018-029-pdf/`) — shapefiles are referenced but no public
  download link or web service was found.
- Taranaki ashfall/tephra hazard zones (A–D): narrative report only (GNS
  Consultancy Report 2011/37, PDF), no GIS layer found.
- Auckland Council's GeoMaps viewer hosts volcanic *viewshaft*/height-sensitive
  planning overlays, not hazard zones.
- **No bulk-downloadable or queryable GIS endpoint confirmed** — this hazard
  cannot be ingested from a script today; it would need a direct data-sharing
  request to GNS/DEVORA/Auckland Council.

## D. Landslide susceptibility

**Status: Gap (national); regional data exists but is not this repo's scope yet)**

- GNS's "Hōretireti Whenua – Sliding Lands" programme (MBIE Endeavour Fund,
  started 2023) is actively building a national susceptibility model — **not
  yet released**.
- What exists today: the NZ Landslide Database (historical landslide
  inventory — points/polygons, not susceptibility) via
  `https://www.gns.cri.nz/data-and-resources/new-zealand-landslide-database/`
  / `data.gns.cri.nz/landslides/`. Free registration required for full
  feature classes; unregistered access shows points only. Download
  availability described only in an FAQ, not directly confirmed.
- A regional-only (not national) Auckland landslide susceptibility
  assessment was completed May 2025, published via Auckland Council's
  Knowledge Auckland portal — out of scope for a national layer.
- **No national susceptibility layer exists to ingest.** Revisit when the
  Hōretireti Whenua programme publishes output.

## E. Tsunami — CDEM evacuation zones + GNS national model

**Status: Partial — fragmentation confirmed, several endpoints live**

Confirmed genuinely fragmented per region, no shared backend (NEMA's "Get
Ready" map is a display aggregation of regional data, not a common service):

| Region | Status | Endpoint | Licence |
|---|---|---|---|
| Auckland Council | Confirmed | `https://services1.arcgis.com/n4yPwebTjJCmXB6W/arcgis/rest/services/Tsunami_Evacuation_Zone/FeatureServer/0` | CC BY 4.0 (confirmed via DCAT `data.json`) |
| Greater Wellington (GWRC) | Partial | Dataset exists on `data-gwrc.opendata.arcgis.com`/`opendata.gw.govt.nz`, 3 threat-level zones (red/orange/yellow) | Licence page 404'd this session — portal default elsewhere is CC BY 4.0 but not independently confirmed here |
| West Coast, Otago, Southland, Northland | Confirmed to exist, separately hosted | Each region runs its own ArcGIS Hub/MapServer (`gis.westcoast.govt.nz`, `orc-spatial-data-portal-orcnz.hub.arcgis.com`, `data-esgis.opendata.arcgis.com`, `data-nrcgis.opendata.arcgis.com`) | Not verified per-region this pass |

- National model: GNS's 2013 National Tsunami Hazard Model page confirms
  shapefile output (DOI `10.21420/2Y8C-2D58`), but download requires
  agreeing to click-through Terms & Conditions — the licence text itself
  could not be retrieved. Treat licence as unconfirmed, not CC BY-assumed.
- **Action before Phase 1**: confirm each region's endpoint and licence
  individually at ingestion time — don't assume the Auckland CC BY 4.0
  result generalizes to other councils.

## F. Flood — regional council layers

**Status: Partial — "~16 councils, ~16 formats" claim confirmed accurate,
and worse than just format differences**

| Council | Status | Endpoint | Format / convention | Licence |
|---|---|---|---|---|
| Auckland Council | Partial | "Flood Plains"/"Flood Prone Areas"/"Flood Sensitive Areas" exist on `data-aucklandcouncil.opendata.arcgis.com`; exact FeatureServer URL not re-confirmed this session (catalog paginated) | — | Not independently confirmed for flood specifically; sibling tsunami dataset is CC BY 4.0 |
| Greater Wellington (GWRC) | Confirmed | `https://mapping.gw.govt.nz/arcgis/rest/services/GW/Flood_Hazards_Areas/MapServer` | JSON/GeoJSON via REST; uses **AEP** convention (1%, 0.23%) | Not stated on the REST page — unconfirmed |
| Environment Canterbury | Confirmed | `https://gis.ecan.govt.nz/arcgis/rest/services/Story_Maps/Flood_Investigations/MapServer`, 13 layers, organised per sub-catchment (Mason, Waiau, Ashburton) | JSON/GeoJSON/PBF; uses **ARI** convention (200-year) — different from GWRC's AEP | ECan's separate tsunami dataset is explicitly "Other licensing — check with source agency," proving not everything here is open |
| Christchurch City Council | Confirmed (partial) | CC BY 4.0 confirmed for "Historic Flooding"/"Lowlying" (`gis.ccc.govt.nz/server/rest/services/OpenData/LandCharacteristic/FeatureServer/4` and `/42`) | — | CC BY 4.0 for those two layers |
| Christchurch City Council — regulatory layer | **Gap** | "DP Flood Hazard High" (the layer actually used in LIMs) not in the open-data catalog — lives only in the District Plan GIS viewer | — | Unconfirmed |
| Otago Regional Council | **Gap (live access failure)** | Three differently-named legacy services found (`FloodHazard_Otago2020`, `FloodHazard_Otago_2020`, `FloodHazard_Otago_2021`); live-tested `FloodHazard_Otago_2021` returned an ArcGIS server error today. A 2024 Hub dataset appears to be the current authoritative layer but its endpoint/licence could not be retrieved this session | — | Unconfirmed |

Key finding beyond the spec's own framing: fragmentation isn't just
differing file formats — **return-period conventions differ (AEP vs ARI,
even within the same council's different services)**, catalog completeness
varies, and service uptime itself is inconsistent (Otago's live failure
today). Flood ingestion must be built per-council, incrementally, exactly
as the spec's Phase 2 already assumes — and each council's convention needs
its own documented normalization rule before scoring against it.

## G. Coastal / elevation — LINZ Data Service

**Status: Confirmed, with one live example of the exact hard-coded-URL risk
the spec warns about**

- Licence: **CC BY 4.0 International**, confirmed. Required attribution
  text: *"Sourced from the LINZ Data Service and licensed for reuse under
  the CC BY 4.0 licence"* (or "Contains data sourced from..." for
  derived/compiled data).
- Access: API key required, created per data source via the LDS account
  (`data.linz.govt.nz/services/`, WFS/WCS/WMS/WMTS). This app already holds
  a LINZ API key for address data (`GeocodingService`/`AddressRepository`)
  — **that key's scope must be checked/extended** to cover DEM and
  coastline layers; do not assume the existing key already has access.
  Rate-limit specifics were not found this session — confirm before
  building a national ingestion loop.
- DEM: **1m LiDAR DEM/DSM** (~90% mainland coverage) and **8m
  contour-interpolated DEM** (full national coverage), distributed as
  Cloud-Optimised GeoTIFF, also mirrored on AWS Open Data
  (`registry.opendata.aws/nz-elevation`).
- **Coastline — live caveat**: the layer referenced during early searches,
  "NZ Coastline - Mean High Water" (layer 105085), is explicitly marked
  **(Deprecated)** on LDS. Its replacement layer ID was not identified this
  session. **This is the exact failure mode the spec warned about** —
  re-confirm the current coastline layer ID immediately before ingestion,
  don't reuse this number.

## H. Validation overlay — Natural Hazards Portal (NHC/EQC claims)

**Status: Gap (bulk access) — confirmed as per-property-only, as the spec
already assumed**

- `naturalhazardsportal.govt.nz` is strictly an interactive per-property
  map governed by its own Terms of Use. No API, export, or bulk-download
  function found (the about page loaded and made no mention of bulk
  access; the terms/privacy page 404'd this session).
- Claims start-year is inconsistently reported across sources — 1997 (spec
  and one page) vs. 1977 (another search snippet). Not resolved; flag as a
  minor unverified detail if this date is ever surfaced in-product.
- No public bulk/aggregate EQC-NHC claims dataset found on data.govt.nz or
  elsewhere. The only alternatives are an OIA request to NHC, or NHC's
  periodic "Performance Dashboard" PDF reports (aggregate counts/stats
  only, not structured/geospatial/property-level).
- **Confirms the spec's own framing**: this stays a manual, per-property
  validation reference, never a bulk ingestion source. No workaround exists
  short of an OIA request.

---

## Summary for Phase 1 planning

| Hazard | Ingestible today? |
|---|---|
| Active faults | Yes, pending a written commercial-use clarification from GNS/Earth Sciences NZ |
| Coastal / elevation (LINZ DEM) | Yes, pending API key scope confirmation and a live coastline-layer-ID re-check |
| Earthquake shaking (NSHM) | No — point-query tool only, no bulk grid confirmed |
| Volcanic zones | No — no public GIS layer, only static reports |
| Landslide susceptibility | No — national model doesn't exist yet |
| Tsunami | Partial — per-region, several confirmed endpoints, licences vary and need per-region confirmation |
| Flood | Partial — per-council, confirmed fragmented in both format and return-period convention, several endpoints found, coverage is incremental by design (spec's Phase 2) |
| NHC/EQC claims (validation) | No — per-property tool only, no bulk export |

This materially changes Phase 1's "nationally available hazards" set from
the spec's optimistic framing: **only active faults and a DEM-derived
coastal/elevation proxy are confirmed ingestible today** without further
data-access negotiation. Seismic shaking, volcanic zones, and landslide
susceptibility should be treated as blocked/deferred, not scheduled, until
a bulk source is confirmed. Tsunami and flood remain viable but must be
built incrementally, per-region/per-council, exactly as the spec's phasing
already anticipated — this verification pass just confirms *how much* more
fragmented that will be than a first read of the spec suggests.
