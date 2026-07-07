#!/usr/bin/env bash
# Runs on the OCI app VM as part of deploy-api (see .github/workflows/push.yml).
# Writes the .env file docker-compose needs, pulling the DB password out of
# OCI Vault via this instance's own identity (instance principal -- granted
# read access by infra/oci/vault.tf's dynamic group + policy) rather than any
# credential stored on the box or in GitHub Secrets. api_shared_secret is a
# plain pass-through (not Vault-backed) from the API_SHARED_SECRET GitHub
# secret -- see app/api/deps.py for what it guards and why it's optional.
#
# Usage: fetch-secrets.sh <db_user> <db_password_secret_id> [api_shared_secret] [env_file]
set -euo pipefail

DB_USER="${1:?db_user required}"
DB_PASSWORD_SECRET_ID="${2:?db_password_secret_id required}"
API_SHARED_SECRET="${3:-}"
ENV_FILE="${4:-.env}"

# Retries: right after `terraform apply` creates the dynamic group + policy
# granting this instance read access, OCI's IAM propagation can lag a few
# seconds behind -- and deploy-api SSHes in immediately after. Not a real
# error, so retry briefly rather than failing the whole deploy on a race.
DB_PASSWORD=""
for attempt in 1 2 3 4 5; do
  if DB_PASSWORD=$(
    oci secrets secret-bundle get \
      --secret-id "$DB_PASSWORD_SECRET_ID" \
      --auth instance_principal \
      --query 'data."secret-bundle-content".content' \
      --raw-output |
      base64 -d
  ); then
    break
  fi
  if [ "$attempt" -eq 5 ]; then
    echo "Failed to fetch DB password from Vault after 5 attempts" >&2
    exit 1
  fi
  echo "Vault fetch attempt ${attempt} failed (likely IAM propagation lag), retrying in 10s..." >&2
  sleep 10
done

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

echo "Wrote ${ENV_FILE} (DB password fetched from OCI Vault, not stored in git or GitHub Secrets)"
