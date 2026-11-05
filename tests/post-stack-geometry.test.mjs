import test from 'node:test';
import assert from 'node:assert/strict';

import { POST_STACK_LAYOUT, postSlotAtPoint } from '../post-stack-geometry.mjs';

test('defines two equal 1064 by 708 Post frames with uniform eight-pixel white gaps', () => {
  assert.deepEqual(POST_STACK_LAYOUT, {
    width: 1080,
    height: 1440,
    border: 8,
    separator: 8,
    frames: {
      top: { x: 8, y: 8, width: 1064, height: 708 },
      bottom: { x: 8, y: 724, width: 1064, height: 708 },
    },
  });
  const { width, height, border, separator, frames } = POST_STACK_LAYOUT;
  assert.equal(border + frames.top.width + border, width);
  assert.equal(border + frames.top.height + separator + frames.bottom.height + border, height);
  assert.ok(Object.isFrozen(POST_STACK_LAYOUT));
  assert.ok(Object.isFrozen(frames));
  assert.ok(Object.isFrozen(frames.top));
  assert.ok(Object.isFrozen(frames.bottom));
});

test('maps points only inside Post photo frames', () => {
  const points = [
    [8, 8, 'top'], [1071.99, 715.99, 'top'], [540, 400, 'top'],
    [8, 724, 'bottom'], [1071.99, 1431.99, 'bottom'], [540, 1100, 'bottom'],
    [7.99, 8, null], [1072, 8, null], [8, 7.99, null],
    [8, 716, null], [540, 720, null], [8, 723.99, null],
    [7.99, 724, null], [1072, 724, null], [8, 1432, null],
    [0, 0, null], [1080, 1440, null], [-1, 400, null], [540, -1, null],
    [1081, 400, null], [540, 1441, null], [NaN, 400, null], [540, Infinity, null],
  ];
  for (const [x, y, expected] of points) {
    assert.equal(postSlotAtPoint(x, y), expected, `point (${x}, ${y})`);
  }
});
