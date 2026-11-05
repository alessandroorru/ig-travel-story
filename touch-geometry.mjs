const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function calculatePinchTransform({
  zoom,
  offsetX,
  offsetY,
  previousCentroid,
  currentCentroid,
  previousDistance,
  currentDistance,
}) {
  const requestedRatio = previousDistance > 0 ? currentDistance / previousDistance : 1;
  const nextZoom = clamp(zoom * requestedRatio, 1, 3);
  const actualZoomRatio = nextZoom / zoom;

  return {
    zoom: nextZoom,
    offsetX: currentCentroid.x - (previousCentroid.x - offsetX) * actualZoomRatio,
    offsetY: currentCentroid.y - (previousCentroid.y - offsetY) * actualZoomRatio,
  };
}

export function calculateTouchGeometry(points, frame) {
  return {
    centroid: {
      x: (points[0].x + points[1].x) / 2 - frame.x - frame.width / 2,
      y: (points[0].y + points[1].y) / 2 - frame.y - frame.height / 2,
    },
    distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
  };
}
