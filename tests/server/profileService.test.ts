import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '../../src/shared/game/achievements';
import { createDraftTile } from '../../src/shared/game/tile';
import type { CourseTile, RouteBundle, RunResult } from '../../src/shared/game/types';

const store = vi.hoisted(() => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));

import {
  getOrCreateProfile,
  reconcileFeaturedTileProgress,
  recordCompletedRun,
} from '../../src/server/services/profileService';

const makeTile = (id: string, status: CourseTile['status'] = 'featured'): CourseTile => ({
  ...createDraftTile({ id }),
  tenantId: 'tenant-a',
  authorId: 'author-a',
  authorName: 'Author A',
  status,
});

const makeRoute = (id: string, tiles: CourseTile[]): RouteBundle => ({
  recipe: {
    version: 1,
    id,
    tenantId: 'tenant-a',
    tenantName: 'Tenant A',
    dateKey: '2026-07-15',
    createdAt: '2026-07-15T00:00:00.000Z',
    tileIds: tiles.map((tile) => tile.id),
    fallbackTileIds: [],
    visualSeed: 7,
    biomeId: 'paper-city',
    compilerVersion: 1,
    revision: 1,
    scope: 'tenant',
  },
  tiles,
});

describe('featured tile achievement reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('repairs stale progress from durable routes and unlocks Made the Map', () => {
    const profile = createProfile('author-a', 'Author A', 'tenant-a');
    const route = makeRoute('route-a', [makeTile('tile-a')]);

    reconcileFeaturedTileProgress(profile, [route]);

    expect(profile.stats.tilesFeatured).toBe(1);
    expect(profile.unlocked.map((unlock) => unlock.id)).toContain('featured-builder');
  });

  it('is idempotent across repeated routes, loads, and revisions', () => {
    const profile = createProfile('author-a', 'Author A', 'tenant-a');
    const tile = makeTile('tile-a');
    const routes = [makeRoute('route-a', [tile]), makeRoute('route-b', [tile])];

    reconcileFeaturedTileProgress(profile, routes);
    const unlockCount = profile.unlocked.length;
    reconcileFeaturedTileProgress(profile, routes);

    expect(profile.stats.tilesFeatured).toBe(1);
    expect(profile.unlocked).toHaveLength(unlockCount);
  });

  it('does not credit removed or someone else authored tiles', () => {
    const profile = createProfile('author-a', 'Author A', 'tenant-a');
    const removed = makeTile('tile-removed', 'removed');
    const other = { ...makeTile('tile-other'), authorId: 'author-b' };

    reconcileFeaturedTileProgress(profile, [makeRoute('route-a', [removed, other])]);

    expect(profile.stats.tilesFeatured).toBe(0);
    expect(profile.unlocked).toEqual([]);
  });
});

describe('Route Passport lifetime metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const run = (completed: boolean, distanceColumns: number, damageTaken = 0): RunResult => ({
    token: 'token-a',
    routeId: 'route-a',
    routeRevision: 1,
    laneEvents: [],
    elapsedMs: 8_000,
    damageTaken,
    parcelsCollected: 2,
    boostsTriggered: 1,
    completed,
    userId: 'player-a',
    username: 'Player A',
    score: completed ? 9_000 : 0,
    distanceColumns,
    completedAt: '2026-07-15T12:00:00.000Z',
  });

  it('migrates pre-Route-Passport profiles without fabricating history', async () => {
    const profile = createProfile('player-a', 'Old Name', 'tenant-a');
    const legacyStats = { ...profile.stats } as Partial<typeof profile.stats>;
    delete legacyStats.failedDeliveries;
    delete legacyStats.distanceColumnsTraveled;
    store.getProfile.mockResolvedValue({ ...profile, stats: legacyStats });

    const migrated = await getOrCreateProfile('player-a', 'Player A', 'tenant-a');

    expect(migrated.stats.failedDeliveries).toBe(0);
    expect(migrated.stats.distanceColumnsTraveled).toBe(0);
    expect(migrated.username).toBe('Player A');
  });

  it('adds authoritative replay distance and clean completion once', async () => {
    const profile = createProfile('player-a', 'Player A', 'tenant-a');
    store.getProfile.mockResolvedValue(profile);

    const updated = await recordCompletedRun(run(true, 144), makeRoute('route-a', []), 'tenant-a');

    expect(updated.stats.distanceColumnsTraveled).toBe(144);
    expect(updated.stats.runsCompleted).toBe(1);
    expect(updated.stats.cleanRuns).toBe(1);
    expect(updated.stats.failedDeliveries).toBe(0);
    expect(store.saveProfile).toHaveBeenCalledWith(updated);
  });

  it('adds partial authoritative distance and one failed delivery', async () => {
    const profile = createProfile('player-a', 'Player A', 'tenant-a');
    store.getProfile.mockResolvedValue(profile);

    const updated = await recordCompletedRun(
      run(false, 37, 3),
      makeRoute('route-a', []),
      'tenant-a'
    );

    expect(updated.stats.distanceColumnsTraveled).toBe(37);
    expect(updated.stats.runsCompleted).toBe(0);
    expect(updated.stats.cleanRuns).toBe(0);
    expect(updated.stats.failedDeliveries).toBe(1);
    expect(store.saveProfile).toHaveBeenCalledWith(updated);
  });
});
