#!/usr/bin/env bash
#
# setup-osrm.sh — Download and prepare NZ road data for OSRM
#
# Usage:
#   ./scripts/setup-osrm.sh
#
# Prerequisites:
#   - Docker must be running
#   - ~1.5GB free disk space (car, foot, and bicycle profiles are each
#     extracted/partitioned/customized separately -- see docker-compose.yml)
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
MIN_PBF_SIZE=$((100 * 1024 * 1024))  # 100MB minimum — real file is ~380MB
if [ -f "$PBF_FILE" ] && [ "$(stat -c%s "$PBF_FILE" 2>/dev/null || stat -f%z "$PBF_FILE" 2>/dev/null)" -ge "$MIN_PBF_SIZE" ]; then
  echo "✓ NZ PBF file already exists, skipping download."
else
  echo "↓ Downloading NZ OSM data from Geofabrik..."
  rm -f "$PBF_FILE"
  curl -L --retry 3 -o "$PBF_FILE" "$GEOFABRIK_URL"
  FILE_SIZE=$(stat -c%s "$PBF_FILE" 2>/dev/null || stat -f%z "$PBF_FILE" 2>/dev/null)
  if [ "$FILE_SIZE" -lt "$MIN_PBF_SIZE" ]; then
    echo "✗ Download failed — file is only ${FILE_SIZE} bytes (expected ~380MB)."
    echo "  Check your network connection and try again."
    exit 1
  fi
  echo "✓ Download complete."
fi

# Steps 2-4: Extract, partition, customize -- once per transport profile.
# Each profile needs its own dataset because a single osrm-routed instance
# is baked to whatever profile it was extracted with; it doesn't validate
# its URL's profile segment against the loaded data. car/foot/bicycle.lua
# ship inside the osrm-backend image at /opt/.
#
# osrm-extract has no output-path flag -- it derives the .osrm basename from
# the input filename -- so each non-car profile gets a hardlink of the
# already-downloaded PBF under its own basename (no extra disk cost) before
# extracting.
PROFILES=(
  "car:/opt/car.lua:new-zealand-latest"
  "foot:/opt/foot.lua:new-zealand-latest-foot"
  "bicycle:/opt/bicycle.lua:new-zealand-latest-bicycle"
)

for entry in "${PROFILES[@]}"; do
  IFS=":" read -r name lua_path basename <<< "$entry"
  pbf_link="$DATA_DIR/$basename.osm.pbf"
  osrm_file="$DATA_DIR/$basename.osrm"

  if [ ! -e "$pbf_link" ]; then
    ln "$PBF_FILE" "$pbf_link" 2>/dev/null || cp "$PBF_FILE" "$pbf_link"
  fi

  if [ -f "$osrm_file" ]; then
    echo "✓ [$name] OSRM extract already exists, skipping."
  else
    echo "⚙ [$name] Extracting road network (this may take a few minutes)..."
    docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
      osrm-extract -p "$lua_path" "/data/$basename.osm.pbf"
    echo "✓ [$name] Extraction complete."
  fi

  if [ -f "$DATA_DIR/$basename.osrm.partition" ]; then
    echo "✓ [$name] OSRM partition already exists, skipping."
  else
    echo "⚙ [$name] Partitioning..."
    docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
      osrm-partition "/data/$basename.osrm"
    echo "✓ [$name] Partition complete."
  fi

  if [ -f "$DATA_DIR/$basename.osrm.cell_metrics" ]; then
    echo "✓ [$name] OSRM customization already exists, skipping."
  else
    echo "⚙ [$name] Customizing..."
    docker run --rm -v "$DATA_DIR:/data" "$OSRM_IMAGE" \
      osrm-customize "/data/$basename.osrm"
    echo "✓ [$name] Customization complete."
  fi
done

echo ""
echo "══════════════════════════════════════════"
echo "  ✓ OSRM data ready!"
echo "  Run 'docker compose up osrm osrm-foot osrm-bike' to start the services."
echo "══════════════════════════════════════════"
