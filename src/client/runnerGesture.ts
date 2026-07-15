export type VerticalGestureDirection = -1 | 0 | 1;

export const verticalGestureDirection = (
  startY: number,
  currentY: number,
  thresholdPx: number
): VerticalGestureDirection => {
  const deltaY = currentY - startY;
  if (Math.abs(deltaY) < thresholdPx) return 0;
  return deltaY < 0 ? -1 : 1;
};
