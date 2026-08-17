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
- **Update (2026-08-17): checked and ruled out — no LINZ-hosted alternative
  exists.** Investigated whether LINZ Data Service separately mirrors
  NZAFD under its own (typically less restrictive) CC BY 4.0 terms, which
  would have sidestepped GNS's licence entirely. Confirmed no: an LDS
  catalogue API query (`data.linz.govt.nz/services/api/v1/data/?q=fault`)
  returned zero matching layers, and LDS's ~3,080 layers are exclusively
  topographic/cadastral/hydrographic/geodetic/imagery data — no
  geology/hazard category at all. `data.govt.nz`'s NZAFD listings are just
  a federated index of GNS's own catalogue entry, not a separate LINZ
  copy — every listing still names GNS as publisher with the same "check
  with source agency" licence. **The GNS licence is the only path; there
  is no workaround.** The written-clarification email above is required
  before any fault ingestion.

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
- Access: the *vector/service* layers (coastline, and anything via
  WFS/WCS/WMS/WMTS) still require an API key created per data source via
  the LDS account (`data.linz.govt.nz/services/`). **Correction
  (2026-08-17): this app does NOT already hold a LINZ API key** — that
  claim (originally written here) is inaccurate. `GeocodingService`/
  `AddressRepository` never call a live LINZ API; NZ address data is a
  one-time bulk CSV import baked into the `postgis` Docker image at build
  time (see `docker/Dockerfile.postgis`, `docker/sql/02_load.sql`), and no
  `LINZ_API_KEY`-style setting existed anywhere in the codebase before the
  coastal_elevation_proxy pipeline added one. A separate personal LINZ API
  key (created directly by the project owner via their LDS account) is
  what's actually used — see `apps/api/app/config/settings.py`'s
  `linz_api_key` field and `.env.example`. Rate-limit specifics were not
  found this session — confirm before building a national ingestion loop.
  - **Update (2026-08-17): LDS/Koordinates key scoping researched — likely
    fine, not yet live-tested.** LDS runs on the Koordinates platform;
    its API keys are scoped **by service/protocol type (WFS, WMS, WMTS,
    Documents API, etc.), not by individual dataset or layer** — per
    Koordinates' own docs, "API keys can have optional scopes... these
    work in addition to dataset and service permissions... but do not
    override these." Public/CC BY layers (which the coastline layers are)
    have no per-layer allow-list — any valid key from an account with
    normal access can reach them. So the existing address-data key very
    likely already works for the coastline layers too, **provided its
    scope includes WFS** (the one dimension that can actually restrict
    it, if the key was created with a manually limited scope rather than
    the broad "Data access only" option). **Live-test before assuming**:
    `curl "https://data.linz.govt.nz/services;key=YOUR_KEY/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-124388&count=1&outputFormat=json"`
    — real GeoJSON back means it works; an XML error mentioning
    scope/unauthorized means the key's scope needs WFS added in the LDS
    account (Account → API keys → edit permitted services).
- DEM: **1m LiDAR DEM/DSM** (~90% mainland coverage) and **8m
  contour-interpolated DEM** (full national coverage), Cloud-Optimised
  GeoTIFF.
  - **Update (2026-08-17), status: Confirmed, no API key needed for DEM**:
    live-tested (plain unauthenticated `curl`, no AWS credentials
    configured) against LINZ's own public bucket `s3://nz-elevation`
    (`ap-southeast-2`, per `registry.opendata.aws/nz-elevation`) — this is
    LINZ's own official bucket, not a third-party mirror, maintained via
    `github.com/linz/elevation`. Anonymous `GET`/`HEAD` against
    `https://nz-elevation.s3.ap-southeast-2.amazonaws.com/catalog.json`
    both returned `200 OK` with no auth headers sent, returning a real
    STAC 1.0.0 catalog with `child` links down to per-region/survey
    Collections (e.g. `auckland/auckland-north_2016-2018/dem_1m/2193/collection.json`).
    Licence CC-BY-4.0 confirmed in the STAC metadata itself. LINZ's own
    description: *"This public S3 bucket has been made available to
    enable bulk access and cloud-based data processing."* **This
    completely removes the LINZ API key question for DEM ingestion** —
    only the coastline vector layer below still needs the account-side
    key-scope check.
- **Coastline — CONFIRMED, status: Ingestible today.** The layer
  referenced during early searches, "NZ Coastline - Mean High Water"
  (layer 105085), is explicitly marked **(Deprecated)**, scheduled for
  removal 31 July 2026 — its own metadata states it "will be replaced by
  a more accurate dataset ... through the Coastal Mapping project." A
  progression was found: 105085 → pilot layer 121390 (also now deprecated)
  → the current pair, both last updated May 2026:
  - **Layer 124388 "NZ Coastline - Mean High Water Springs"** (line) —
    licence confirmed via LDS's JSON API (`/services/api/v1/layers/124388/`)
    as **CC BY-NC 4.0 (NonCommercial)**. **Do not use** — this repo's use
    may become commercial later (unconfirmed either way), so an NC-only
    licence is a hard no regardless of current status.
  - **Layer 124391 "NZ Coastline - Mean High Water Springs Polygon"**
    (multipolygon, 12,499 features, EPSG:2193) — licence confirmed via the
    same API as **plain CC BY 4.0**, no restriction. **Use this one.**
    Exportable as Shapefile/GeoPackage/CSV/KML/etc., also via WFS/ArcGIS
    Online/OGC services. A polygon works fine for a coastal-proximity
    proxy (distance to the polygon boundary via `ST_Distance`/`ST_Boundary`
    in PostGIS) — no functional need for the line variant.
  - **API key confirmed working**: live-tested by the project owner via
    `curl "https://data.linz.govt.nz/services;key=REAL_KEY/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-124388&count=1&outputFormat=json"`
    — returned real GeoJSON. Confirms their personal LINZ API key's scope
    already includes WFS, consistent with the Koordinates
    scope-by-protocol-not-by-layer model documented above. The same key
    works for layer 124391.
  - **Two different layers of the same coastline carrying two different
    licences (one NC-restricted, one not) is exactly the kind of trap the
    spec warns about** — always check the specific layer ID's own licence
    via the API, never assume a sibling/renamed layer inherits the same
    terms.

**Update (2026-08-17): INGESTED, not just verified.** Both halves
(elevation + layer 124391) are now populated via
`pipelines/hazard/coastal_elevation_proxy.py` (migration `0004` seeds the
`coastal_elevation_proxy` hazard type; run via
`scripts/setup-hazard-coastal-proxy.sh` — see README.md's "Coastal/Elevation
Hazard Data" section). This is the first real (non-fabricated) hazard type
in the running app.

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
| Coastal / elevation (LINZ DEM) | **Ingested.** DEM: LINZ's public `s3://nz-elevation` bucket, no API key needed. Coastline: layer 124391 (polygon, CC BY 4.0), personal LINZ API key confirmed working via WFS. Sibling layer 124388 (line) is CC BY-NC 4.0 — avoided. See `pipelines/hazard/coastal_elevation_proxy.py`. |
| Earthquake shaking (NSHM) | No — point-query tool only, no bulk grid confirmed |
| Volcanic zones | No — no public GIS layer, only static reports |
| Landslide susceptibility | No — national model doesn't exist yet |
| Tsunami | Partial — per-region, several confirmed endpoints, licences vary and need per-region confirmation |
| Flood | Partial — per-council, confirmed fragmented in both format and return-period convention, several endpoints found, coverage is incremental by design (spec's Phase 2) |
| NHC/EQC claims (validation) | No — per-property tool only, no bulk export |

This materially changes Phase 1's "nationally available hazards" set from
the spec's optimistic framing. **Update (2026-08-17): the DEM-derived
coastal/elevation proxy is now fully confirmed and unblocked** (DEM via
LINZ's public `s3://nz-elevation` bucket, no key needed; coastline via
layer 124391, CC BY 4.0, existing API key confirmed working) — this can
start ingestion immediately. **Active faults remains blocked** on written
commercial-use clarification from GNS/Earth Sciences NZ, confirmed to have
no workaround (LINZ does not separately mirror NZAFD). Seismic shaking,
volcanic zones, and landslide susceptibility should be treated as
blocked/deferred, not scheduled, until a bulk source is confirmed. Tsunami
and flood remain viable but must be built incrementally, per-region/
per-council, exactly as the spec's phasing already anticipated — this
verification pass just confirms *how much* more fragmented that will be
than a first read of the spec suggests.
