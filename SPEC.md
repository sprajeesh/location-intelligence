# Location Intelligence — Consolidated Product + Engineering Specification (v2)

## Objective

Create a production-ready MVP called Location Intelligence.

Users enter an address and visualize nearby facilities within a configurable radius.

Target users:
- Property buyers
- Real estate agents
- Property investors
- Renters

Reference inspiration:
- Use OneMap Singapore only as inspiration.
- Do not copy branding or layout.
- Build a modern property intelligence experience.

---

# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- React Leaflet
- Leaflet
- OpenStreetMap

Rendering Strategy:
- Server Components for pages/layout
- Client Components for map interactions
- Use SSR selectively
- Avoid SSR for interactive map rendering

State:
- React Query → server state
- Zustand → UI state

Package manager:
- pnpm

---

## Backend

- Python
- FastAPI
- Pydantic
- httpx (async)

Package manager:
- uv

Formatting:
- Ruff

Testing:
- pytest

---

# Repository Structure

/apps
  /web
  /api

/packages
  /shared-types

/docs

docker-compose.yml

---

# Frontend Structure

src/
  components/
  containers/
  hooks/
  services/
  types/
  app/
  assets/

Principles:
- Components generic
- Business logic in containers/hooks
- Avoid prop drilling
- Unit tests colocated

---

# Backend Structure

app/
  api/
  services/
  repositories/
  schemas/
  clients/
  config/
  models/

Clients:
- NominatimClient
- OverpassClient
- LocationScoringService
- DistanceService

---

# Architecture

Browser
↓

Next.js (BFF)
↓

FastAPI
↓

OpenStreetMap Providers

Responsibilities:

Frontend:
- UI
- Address search
- Rendering
- Map interaction

Backend:
- Geocoding
- Data fetch
- Transformation
- Scoring
- Distance
- Caching

---

# Data Sources

## Nominatim

Address → coordinates

Autocomplete:
Top 5 suggestions

## Overpass

Fetch:
- Schools
- Universities
- Hospitals
- Clinics
- Pharmacies
- Bus stops
- Railway stations
- Airports
- Shopping centres
- Supermarkets
- Parks
- Libraries
- Police stations
- Fire stations

Rules:
- Parallel requests
- Deduplicate
- Merge responses

---

# User Features

## Address Search

- Autocomplete
- Select address
- Center map

Default:
Show closest:
- 3 railway stations
- 3 bus stops

---

## Radius

Default:
10 km

Options:
1
5
10
20
Custom

---

## Feature Filters

- Schools
- Hospitals
- Transport
- Shopping
- Parks
- Emergency

---

## Map Behaviour

Display:
- Main location marker
- Feature markers

Rules:
- Preserve zoom
- Fit bounds initially
- Cluster >50 markers
- Responsive
- Debounce movement
- Lazy-load markers

---

## Results Panel

Group:
- Schools
- Bus Stops
- Transport

Show:
- Name
- Distance
- Category

Click:
- Center map
- Feature details
- Navigation action

---

# Scoring

Education:
40%

Transport:
30%

Healthcare:
20%

Shopping:
10%

Normalize:
0–100

Output:
- Education Score
- Healthcare Score
- Transport Score
- Shopping Score
- Overall Score

---

# API

GET /health

GET /search/address?q=

GET /categories

POST /location/analyze

Request:

{
 "address":"",
 "radiusKm":10,
 "categories":[]
}

Response:

{
 "location":{
   "lat":0,
   "lon":0
 },

 "features":[
   {
     "id":"",
     "name":"",
     "category":"",
     "lat":0,
     "lon":0,
     "distanceKm":0
   }
 ],

 "score":{
   "education":0,
   "healthcare":0,
   "transport":0,
   "shopping":0,
   "overall":0
 }
}

---

# Caching

Redis

Address cache:
30 days

Location query:
24 hours

---

# Performance

Address:
<1 sec

API:
<3 sec

Map:
<2 sec

Marker limit:
500

---

# Error Handling

Handle:
- Address not found
- No results
- API unavailable
- Rate limits

---

# Observability

- Structured logs
- Metrics
- Request IDs
- Health checks

---

# Accessibility

- Keyboard navigation
- ARIA labels
- Mobile first

---

# Environment

.env

API_URL
OVERPASS_URL
NOMINATIM_URL
CACHE_URL

---

# Testing

Frontend:
Jest
ESLint

Backend:
pytest
ruff

Rules:
- lint passes
- tests pass

---

# Deployment

Frontend:
Vercel

Backend:
Docker

Future:
AWS ECS Fargate

---

# SEO

For public reports:

Generate:
- title
- description
- OpenGraph
- JSON-LD
- canonical URLs

---

# Future

- Auth
- Preferences
- Property APIs
- Crime data
- Drive-time analysis

---

# Definition of Done

App can:

- Search address
- Show map
- Apply filters
- Show nearby features
- Calculate score
- Run in Docker
- Pass tests
- Setup in <10 minutes

