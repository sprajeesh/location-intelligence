#!/usr/bin/env bash
#
# diagnose.sh — Check if all services are running and responsive
#
set -euo pipefail

echo "╔════════════════════════════════════════════════╗"
echo "║  Location Intelligence — Service Diagnostics  ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

ERRORS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
  local name=$1
  local url=$2
  local timeout=${3:-3}

  echo -n "Checking $name... "

  if curl -s -m "$timeout" "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
  else
    echo -e "${RED}✗ FAILED${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

# Check Docker services
echo "─── Docker Services ───"
check_service "Redis" "http://localhost:6379"
check_service "OSRM (driving)" "http://localhost:5000/health" 3
check_service "OSRM (walking)" "http://localhost:5001/health" 3
check_service "OSRM (cycling)" "http://localhost:5002/health" 3

echo -n "Checking PostGIS... "
if pg_isready -h localhost -p 5432 -U "${DB_USER:-gisuser}" -d gis > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
else
  echo -e "${RED}✗ FAILED${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "─── Backend Service ───"
check_service "FastAPI" "http://localhost:8000/health"

echo ""
echo "─── Ports in Use ───"
lsof -i :6379 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 6379 (Redis)" || echo -e "  ${RED}✗${NC} 6379 (Redis)"
lsof -i :5432 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 5432 (PostGIS)" || echo -e "  ${RED}✗${NC} 5432 (PostGIS)"
lsof -i :5000 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 5000 (OSRM driving)" || echo -e "  ${RED}✗${NC} 5000 (OSRM driving)"
lsof -i :5001 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 5001 (OSRM walking)" || echo -e "  ${RED}✗${NC} 5001 (OSRM walking)"
lsof -i :5002 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 5002 (OSRM cycling)" || echo -e "  ${RED}✗${NC} 5002 (OSRM cycling)"
lsof -i :8000 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 8000 (FastAPI)" || echo -e "  ${RED}✗${NC} 8000 (FastAPI)"
lsof -i :3000 > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} 3000 (Next.js)" || echo -e "  ${YELLOW}○${NC} 3000 (Next.js - may not be running yet)"

echo ""
echo "─── OSRM Data Files ───"
for profile_file in \
  "new-zealand-latest.osrm:driving" \
  "new-zealand-latest-foot.osrm:walking" \
  "new-zealand-latest-bicycle.osrm:cycling"; do
  IFS=":" read -r file mode <<< "$profile_file"
  if [ -f "./osrm-data/$file" ]; then
    echo -e "  ${GREEN}✓${NC} OSRM extract file exists ($mode)"
  else
    echo -e "  ${RED}✗${NC} OSRM extract missing ($mode) - run ./scripts/setup-osrm.sh"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "─── Environment Files ───"
if [ -f "apps/api/.env" ]; then
  echo -e "  ${GREEN}✓${NC} apps/api/.env exists"
else
  echo -e "  ${YELLOW}○${NC} apps/api/.env missing (copying from .env.example)"
  cp .env.example apps/api/.env
fi

if [ -f "apps/web/.env.local" ]; then
  echo -e "  ${GREEN}✓${NC} apps/web/.env.local exists"
else
  echo -e "  ${YELLOW}○${NC} apps/web/.env.local missing (creating)"
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > apps/web/.env.local
fi

echo ""
echo "════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo -e "  ${GREEN}✓ All systems operational!${NC}"
  echo "  Frontend: http://localhost:3000"
  echo "  Backend:  http://localhost:8000"
else
  echo -e "  ${RED}✗ $ERRORS error(s) found${NC}"
  echo ""
  echo "  Quick fixes:"
  echo "  1. Run: ./scripts/setup-osrm.sh"
  echo "  2. Run: docker compose up -d"
  echo "  3. Run: docker compose ps  (verify all healthy)"
  echo "  4. Backend: cd apps/api && uv run uvicorn app.main:app --reload"
  echo "  5. Frontend: cd apps/web && pnpm dev"
fi
echo "════════════════════════════════════════════════"
