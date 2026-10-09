import { getButtonLinkClasses, buttonColorVariants } from "./buttonStyles";

describe("getButtonLinkClasses", () => {
  it("combines the text-button shape, interaction base, focus ring and variant colors", () => {
    const classes = getButtonLinkClasses("primary");
    expect(classes).toContain("rounded-lg");
    expect(classes).toContain("active:scale-[0.97]");
    expect(classes).toContain("focus-ring-inset");
    expect(classes).toContain(buttonColorVariants({ variant: "primary" }));
  });

  it("uses the flush focus ring for outline", () => {
    expect(getButtonLinkClasses("outline")).toContain("focus-ring-flush");
  });
});
