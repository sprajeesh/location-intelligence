import { isValidHttpUrl } from "./url";

describe("isValidHttpUrl", () => {
  it("accepts http and https URLs with a host", () => {
    expect(isValidHttpUrl("https://example.org")).toBe(true);
    expect(isValidHttpUrl("http://example.org/path?x=1")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidHttpUrl("not a url")).toBe(false);
  });

  it("rejects protocol-only strings with no hostname", () => {
    expect(isValidHttpUrl("https://")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });
});
