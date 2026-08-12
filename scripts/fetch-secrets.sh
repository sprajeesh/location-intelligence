#!/usr/bin/env bash
# Runs on the app VM as part of deploy-api (see .github/workflows/push.yml).
# Writes the .env file docker-compose needs from values passed in directly
# (sourced from GitHub Secrets over SSH) -- no cloud-provider secret store
# involved, so this is provider-agnostic: it works unchanged no matter which
# provider hosts the VM.
#
# Usage: fetch-secrets.sh <db_user> <db_password> [api_shared_secret] <redis_password> [env_file]
set -euo pipefail

DB_USER="${1:?db_user required}"
DB_PASSWORD="${2:?db_password required}"
API_SHARED_SECRET="${3:-}"
REDIS_PASSWORD="${4:?redis_password required}"
ENV_FILE="${5:-.env}"

# Compose re-scans values it substitutes into its own ${VAR} interpolation
# (e.g. DB_USER/DB_PASSWORD as build args in docker-compose.yml) -- a literal
# "$" in a secret would otherwise be misread as the start of another
# variable reference. Compose's own convention for a literal "$" is "$$".
compose_escape() {
  local v="$1"
  printf '%s' "${v//\$/\$\$}"
}

# Percent-encode for embedding in the DATABASE_URL/REDIS_URL URIs
# specifically -- ":", "/", "@", etc. in a raw username/password would
# otherwise be parsed as URI delimiters instead of literal credential
# characters. Only applied at this boundary; DB_USER/DB_PASSWORD/
# REDIS_PASSWORD stay raw (just Compose-escaped) everywhere else.
url_encode() {
  local LC_ALL=C string="$1" i c
  for (( i = 0; i < ${#string}; i++ )); do
    c="${string:$i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) printf '%s' "$c" ;;
      *) printf '%%%02X' "'$c" ;;
    esac
  done
}

DB_USER_URI="$(url_encode "$DB_USER")"
DB_PASSWORD_URI="$(url_encode "$DB_PASSWORD")"
REDIS_PASSWORD_URI="$(url_encode "$REDIS_PASSWORD")"

# Hostnames below are docker-compose service names (api/postgis/redis/osrm
# all share the project's default network), not localhost -- this file is
# consumed by the containerized api service, unlike the host-network .env
# used for local dev (see AGENTS.md).
cat >"$ENV_FILE" <<EOF
DB_USER=$(compose_escape "$DB_USER")
DB_PASSWORD=$(compose_escape "$DB_PASSWORD")
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://${DB_USER_URI}:${DB_PASSWORD_URI}@postgis:5432/gis
OVERPASS_URL=https://overpass-api.de/api/interpreter
OSRM_URL=http://osrm:5000
REDIS_PASSWORD=$(compose_escape "$REDIS_PASSWORD")
REDIS_URL=redis://:${REDIS_PASSWORD_URI}@redis:6379
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10
API_SHARED_SECRET=$(compose_escape "$API_SHARED_SECRET")
EOF
chmod 600 "$ENV_FILE"

echo "Wrote ${ENV_FILE}"
