/**
 * All facility types the backend can score, matching GET /categories.
 * Requested wholesale on every analyze call so all five composite
 * categories (education, transport, healthcare, shopping, recreation)
 * can score for a given address.
 */
export const ALL_FACILITY_TYPES: string[] = [
  "schools",
  "universities",
  "parks",
  "libraries",
  "bus_stops",
  "railway_stations",
  "hospitals",
  "pharmacies",
  "supermarkets",
];
