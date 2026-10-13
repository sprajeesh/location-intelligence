/** Size of the parcel info card, in px. Used to keep it inside the map. */
export const PARCEL_CARD_WIDTH = 320;
export const PARCEL_CARD_HEIGHT = 160;

const MIN_MARGIN = 10;
const OFFSET = 50;

export interface CardPosition {
  top: number;
  left: number;
}

/**
 * Anchor the parcel card near a clicked point (offset up-left so it doesn't sit
 * under the cursor), clamped so it stays inside the map container.
 */
export function parcelCardPosition(
  point: { x: number; y: number },
  container: { width: number; height: number },
): CardPosition {
  const idealTop = point.y - OFFSET;
  const idealLeft = point.x - OFFSET;

  return {
    top: Math.max(
      MIN_MARGIN,
      Math.min(idealTop, container.height - PARCEL_CARD_HEIGHT - MIN_MARGIN),
    ),
    left: Math.max(
      MIN_MARGIN,
      Math.min(idealLeft, container.width - PARCEL_CARD_WIDTH - MIN_MARGIN),
    ),
  };
}
