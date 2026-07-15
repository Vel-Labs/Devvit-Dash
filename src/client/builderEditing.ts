import {
  MAX_BOOSTS,
  MAX_BUILD_BUDGET,
  MAX_GAPS,
  MAX_OBSTACLES,
  MAX_PARCELS,
} from '../shared/game/constants';
import { calculateBuildBudget, countFeature, countTerrain, setTileCell } from '../shared/game/tile';
import type { CourseTile, Feature, Lane, Terrain } from '../shared/game/types';

export type BuilderTool = 'road' | 'gap' | 'obstacle' | 'boost' | 'parcel';

export type BuilderEditLimitReason =
  | 'build-budget'
  | 'obstacle-limit'
  | 'gap-limit'
  | 'boost-limit'
  | 'parcel-limit';

export type BuilderEditResult =
  | {
      changed: true;
      tile: CourseTile;
      action: 'added' | 'removed' | 'replaced';
    }
  | {
      changed: false;
      tile: CourseTile;
      reason: 'unchanged' | BuilderEditLimitReason;
    };

export type BuilderToolUsage = {
  count: number;
  limit: number | null;
};

const TOOL_TARGET: Record<BuilderTool, { terrain: Terrain; feature: Feature }> = {
  road: { terrain: 'road', feature: 'none' },
  gap: { terrain: 'gap', feature: 'none' },
  obstacle: { terrain: 'road', feature: 'obstacle' },
  boost: { terrain: 'road', feature: 'boost' },
  parcel: { terrain: 'road', feature: 'parcel' },
};

const LIMIT_CHECKS: ReadonlyArray<{
  reason: BuilderEditLimitReason;
  limit: number;
  count: (tile: CourseTile) => number;
}> = [
  { reason: 'build-budget', limit: MAX_BUILD_BUDGET, count: calculateBuildBudget },
  {
    reason: 'obstacle-limit',
    limit: MAX_OBSTACLES,
    count: (tile) => countFeature(tile, 'obstacle'),
  },
  { reason: 'gap-limit', limit: MAX_GAPS, count: (tile) => countTerrain(tile, 'gap') },
  { reason: 'boost-limit', limit: MAX_BOOSTS, count: (tile) => countFeature(tile, 'boost') },
  { reason: 'parcel-limit', limit: MAX_PARCELS, count: (tile) => countFeature(tile, 'parcel') },
];

export const getBuilderToolUsage = (tile: CourseTile, tool: BuilderTool): BuilderToolUsage => {
  if (tool === 'road') return { count: 0, limit: null };
  if (tool === 'gap') return { count: countTerrain(tile, 'gap'), limit: MAX_GAPS };
  const limit = tool === 'obstacle' ? MAX_OBSTACLES : tool === 'boost' ? MAX_BOOSTS : MAX_PARCELS;
  return { count: countFeature(tile, tool), limit };
};

export const applyBuilderTool = (
  tile: CourseTile,
  lane: Lane,
  column: number,
  tool: BuilderTool
): BuilderEditResult => {
  const current = tile.lanes[lane]?.[column];
  if (!current) return { changed: false, tile, reason: 'unchanged' };

  const target = TOOL_TARGET[tool];
  const matchesTarget = current.terrain === target.terrain && current.feature === target.feature;
  if (matchesTarget && tool === 'road') {
    return { changed: false, tile, reason: 'unchanged' };
  }

  const nextTarget = matchesTarget ? TOOL_TARGET.road : target;
  const candidate = setTileCell(tile, lane, column, nextTarget.terrain, nextTarget.feature);

  for (const check of LIMIT_CHECKS) {
    const currentCount = check.count(tile);
    const candidateCount = check.count(candidate);
    if (candidateCount > check.limit && candidateCount > currentCount) {
      return { changed: false, tile, reason: check.reason };
    }
  }

  const action = matchesTarget
    ? 'removed'
    : current.terrain === 'road' && current.feature === 'none'
      ? 'added'
      : 'replaced';
  return { changed: true, tile: candidate, action };
};
