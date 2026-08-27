# Location Intelligence — Next.js Frontend

Production-ready Next.js 16.2.9 frontend for location-based property analysis in New Zealand.

**Framework:** Next.js 16.2.9 (Active LTS) + React 19  
**Language:** TypeScript  
**Package Manager:** pnpm  
**Testing:** Jest  
**Linting:** ESLint

For the full product overview, see the [root README](../README.md).

---

## Quick Start

### Setup

```bash
# Install dependencies
pnpm install

# Create env file for local development
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
pnpm dev
```

Frontend runs on http://localhost:3000

### Connect to Backend

Ensure the FastAPI backend is running on `http://localhost:8000` (see [apps/api/README.md](../api/README.md#quick-start)).

---

## Tech Stack

| Layer    | Technology                       | Purpose                      |
| -------- | -------------------------------- | ---------------------------- |
| **App**  | Next.js 16 + App Router          | Pages, layouts, SSR          |
| **UI**   | React 19 + TypeScript            | Components, typed state      |
| **Map**  | React Leaflet + OpenStreetMap    | Interactive facility map     |
| **State** | Zustand + React Query            | Client-side + server state  |
| **i18n** | next-intl                        | English/Māori routing        |
| **Style** | CSS Modules + Tailwind (planned) | Responsive, dark-aware       |
| **Test** | Jest                             | Unit & integration tests     |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router (pages + layouts)
│   ├── [locale]/          # URL-based i18n routing (/en, /mi)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── AddressSearch/     # Address autocomplete
│   ├── Map/               # Leaflet map with markers
│   ├── ResultsPanel/      # Scores + facility list
│   ├── ThemeToggle/       # Dark mode switch
│   └── ...
├── containers/            # Business-logic wrappers
│   ├── SearchContainer/   # Orchestrates search + analyze
│   └── ...
├── hooks/                 # Custom React hooks
│   ├── useSearch/         # Address search state
│   ├── useAnalyze/        # Location analysis state
│   └── ...
├── services/              # API client
│   └── api.ts             # HTTP calls to backend (via BFF proxy)
├── store/                 # Zustand state
│   └── searchStore.ts     # Global search + result state
├── types/                 # TypeScript types
│   └── api.ts             # Generated from backend schema (future)
└── i18n/                  # next-intl config + translations
    ├── config.ts          # Locale config
    ├── en.json            # English strings
    └── mi.json            # Māori strings (placeholder)
```

---

## Features

### 🔍 Address Search

Autocomplete against LINZ NZ addresses with debouncing and Redis caching. Top 5 suggestions update as you type.

### 🗺️ Interactive Map

Leaflet-based OpenStreetMap visualization:
- Category-colored markers (schools in orange, bus stops in teal)
- Marker clustering (groups > 50 markers)
- Max 500 markers per search to prevent browser slowdown
- Click markers for facility details (name, distance, category)

### 📊 Results Panel

Displays location score breakdown:
- Overall score (0–100)
- Per-category scores (Education, Transport, Healthcare, Shopping)
- Coverage indicator ("2/4 categories found")
- Warnings (e.g., Haversine fallback if OSRM unavailable)

### 🌍 Internationalization

- **English** (en) — fully translated
- **Māori** (mi) — placeholder structure for future professional translation
- URL-based routing: `/en/...`, `/mi/...`
- Language switcher in header

### 🎨 Dark Theme

- Glassmorphism design: semi-transparent panels with blur effects
- Subtle micro-animations
- Responsive layout:
  - **Desktop:** Right-side panel with search + results
  - **Mobile:** Bottom sheet with swipe-to-close

---

## Environment Variables

Create `.env.local`:

```env
# Backend API URL (proxy target)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> ⚠️ Never commit `.env.local` — only `.env.example` (with placeholders) is committed.

---

## Development Workflow

### 1. Run development server

```bash
pnpm dev
```

Open http://localhost:3000

### 2. BFF Proxy Routes

Next.js API routes (in `src/app/api/*`) proxy to FastAPI backend. This keeps CORS simple and allows middleware hooks.

**Example:** `GET http://localhost:3000/api/search/address?q=Cuba` → `GET http://localhost:8000/search/address?q=Cuba`

### 3. Hot Reload

Changes to components, hooks, and pages auto-refresh (Fast Refresh).

---

## Testing

### Run Tests

```bash
pnpm test                  # Run all tests
pnpm test --watch        # Watch mode
pnpm test --coverage     # Coverage report
```

### Linting

```bash
pnpm lint                # Run ESLint
pnpm lint --fix          # Auto-fix
```

---

## Performance Targets

| Metric          | Target  | Notes                              |
| --------------- | ------- | ---------------------------------- |
| Map render      | < 2 sec | Client-side only                   |
| Max markers     | 500     | Clustering enabled for > 50        |
| Address search  | < 1 sec | Debounced (300ms) + Redis cached   |
| Full analysis   | < 3 sec | Parallel backend queries           |

---

## Deployment

### Build

```bash
pnpm build
```

Generates `.next/` optimized bundle.

### Production Runtime

Cloudflare Workers via OpenNext:

```bash
pnpm run build:cf         # Build for Cloudflare
wrangler deploy           # Deploy to Cloudflare
```

Triggered by `release:` commits on `main`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full release process.

### Environment in Production

Set `NEXT_PUBLIC_API_URL` to your production backend URL before building.

---

## Troubleshooting

### Map not rendering

- Ensure `ssr: false` on MapView dynamic import (Leaflet requires client-side rendering)
- Check browser console for Leaflet CSS import errors
- Verify `NEXT_PUBLIC_API_URL` env var is set to a valid backend URL

### "Cannot find module" errors

```bash
pnpm install    # Re-install dependencies
rm -rf .next    # Clear Next.js cache
pnpm dev        # Restart dev server
```

### "API_URL is not defined" error

Add `.env.local` to `apps/web/` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### CORS errors in console

The backend (FastAPI) must be running and CORS-enabled for `localhost:3000`. Check:

```bash
curl http://localhost:8000/health    # Backend must be running
```

If CORS still fails, verify `CORS_ORIGINS` in the FastAPI app includes `localhost:3000`.

---

## Component Documentation

See [TOAST_EXAMPLE_USAGE.md](TOAST_EXAMPLE_USAGE.md) for component-specific usage examples and API.

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for branching conventions, commit guidelines, and the release process.

Also:
- Keep components pure (no HTTP calls in component render logic)
- Isolate API calls in `services/api.ts`
- Use Zustand store for global state (search query, results, UI state)
- Write tests for critical paths (search, scoring, map interaction)
- Run `pnpm lint` before pushing

---

## Future Enhancements

- [ ] Saved location bookmarks
- [ ] Share location reports
- [ ] Dark mode toggle (currently always-on glassmorphism)
- [ ] Advanced filtering (category weights, date range)
- [ ] Professional Māori translations
- [ ] Navigation links (Google Maps directions)
