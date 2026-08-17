#!/usr/bin/env bash
#
# setup-hazard-coastal-proxy.sh — Populate the real "coastal_elevation_proxy"
# hazard (Phase-1 real ingestion)
#
# Usage:
#   ./scripts/setup-hazard-coastal-proxy.sh
#
# Prerequisites:
#   - `uv run alembic upgrade head` already applied (creates migration 0004,
#     seeding hazard_types with "coastal_elevation_proxy")
#   - PostGIS reachable at DATABASE_URL (see apps/api/.env)
#   - LINZ_API_KEY set in apps/api/.env (needed to query the coastline WFS
#     layer -- see apps/api/docs/HAZARD_SOURCES.md section G for how to get
#     one and confirm its scope covers WFS)
#   - Restart the API afterwards to pick up the new hazard_types row
#     (HazardScoringConfig caches hazard_types at startup)
#
# Idempotent: re-running upserts the same cells/scores rather than
# duplicating rows.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Coastal/Elevation Hazard — Phase-1 Real Ingest  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "⚙ Fetching LINZ coastline + elevation data and scoring cells..."

cd "$API_DIR"
uv run python -m pipelines.hazard.coastal_elevation_proxy

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ Coastal/elevation hazard data loaded!"
echo "  → Restart the API to pick up the new hazard type."
echo "══════════════════════════════════════════════════"
