// LINZ Data Service layer ID for "NZ Primary Parcels" -- the layer queried
// server-side (apps/api/app/clients/linz.py) to resolve a searched address to
// its cadastral parcel. The frontend never calls LINZ directly; this constant
// documents which layer the /api/parcels/at-point proxy is backed by.
export const LINZ_PARCELS_LAYER_ID = 50772;
