-- Populate geometry from xcoord/ycoord after CSV load.
UPDATE addresses
SET shape = ST_SetSRID(ST_MakePoint(xcoord::float, ycoord::float), 4326)
WHERE xcoord IS NOT NULL AND ycoord IS NOT NULL;

-- Indexes for address search queries.
CREATE INDEX idx_addresses_full_address ON addresses(full_address);
CREATE INDEX idx_addresses_road_name ON addresses(road_name);
CREATE INDEX idx_addresses_town_city ON addresses(town_city);

-- GIN trigram index accelerates ILIKE '%query%' on the ASCII column.
CREATE INDEX idx_addresses_full_address_ascii_trgm
    ON addresses USING GIN (full_address_ascii gin_trgm_ops);
