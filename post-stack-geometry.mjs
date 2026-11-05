export const POST_STACK_LAYOUT = Object.freeze({
  width: 1080,
  height: 1440,
  border: 8,
  separator: 8,
  frames: Object.freeze({
    top: Object.freeze({ x: 8, y: 8, width: 1064, height: 708 }),
    bottom: Object.freeze({ x: 8, y: 724, width: 1064, height: 708 }),
  }),
});

// Use half-open bounds so the right/bottom edges belong to the white gaps.
export function postSlotAtPoint(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  for (const [slot, frame] of Object.entries(POST_STACK_LAYOUT.frames)) {
    if (x >= frame.x && x < frame.x + frame.width
      && y >= frame.y && y < frame.y + frame.height) {
      return slot;
    }
  }

  return null;
}
