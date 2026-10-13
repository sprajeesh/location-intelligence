import {
  PARCEL_CARD_HEIGHT,
  PARCEL_CARD_WIDTH,
  parcelCardPosition,
} from "./mapCardPosition";

const container = { width: 1000, height: 800 };

describe("parcelCardPosition", () => {
  it("offsets the card up-left of the clicked point", () => {
    expect(parcelCardPosition({ x: 400, y: 300 }, container)).toEqual({ top: 250, left: 350 });
  });

  it("clamps to the top-left margin when the point is near the origin", () => {
    expect(parcelCardPosition({ x: 5, y: 5 }, container)).toEqual({ top: 10, left: 10 });
  });

  it("clamps so the card stays inside the bottom-right of the container", () => {
    const pos = parcelCardPosition({ x: 990, y: 790 }, container);
    expect(pos.left).toBe(container.width - PARCEL_CARD_WIDTH - 10);
    expect(pos.top).toBe(container.height - PARCEL_CARD_HEIGHT - 10);
  });
});
