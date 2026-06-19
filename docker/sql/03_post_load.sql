-- Populate geometry from shape_x (longitude) / shape_y (latitude) after CSV load.
UPDATE addresses
SET shape = ST_SetSRID(ST_MakePoint(shape_x::float, shape_y::float), 4326)
WHERE shape_x IS NOT NULL AND shape_y IS NOT NULL;

-- Indexes for address search queries.
CREATE INDEX idx_addresses_full_address ON addresses(full_address);
CREATE INDEX idx_addresses_road_name ON addresses(road_name);
CREATE INDEX idx_addresses_town_city ON addresses(town_city);

-- GIN trigram index accelerates ILIKE '%query%' on the ASCII column.
CREATE INDEX idx_addresses_full_address_ascii_trgm
    ON addresses USING GIN (full_address_ascii gin_trgm_ops);
