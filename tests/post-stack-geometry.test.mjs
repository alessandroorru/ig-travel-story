import test from 'node:test';
import assert from 'node:assert/strict';

import * as geometry from '../post-stack-geometry.mjs';

const { POST_STACK_LAYOUT, POST_STACK_4_LAYOUT, getPostLayout, postSlotAtPoint } = geometry;

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

test('defines the four-photo frames in clockwise order with uniform eight-pixel white gaps', () => {
  assert.deepEqual(POST_STACK_4_LAYOUT, {
    width: 1080,
    height: 1440,
    border: 8,
    separator: 8,
    frames: {
      topLeft: { x: 8, y: 8, width: 528, height: 708 },
      topRight: { x: 544, y: 8, width: 528, height: 708 },
      bottomRight: { x: 544, y: 724, width: 528, height: 708 },
      bottomLeft: { x: 8, y: 724, width: 528, height: 708 },
    },
  });
  const { width, height, border, separator, frames } = POST_STACK_4_LAYOUT;
  assert.deepEqual(Object.keys(frames), ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']);
  assert.equal(border + frames.topLeft.width + separator + frames.topRight.width + border, width);
  assert.equal(border + frames.topLeft.height + separator + frames.bottomLeft.height + border, height);
  assert.ok(Object.isFrozen(POST_STACK_4_LAYOUT));
  assert.ok(Object.isFrozen(frames));
  for (const frame of Object.values(frames)) assert.ok(Object.isFrozen(frame));
});

test('looks up known Post layouts and falls back to the two-photo layout', () => {
  assert.equal(getPostLayout('post-stack'), POST_STACK_LAYOUT);
  assert.equal(getPostLayout('post-stack-4'), POST_STACK_4_LAYOUT);
  for (const id of ['unknown', 'cinema', '__proto__', 'toString', undefined]) {
    assert.equal(getPostLayout(id), POST_STACK_LAYOUT);
  }
});

test('hit tests the requested Post template and excludes the cross and outer borders', () => {
  const points = [
    [8, 8, 'topLeft'], [535.99, 715.99, 'topLeft'],
    [544, 8, 'topRight'], [1071.99, 715.99, 'topRight'],
    [544, 724, 'bottomRight'], [1071.99, 1431.99, 'bottomRight'],
    [8, 724, 'bottomLeft'], [535.99, 1431.99, 'bottomLeft'],
    [536, 8, null], [543.99, 724, null],
    [8, 716, null], [544, 723.99, null], [540, 720, null],
    [7.99, 8, null], [1072, 8, null], [8, 7.99, null], [8, 1432, null],
    [NaN, 8, null], [8, Infinity, null], [-Infinity, 8, null],
  ];
  for (const [x, y, expected] of points) {
    assert.equal(postSlotAtPoint('post-stack-4', x, y), expected, `point (${x}, ${y})`);
  }
  assert.equal(postSlotAtPoint('post-stack', 540, 8), 'top');
  assert.equal(postSlotAtPoint('post-stack', 8, 724), 'bottom');
});

test('returns no slot for an unknown or non-Post template', () => {
  for (const id of ['unknown', 'cinema', '__proto__', 'toString', undefined, 8]) {
    assert.equal(postSlotAtPoint(id, 8, 8), null);
  }
});
