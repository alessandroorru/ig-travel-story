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

export const POST_STACK_4_LAYOUT = Object.freeze({
  width: 1080,
  height: 1440,
  border: 8,
  separator: 8,
  frames: Object.freeze({
    topLeft: Object.freeze({ x: 8, y: 8, width: 528, height: 708 }),
    topRight: Object.freeze({ x: 544, y: 8, width: 528, height: 708 }),
    bottomRight: Object.freeze({ x: 544, y: 724, width: 528, height: 708 }),
    bottomLeft: Object.freeze({ x: 8, y: 724, width: 528, height: 708 }),
  }),
});

const POST_LAYOUTS = new Map([
  ['post-stack', POST_STACK_LAYOUT],
  ['post-stack-4', POST_STACK_4_LAYOUT],
]);

export function getPostLayout(templateId) {
  return POST_LAYOUTS.get(templateId) ?? POST_STACK_LAYOUT;
}

// Use half-open bounds so the right/bottom edges belong to the white gaps.
export function postSlotAtPoint(templateId, x, y) {
  let layout = POST_LAYOUTS.get(templateId);
  // The two-argument form uses the original two-photo layout.
  if (arguments.length === 2) {
    layout = POST_STACK_LAYOUT;
    y = x;
    x = templateId;
  }
  if (!layout || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  for (const [slot, frame] of Object.entries(layout.frames)) {
    if (x >= frame.x && x < frame.x + frame.width
      && y >= frame.y && y < frame.y + frame.height) {
      return slot;
    }
  }

  return null;
}
