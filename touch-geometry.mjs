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
