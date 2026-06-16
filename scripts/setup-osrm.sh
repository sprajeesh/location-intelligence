#!/usr/bin/env bash
#
# setup-osrm.sh — Download and prepare NZ road data for OSRM
#
# Usage:
#   ./scripts/setup-osrm.sh
#
# Prerequisites:
#   - Docker must be running
#   - ~500MB free disk space
#
set -euo pipefail

DATA_DIR="$(pwd)/osrm-data"
GEOFABRIK_URL="https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf"
PBF_FILE="$DATA_DIR/new-zealand-latest.osm.pbf"
OSRM_IMAGE="osrm/osrm-backend"

echo "╔══════════════════════════════════════════╗"
echo "║   OSRM Setup — New Zealand Road Data     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Create data directory
mkdir -p "$DATA_DIR"

# Step 1: Download NZ OSM data
if [ -f "$PBF_FILE" ]; then
  echo "✓ NZ PBF file already exists, skipping download."
else
  echo "↓ Downloading NZ OSM data from Geofabrik..."
  curl -L -o "$PBF_FILE" "$GEOFABRIK_URL"
  echo "✓ Download complete."
fi

# Step 2: Extract
if [ -f "$DATA_DIR/new-zealand-latest.osrm" ]; then
  echo "✓ OSRM extract already exists, skipping."
else
  echo "⚙ Extracting road network (this may take a few minutes)..."
  docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-extract -p /opt/car.lua /data/new-zealand-latest.osm.pbf
  echo "✓ Extraction complete."
fi

# Step 3: Partition
if [ -f "$DATA_DIR/new-zealand-latest.osrm.partition" ]; then
  echo "✓ OSRM partition already exists, skipping."
else
  echo "⚙ Partitioning..."
  docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-partition /data/new-zealand-latest.osrm
  echo "✓ Partition complete."
fi

# Step 4: Customize
if [ -f "$DATA_DIR/new-zealand-latest.osrm.cell_metrics" ]; then
  echo "✓ OSRM customization already exists, skipping."
else
  echo "⚙ Customizing..."
  docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
    osrm-customize /data/new-zealand-latest.osrm
  echo "✓ Customization complete."
fi

echo ""
echo "══════════════════════════════════════════"
echo "  ✓ OSRM data ready!"
echo "  Run 'docker compose up osrm' to start the service."
echo "══════════════════════════════════════════"
