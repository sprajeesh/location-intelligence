import { computeParcelStatus } from "./parcelStatus";

const settled = { hasAddress: true, isFetching: false, isError: false };

describe("computeParcelStatus", () => {
  it("is idle when no address is selected", () => {
    expect(
      computeParcelStatus({ hasAddress: false, isFetching: true, isError: true, data: null }),
    ).toBe("idle");
  });

  it("is locating while the lookup is in flight, even after an earlier error", () => {
    expect(
      computeParcelStatus({ ...settled, isFetching: true, isError: true, data: undefined }),
    ).toBe("locating");
  });

  it("is error when the settled lookup failed", () => {
    expect(computeParcelStatus({ ...settled, isError: true, data: undefined })).toBe("error");
  });

  it("is notFound when the lookup settled with null", () => {
    expect(computeParcelStatus({ ...settled, data: null })).toBe("notFound");
  });

  it("is found when a parcel was returned", () => {
    expect(computeParcelStatus({ ...settled, data: { type: "Feature" } })).toBe("found");
  });

  it("is idle when the lookup has not produced data yet", () => {
    expect(computeParcelStatus({ ...settled, data: undefined })).toBe("idle");
  });
});
