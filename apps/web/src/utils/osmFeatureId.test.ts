import { osmTargetFromFeatureId } from "./osmFeatureId";

describe("osmTargetFromFeatureId", () => {
  it.each([
    ["osm_node_12345", "node/12345"],
    ["osm_way_987", "way/987"],
    ["osm_relation_42", "relation/42"],
  ])("maps %s to %s", (featureId, expected) => {
    expect(osmTargetFromFeatureId(featureId)).toBe(expected);
  });

  it.each(["", "node_12345", "osm_node_", "osm_node_12a", "osm_area_1", "osm_node_1 ", "12345"])(
    "returns null for malformed ID %j",
    (featureId) => {
      expect(osmTargetFromFeatureId(featureId)).toBeNull();
    },
  );
});
