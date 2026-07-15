import type { AchievementDefinition, AchievementUnlock, PlayerProfile, PlayerStats } from './types';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-certified-tile',
    name: 'Roadmaker',
    description: 'Publish your first certified course tile.',
    category: 'builder',
    target: 1,
    stat: 'tilesCertified',
  },
  {
    id: 'featured-builder',
    name: 'Made the Map',
    description: 'Have one of your tiles selected for an official route.',
    category: 'builder',
    target: 1,
    stat: 'tilesFeatured',
  },
  {
    id: 'clean-delivery',
    name: 'Handle With Care',
    description: 'Complete a route without losing package integrity.',
    category: 'runner',
    target: 1,
    stat: 'cleanRuns',
  },
  {
    id: 'roadbook-regular',
    name: 'Roadbook Regular',
    description: 'Complete ten different routes.',
    category: 'runner',
    target: 10,
    stat: 'uniqueRoutesCompleted',
  },
  {
    id: 'seven-day-route',
    name: 'Seven Stops',
    description: 'Keep a seven-day play streak.',
    category: 'community',
    target: 7,
    stat: 'bestStreak',
  },
  {
    id: 'well-travelled',
    name: 'Well Travelled',
    description: 'Accumulate 1,000 crossings over your featured tiles.',
    category: 'community',
    target: 1_000,
    stat: 'totalTileCrossings',
  },
  {
    id: 'balanced-designer',
    name: 'Fork in the Road',
    description: 'Create a featured tile whose main routes are both meaningfully used.',
    category: 'builder',
    target: 1,
    stat: 'balancedTiles',
  },
  {
    id: 'world-tourist',
    name: 'World Tourist',
    description: 'Complete routes from five different communities.',
    category: 'exploration',
    target: 5,
    stat: 'worldTourCommunities',
  },
];

export const createEmptyStats = (): PlayerStats => ({
  tilesSubmitted: 0,
  tilesCertified: 0,
  tilesFeatured: 0,
  runsCompleted: 0,
  cleanRuns: 0,
  failedDeliveries: 0,
  distanceColumnsTraveled: 0,
  uniqueRoutesCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalTileCrossings: 0,
  balancedTiles: 0,
  worldTourCommunities: 0,
});

export const createProfile = (
  userId: string,
  username: string,
  tenantId: string
): PlayerProfile => ({
  userId,
  username,
  tenantId,
  stats: createEmptyStats(),
  unlocked: [],
  completedRouteIds: [],
});

export const evaluateAchievementUnlocks = (
  stats: PlayerStats,
  current: AchievementUnlock[],
  now = new Date().toISOString()
): AchievementUnlock[] => {
  const unlockedIds = new Set(current.map((unlock) => unlock.id));
  const next = [...current];
  for (const definition of ACHIEVEMENTS) {
    if (unlockedIds.has(definition.id)) continue;
    if (stats[definition.stat] >= definition.target) {
      next.push({ id: definition.id, unlockedAt: now });
    }
  }
  return next;
};
