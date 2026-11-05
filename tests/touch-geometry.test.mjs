import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const geometryUrl = new URL('../touch-geometry.mjs', import.meta.url);
const geometry = existsSync(geometryUrl) ? await import(geometryUrl) : {};

function transformOrFail() {
  assert.equal(typeof geometry.calculatePinchTransform, 'function');
  return geometry.calculatePinchTransform;
}

test('anchors a continuous pinch to the moving centroid', () => {
  const calculatePinchTransform = transformOrFail();

  assert.deepEqual(
    calculatePinchTransform({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      previousCentroid: { x: -100, y: 0 },
      currentCentroid: { x: -50, y: 20 },
      previousDistance: 100,
      currentDistance: 150,
    }),
    { zoom: 1.5, offsetX: 100, offsetY: 20 },
  );
});

test('clamps pinch zoom and uses the actual ratio for the anchored offset', () => {
  const calculatePinchTransform = transformOrFail();

  assert.deepEqual(
    calculatePinchTransform({
      zoom: 1,
      offsetX: 10,
      offsetY: -5,
      previousCentroid: { x: 20, y: -10 },
      currentCentroid: { x: 20, y: -10 },
      previousDistance: 100,
      currentDistance: 600,
    }),
    { zoom: 3, offsetX: -10, offsetY: 5 },
  );

  assert.deepEqual(
    calculatePinchTransform({
      zoom: 2,
      offsetX: 40,
      offsetY: -20,
      previousCentroid: { x: 60, y: 30 },
      currentCentroid: { x: 60, y: 30 },
      previousDistance: 100,
      currentDistance: 10,
    }),
    { zoom: 1, offsetX: 50, offsetY: 5 },
  );
});


test('calculates touch centroids relative to each Post frame center', () => {
  assert.equal(typeof geometry.calculateTouchGeometry, 'function');
  assert.deepEqual(geometry.calculateTouchGeometry(
    [{ x: 340, y: 362 }, { x: 540, y: 362 }],
    { x: 8, y: 8, width: 1064, height: 708 },
  ), { centroid: { x: -100, y: 0 }, distance: 200 });
  assert.deepEqual(geometry.calculateTouchGeometry(
    [{ x: 340, y: 1098 }, { x: 640, y: 1098 }],
    { x: 8, y: 724, width: 1064, height: 708 },
  ), { centroid: { x: -50, y: 20 }, distance: 300 });
  assert.deepEqual(geometry.calculateTouchGeometry(
    [{ x: 340, y: 960 }, { x: 540, y: 960 }],
    { x: 0, y: 0, width: 1080, height: 1920 },
  ), { centroid: { x: -100, y: 0 }, distance: 200 });
});
