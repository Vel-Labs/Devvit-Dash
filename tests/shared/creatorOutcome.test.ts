import { describe, expect, it } from 'vitest';
import { collectCreatorOutcomeTiles } from '../../src/shared/creatorOutcome';
import { createDraftTile } from '../../src/shared/game/tile';
import type { RouteBundle, RunResult } from '../../src/shared/game/types';

const authorTile = {
  ...createDraftTile({ id: 'tile-author' }),
  authorId: 'author',
  status: 'featured' as const,
};
const otherTile = {
  ...createDraftTile({ id: 'tile-other' }),
  authorId: 'other',
  status: 'featured' as const,
};
const route: RouteBundle = {
  recipe: {
    version: authorTile.version,
    id: 'route-1',
    tenantId: 'tenant-1',
    tenantName: 'DailyDashTest',
    dateKey: '2026-07-13',
    createdAt: '2026-07-13T00:00:00.000Z',
    tileIds: [authorTile.id, otherTile.id],
    fallbackTileIds: [],
    visualSeed: 7,
    biomeId: 'meadow-postcard',
    compilerVersion: 1,
    revision: 3,
    scope: 'tenant',
  },
  tiles: [authorTile, otherTile],
};

const run = (overrides: Partial<RunResult>): RunResult => ({
  token: 'token',
  routeId: route.recipe.id,
  routeRevision: route.recipe.revision,
  laneEvents: [],
  elapsedMs: 10_000,
  damageTaken: 0,
  parcelsCollected: 0,
  boostsTriggered: 0,
  completed: true,
  userId: 'runner',
  username: 'runner',
  score: 100,
  distanceColumns: 12,
  completedAt: '2026-07-13T01:00:00.000Z',
  ...overrides,
});

describe('creator outcome aggregation', () => {
  it('labels current best-run samples without counting the creator or incomplete runs', () => {
    const [tile] = collectCreatorOutcomeTiles('author', [
      {
        route,
        bestRuns: [
          run({ userId: 'runner-top', laneEvents: [{ column: 2, lane: 0 }] }),
          run({ userId: 'runner-bottom', damageTaken: 1, laneEvents: [{ column: 2, lane: 2 }] }),
          run({ userId: 'author' }),
          run({ userId: 'unfinished', completed: false }),
        ],
      },
    ]);

    expect(tile).toMatchObject({
      dateKey: '2026-07-13',
      routeRevision: 3,
      tileIndex: 0,
      bestRunSampleSize: 2,
      cleanRouteBestRunSamples: 1,
      midpointLaneChoices: { top: 1, middle: 0, bottom: 1 },
    });
  });

  it('does not expose removed creator tiles', () => {
    const removedRoute = {
      ...route,
      tiles: [{ ...authorTile, status: 'removed' as const }],
    };
    expect(collectCreatorOutcomeTiles('author', [{ route: removedRoute, bestRuns: [] }])).toEqual(
      []
    );
  });
});
