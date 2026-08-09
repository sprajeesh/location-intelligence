#!/usr/bin/env bash
# Runs on the app VM as part of deploy-api (see .github/workflows/push.yml).
# Writes the .env file docker-compose needs from values passed in directly
# (sourced from GitHub Secrets over SSH) -- no cloud-provider secret store
# involved, so this is provider-agnostic: it works unchanged no matter which
# provider hosts the VM.
#
# Usage: fetch-secrets.sh <db_user> <db_password> [api_shared_secret] [env_file]
set -euo pipefail

DB_USER="${1:?db_user required}"
DB_PASSWORD="${2:?db_password required}"
API_SHARED_SECRET="${3:-}"
ENV_FILE="${4:-.env}"

# Hostnames below are docker-compose service names (api/postgis/redis/osrm
# all share the project's default network), not localhost -- this file is
# consumed by the containerized api service, unlike the host-network .env
# used for local dev (see AGENTS.md).
cat >"$ENV_FILE" <<EOF
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgis:5432/gis
OVERPASS_URL=https://overpass-api.de/api/interpreter
OSRM_URL=http://osrm:5000
REDIS_URL=redis://redis:6379
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10
API_SHARED_SECRET=${API_SHARED_SECRET}
EOF
chmod 600 "$ENV_FILE"

echo "Wrote ${ENV_FILE}"
