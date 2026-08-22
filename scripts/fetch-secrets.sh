#!/usr/bin/env bash
# TODO(security): DB_PASSWORD was exposed in cleartext on 2026-08-22 (a
# configparser bug in apps/api/alembic/env.py -- fixed -- echoed the full
# percent-encoded DATABASE_URL into `docker compose logs api`, which then
# got pasted into a debugging chat). Rotate DB_PASSWORD (update this
# GitHub repo's `production` environment secret AND the actual Postgres
# role's password on the VM) and redeploy. Consider rotating
# API_SHARED_SECRET/REDIS_PASSWORD too out of caution, though only
# DB_PASSWORD was confirmed exposed this time.
#
# Runs on the app VM as part of deploy-api (see .github/workflows/push.yml).
# Writes the .env file docker-compose needs from values passed in directly
# (sourced from GitHub Secrets over SSH) -- no cloud-provider secret store
# involved, so this is provider-agnostic: it works unchanged no matter which
# provider hosts the VM.
#
# Secrets arrive base64-encoded, one per line, on stdin -- in order: db_user,
# db_password, api_shared_secret, redis_password -- rather than as CLI args.
# The deploy step assembles this script's invocation inside a heredoc that
# gets re-parsed by a shell on arrival; raw secret bytes sitting in that text
# could both break out of their quoting (injection) and show up in this
# process's argv (visible to any other user on the VM via `ps`). Base64 text
# has neither problem, and decoding happens only after it's safely inside a
# variable here.
#
# Usage: fetch-secrets.sh [env_file] [secrets_dir]
# (env_file defaults to .env, secrets_dir defaults to ./secrets)
set -euo pipefail

b64_decode() {
  base64 -d <<<"$1"
}

IFS= read -r DB_USER_B64
IFS= read -r DB_PASSWORD_B64
IFS= read -r API_SHARED_SECRET_B64
IFS= read -r REDIS_PASSWORD_B64

DB_USER="$(b64_decode "$DB_USER_B64")"
DB_PASSWORD="$(b64_decode "$DB_PASSWORD_B64")"
API_SHARED_SECRET="$(b64_decode "$API_SHARED_SECRET_B64")"
REDIS_PASSWORD="$(b64_decode "$REDIS_PASSWORD_B64")"
ENV_FILE="${1:-.env}"
SECRETS_DIR="${2:-secrets}"

: "${DB_USER:?db_user required}"
: "${DB_PASSWORD:?db_password required}"
: "${REDIS_PASSWORD:?redis_password required}"
: "${API_SHARED_SECRET:?api_shared_secret required}"

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

# Bare (unquoted) KEY=value lines can't represent an embedded newline at
# all, and comment/quote handling for inline "#"/"\"/'"' varies across
# Compose versions -- double-quoting is the one form verified (against this
# Compose version's actual env_file parser) to round-trip arbitrary secret
# bytes intact, using the escapes it supports inside double quotes: \\, \",
# and \n for a real newline. Applied after compose_escape, so a value's `$`
# survives as the literal "$$" compose_escape produced (dotenv_quote doesn't
# touch "$" at all, so the two compose cleanly regardless of order here).
dotenv_quote() {
  local LC_ALL=C string="$1" i c out=''
  for (( i = 0; i < ${#string}; i++ )); do
    c="${string:$i:1}"
    case "$c" in
      '\') out+='\\' ;;
      '"') out+='\"' ;;
      $'\n') out+='\n' ;;
      *) out+="$c" ;;
    esac
  done
  printf '"%s"' "$out"
}

# Redis's own config-file parser (sdssplitargs) has its own quoting dialect
# for single-quoted values: the only special sequence is \' (an escaped
# literal quote); every other byte, including a bare backslash, passes
# through unchanged. Escaping just the quote character here is therefore
# sufficient -- and necessary, since an un-escaped "'" (or, if this weren't
# escaped at all, a raw '"' as hit during testing) breaks the config line.
redis_conf_escape() {
  local LC_ALL=C string="$1" i c out=''
  for (( i = 0; i < ${#string}; i++ )); do
    c="${string:$i:1}"
    case "$c" in
      "'") out+="\\'" ;;
      *) out+="$c" ;;
    esac
  done
  printf '%s' "$out"
}

# Hostnames below are docker-compose service names (api/postgis/redis/osrm
# all share the project's default network), not localhost -- this file is
# consumed by the containerized api service, unlike the host-network .env
# used for local dev (see AGENTS.md).
cat >"$ENV_FILE" <<EOF
DB_USER=$(dotenv_quote "$(compose_escape "$DB_USER")")
DB_PASSWORD=$(dotenv_quote "$(compose_escape "$DB_PASSWORD")")
ENVIRONMENT=production
API_HOST=0.0.0.0
API_PORT=8000
DATABASE_URL=postgresql://${DB_USER_URI}:${DB_PASSWORD_URI}@postgis:5432/gis
OVERPASS_URL=https://overpass-api.de/api/interpreter
OSRM_URL=http://osrm:5000
REDIS_PASSWORD=$(dotenv_quote "$(compose_escape "$REDIS_PASSWORD")")
REDIS_URL=redis://:${REDIS_PASSWORD_URI}@redis:6379
SCORING_ALPHA=0.6
SCORING_BETA=0.4
SCORING_DENSITY_FACTOR=10
API_SHARED_SECRET=$(dotenv_quote "$(compose_escape "$API_SHARED_SECRET")")
EOF
chmod 600 "$ENV_FILE"

# Two Compose file-secrets for docker-compose.prod.yml's redis service, so
# the password never appears in redis-server's or redis-cli's own process
# arguments (visible host-wide via `docker top`/`ps`, unlike a /run/secrets
# mount which only that container can read):
#  - redis_password: raw value, for the healthcheck's REDISCLI_AUTH
#  - redis_requirepass.conf: a ready-to-use "requirepass '...'" config line,
#    pre-escaped here (see redis_conf_escape above) so redis-server can
#    --include it directly with no further string handling in the container
#
# Compose bind-mounts these files as-is, preserving host ownership/mode, into
# a container that reads them as its own non-root user (a different uid than
# whatever runs this script) -- so 600 would be unreadable there. The
# directory being 700 (owner-only traversal) is what actually keeps other
# host users out; 644 on the files just satisfies the container's uid.
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"
printf '%s' "$REDIS_PASSWORD" >"$SECRETS_DIR/redis_password"
chmod 644 "$SECRETS_DIR/redis_password"

printf "requirepass '%s'\n" "$(redis_conf_escape "$REDIS_PASSWORD")" >"$SECRETS_DIR/redis_requirepass.conf"
chmod 644 "$SECRETS_DIR/redis_requirepass.conf"

echo "Wrote ${ENV_FILE}, ${SECRETS_DIR}/redis_password, and ${SECRETS_DIR}/redis_requirepass.conf"
