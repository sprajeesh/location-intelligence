-- Load LINZ NZ Street Address CSV data.
-- Explicit column list excludes `shape` (geometry) and auto-generated columns (id, created_at, updated_at).
-- Column ORDER must match the LINZ CSV export column order — verify against actual CSV headers.
COPY addresses (
    source_address_id,
    source_dataset,
    source_change_id,
    full_address_number,
    full_road_name,
    full_address,
    address_number_prefix,
    address_number,
    address_number_suffix,
    road_name,
    road_name_type,
    suburb_locality,
    town_city,
    xcoord,
    ycoord,
    road_name_ascii,
    suburb_locality_ascii,
    town_city_ascii,
    full_road_name_ascii,
    full_address_ascii
) FROM '/tmp/nz_addresses.csv' WITH (FORMAT csv, HEADER true, NULL '');
