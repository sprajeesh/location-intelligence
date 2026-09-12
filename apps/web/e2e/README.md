# E2E Tests

This directory contains end-to-end (E2E) tests for the Location Intelligence web application using Playwright.

## Quick Start

```bash
# Run all E2E tests
pnpm test:e2e

# Run smoke tests only (fast)
pnpm test:e2e:smoke

# Run with interactive UI
pnpm test:e2e:ui

# Debug a test
pnpm test:e2e:debug
```

## Test Files

- **`location-analysis.spec.ts`** — Core workflow: search address → analyze → view results
- **`navigation-and-routing.spec.ts`** — Navigation, locale switching, page routing
- **`production-smoke.spec.ts`** — Safe tests for production environments
- **`accessibility.spec.ts`** — Keyboard navigation and accessibility features
- **`fixtures.ts`** — Shared helpers, selectors, and test utilities

## Test Tags

- `@smoke` — Minimal set of critical tests (fast, ~5–10 tests)
- `@critical` — Important business workflows
- `@regression` — Extended coverage including edge cases
- `@production-smoke` — Safe for production (no data changes)

Run tests by tag:

```bash
pnpm test:e2e:smoke           # Smoke tests
pnpm test:e2e:critical        # Critical tests
pnpm test:e2e:regression      # Full suite (all tags)
pnpm test:e2e:production-smoke # Production-safe tests
```

## Prerequisites

Start services before running tests:

```bash
pnpm services:up    # API, PostGIS, Redis, OSRM
pnpm dev:web        # Next.js dev server (auto-started in most modes)
```

## For More Information

See `../E2E_TESTING.md` for detailed documentation on running, writing, and maintaining tests.
