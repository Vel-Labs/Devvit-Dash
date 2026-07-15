export type LayoutMode = 'portrait' | 'landscape';

export type ViewportLayout = {
  mode: LayoutMode;
  width: number;
  height: number;
};

export type BuilderPageRange = {
  start: number;
  endExclusive: number;
  count: number;
};

export type RunnerViewportGeometry = {
  laneYs: readonly [number, number, number];
  playerX: number;
  columnWidth: number;
  visibleColumns: number;
  playfield: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

type ScaleTarget = {
  width: number;
  height: number;
  setGameSize: (width: number, height: number) => unknown;
};

export const LANDSCAPE_LAYOUT: ViewportLayout = {
  mode: 'landscape',
  width: 1280,
  height: 720,
};

export const PORTRAIT_LAYOUT: ViewportLayout = {
  mode: 'portrait',
  width: 720,
  height: 1280,
};

const PORTRAIT_RATIO_MAX = 0.82;
export const MIN_BUILDER_TOUCH_TARGET = 44;
export const MIN_LANDSCAPE_ACTION_HEIGHT = 54;
export const PORTRAIT_BUILDER_COLUMNS = 6;

const PORTRAIT_RUNNER_GEOMETRY: RunnerViewportGeometry = {
  laneYs: [382, 622, 862],
  playerX: 118,
  columnWidth: 72,
  visibleColumns: 11,
  playfield: { left: 12, right: 708, top: 244, bottom: 986 },
};

const LANDSCAPE_RUNNER_GEOMETRY: RunnerViewportGeometry = {
  laneYs: [224, 356, 488],
  playerX: 250,
  columnWidth: 96,
  visibleColumns: 14,
  playfield: { left: 20, right: 1060, top: 118, bottom: 610 },
};

const positiveDimension = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1;

export const getViewportLayout = (
  viewportWidth: number,
  viewportHeight: number
): ViewportLayout => {
  const width = positiveDimension(viewportWidth);
  const height = positiveDimension(viewportHeight);
  return width / height <= PORTRAIT_RATIO_MAX ? PORTRAIT_LAYOUT : LANDSCAPE_LAYOUT;
};

export const getCurrentViewportLayout = (): ViewportLayout =>
  getViewportLayout(window.innerWidth, window.innerHeight);

export const isCompactLandscapeViewport = (
  viewportWidth: number,
  viewportHeight: number
): boolean => {
  const width = positiveDimension(viewportWidth);
  const height = positiveDimension(viewportHeight);
  if (getViewportLayout(width, height).mode !== 'landscape') return false;
  const fittedScale = Math.min(width / LANDSCAPE_LAYOUT.width, height / LANDSCAPE_LAYOUT.height);
  return fittedScale * MIN_LANDSCAPE_ACTION_HEIGHT < MIN_BUILDER_TOUCH_TARGET;
};

export const applyLayoutToScale = (scale: ScaleTarget, layout: ViewportLayout): ViewportLayout => {
  if (scale.width !== layout.width || scale.height !== layout.height) {
    scale.setGameSize(layout.width, layout.height);
  }
  return layout;
};

export const applyViewportLayout = (scale: ScaleTarget): ViewportLayout =>
  applyLayoutToScale(scale, getCurrentViewportLayout());

export const getRunnerViewportGeometry = (mode: LayoutMode): RunnerViewportGeometry =>
  mode === 'portrait' ? PORTRAIT_RUNNER_GEOMETRY : LANDSCAPE_RUNNER_GEOMETRY;

export const getBuilderPageRange = (
  mode: LayoutMode,
  tileWidth: number,
  requestedStart = 0
): BuilderPageRange => {
  const width = Math.max(1, Math.floor(tileWidth));
  if (mode === 'landscape') {
    return { start: 0, endExclusive: width, count: width };
  }

  const pageSize = Math.min(PORTRAIT_BUILDER_COLUMNS, width);
  const lastPageStart = Math.max(0, width - pageSize);
  const pageAlignedStart = Math.floor(Math.max(0, requestedStart) / pageSize) * pageSize;
  const start = Math.min(pageAlignedStart, lastPageStart);
  const endExclusive = Math.min(width, start + pageSize);
  return { start, endExclusive, count: endExclusive - start };
};

export const builderPageStartForColumn = (
  mode: LayoutMode,
  tileWidth: number,
  column: number
): number => {
  const width = Math.max(1, Math.floor(tileWidth));
  const safeColumn = Math.min(width - 1, Math.max(0, Math.floor(column)));
  return getBuilderPageRange(mode, width, safeColumn).start;
};

export const mapVisibleBuilderColumn = (
  range: BuilderPageRange,
  visibleColumn: number
): number | undefined => {
  const localColumn = Math.floor(visibleColumn);
  if (localColumn < 0 || localColumn >= range.count) return undefined;
  return range.start + localColumn;
};
