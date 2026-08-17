#!/usr/bin/env bash
#
# setup-hazard-demo.sh — Populate the Phase-0 scaffold's demo hazard data
#
# Usage:
#   ./scripts/setup-hazard-demo.sh
#
# Prerequisites:
#   - `uv run alembic upgrade head` already applied (creates the hazard_*
#     tables and seeds hazard_types with "demo_hazard")
#   - PostGIS reachable at DATABASE_URL (see apps/api/.env)
#
# Idempotent: re-running upserts the same deterministic cells/scores rather
# than duplicating rows.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"

echo "╔══════════════════════════════════════════╗"
echo "║   Hazard Demo Data — Phase-0 Scaffold    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "⚙ Generating demo hazard cells over the Auckland bbox..."

cd "$API_DIR"
uv run python -m pipelines.hazard.generate_dummy_hazard

echo ""
echo "══════════════════════════════════════════"
echo "  ✓ Demo hazard data loaded!"
echo "══════════════════════════════════════════"
