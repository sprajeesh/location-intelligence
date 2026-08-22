#!/usr/bin/env bash
set -euo pipefail

echo "==> Running database migrations (alembic upgrade head)"
alembic upgrade head

echo "==> Starting application..."
exec "$@"
