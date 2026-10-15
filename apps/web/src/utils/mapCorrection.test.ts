import {
  buildAddPayload,
  buildRemovePayload,
  invalidFieldsFrom,
  isMapChromeTarget,
  rateLimitMessage,
  retryMinutes,
  validateAddPlace,
  validateRemoveReason,
  withoutKey,
  EMPTY_ADD_PLACE_VALUES,
} from "./mapCorrection";

const POINT = { lat: -36.848, lon: 174.763 };

describe("validateAddPlace", () => {
  it("requires a facility type", () => {
    expect(validateAddPlace(EMPTY_ADD_PLACE_VALUES)).toEqual({ facilityType: "facilityTypeRequired" });
  });

  it("treats a whitespace-only facility type as missing", () => {
    expect(validateAddPlace({ ...EMPTY_ADD_PLACE_VALUES, facilityType: "   " })).toEqual({
      facilityType: "facilityTypeRequired",
    });
  });

  it("flags a name over 200 characters, after trimming", () => {
    const base = { ...EMPTY_ADD_PLACE_VALUES, facilityType: "schools" };
    expect(validateAddPlace({ ...base, name: "a".repeat(200) })).toEqual({});
    expect(validateAddPlace({ ...base, name: `  ${"a".repeat(201)}  ` })).toEqual({ name: "nameTooLong" });
  });

  it("flags an address over 300 characters", () => {
    expect(
      validateAddPlace({ ...EMPTY_ADD_PLACE_VALUES, facilityType: "schools", address: "a".repeat(301) }),
    ).toEqual({ address: "addressTooLong" });
  });

  it("accepts a blank email and rejects a malformed one", () => {
    const base = { ...EMPTY_ADD_PLACE_VALUES, facilityType: "schools" };
    expect(validateAddPlace({ ...base, reporterEmail: "" })).toEqual({});
    expect(validateAddPlace({ ...base, reporterEmail: "not-an-email" })).toEqual({ reporterEmail: "emailInvalid" });
    expect(validateAddPlace({ ...base, reporterEmail: "a@b.co" })).toEqual({});
  });
});

describe("buildAddPayload", () => {
  it("trims values and leaves out blank optional fields", () => {
    expect(
      buildAddPayload(
        { ...EMPTY_ADD_PLACE_VALUES, facilityType: " restaurants ", name: "  New Noodle Bar " },
        POINT,
      ),
    ).toEqual({
      correctionType: "add",
      facilityType: "restaurants",
      lat: POINT.lat,
      lon: POINT.lon,
      name: "New Noodle Bar",
      website: "",
    });
  });

  it("includes address and email when given, and passes the honeypot through", () => {
    expect(
      buildAddPayload(
        {
          facilityType: "schools",
          name: "",
          address: "1 Queen St",
          reporterEmail: "person@example.com",
          website: "spam",
        },
        POINT,
      ),
    ).toMatchObject({ address: "1 Queen St", reporterEmail: "person@example.com", website: "spam" });
  });
});

describe("remove payload and reason validation", () => {
  it("requires a reason", () => {
    expect(validateRemoveReason(null)).toBe("reasonRequired");
    expect(validateRemoveReason("closed")).toBeNull();
  });

  it("builds the remove payload", () => {
    expect(buildRemovePayload("node/1", "not_found", "")).toEqual({
      correctionType: "remove",
      targetOsmId: "node/1",
      reason: "not_found",
      website: "",
    });
  });
});

describe("invalidFieldsFrom", () => {
  it("maps known field locations", () => {
    expect(
      invalidFieldsFrom({ detail: [{ loc: ["body", "reporterEmail"] }, { loc: ["body", "lat"] }] }),
    ).toEqual({ fieldErrors: ["reporterEmail", "lat"], formError: false });
  });

  it("flags unknown or missing locations as form-level", () => {
    expect(invalidFieldsFrom({ detail: [{ loc: ["body"] }] })).toEqual({ fieldErrors: [], formError: true });
    expect(invalidFieldsFrom({ detail: "boom" })).toEqual({ fieldErrors: [], formError: true });
    expect(invalidFieldsFrom(null)).toEqual({ fieldErrors: [], formError: true });
  });
});

describe("rate limit wait", () => {
  it("rounds the wait up to whole minutes", () => {
    expect(retryMinutes(60)).toBe(1);
    expect(retryMinutes(61)).toBe(2);
    expect(retryMinutes(150)).toBe(3);
  });

  it("uses the unknown-wait message when no wait was given", () => {
    const t = jest.fn((key: string) => key);
    expect(rateLimitMessage(undefined, t)).toBe("errors.rateLimitedUnknown");
    expect(rateLimitMessage(120, t)).toBe("errors.rateLimited");
    expect(t).toHaveBeenLastCalledWith("errors.rateLimited", { minutes: 2 });
  });
});

describe("withoutKey", () => {
  it("returns the same object when the key is absent", () => {
    const obj = { a: 1 };
    expect(withoutKey(obj, "b")).toBe(obj);
  });

  it("returns a copy without the key", () => {
    expect(withoutKey({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
  });
});

describe("isMapChromeTarget", () => {
  it("is true for elements inside the map toolbar", () => {
    const toolbar = document.createElement("div");
    toolbar.setAttribute("role", "toolbar");
    const button = document.createElement("button");
    toolbar.appendChild(button);
    expect(isMapChromeTarget(button)).toBe(true);
  });

  it("is false for the map itself and for non-elements", () => {
    expect(isMapChromeTarget(document.createElement("div"))).toBe(false);
    expect(isMapChromeTarget(null)).toBe(false);
  });
});
