/**
 * Turns a facility's map feature ID into the OSM element reference the API expects.
 *
 * `osm_node_12345` becomes `node/12345`. Returns null for anything else (for example a
 * feature whose ID was not derived from OSM), so the caller can hide the action.
 */
const FEATURE_ID_RE = /^osm_(node|way|relation)_(\d+)$/;

export function osmTargetFromFeatureId(featureId: string): string | null {
  const match = FEATURE_ID_RE.exec(featureId);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}
