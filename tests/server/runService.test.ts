import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankLanes } from '../../src/shared/game/tile';
import type { CourseTile, RouteBundle, RunSubmission } from '../../src/shared/game/types';

const store = vi.hoisted(() => ({
  getRoute: vi.fn(),
  getRouteRevision: vi.fn(),
  saveRunToken: vi.fn(),
  getRunToken: vi.fn(),
  claimRunToken: vi.fn(),
}));

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));

import { finishRun } from '../../src/server/services/runService';

const tile: CourseTile = {
  version: 1,
  id: 'safe-tile',
  tenantId: 'tenant-a',
  authorId: 'author-a',
  authorName: 'Author A',
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
  width: 6,
  lanes: createBlankLanes(6),
  visualSeed: 7,
  status: 'featured',
};

const route: RouteBundle = {
  recipe: {
    version: 1,
    id: 'route-a',
    tenantId: 'tenant-a',
    tenantName: 'Tenant A',
    dateKey: '2026-07-13',
    createdAt: '2026-07-13T00:00:00.000Z',
    tileIds: [tile.id],
    fallbackTileIds: [],
    visualSeed: 11,
    biomeId: 'paper-city',
    compilerVersion: 1,
    revision: 1,
    scope: 'tenant',
  },
  tiles: [tile],
};

const tokenPayload = (issuedAtMs: number): string =>
  JSON.stringify({
    token: 'token-a',
    routeId: route.recipe.id,
    routeRevision: route.recipe.revision,
    userId: 'player-a',
    username: 'Player A',
    issuedAtMs,
    expiresAtMs: issuedAtMs + 15 * 60 * 1000,
  });

const submission = (elapsedMs: number): RunSubmission => ({
  token: 'token-a',
  routeId: route.recipe.id,
  routeRevision: route.recipe.revision,
  laneEvents: [],
  elapsedMs,
  damageTaken: 3,
  parcelsCollected: 99,
  boostsTriggered: 99,
  completed: false,
});

describe('ranked run completion boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getRouteRevision.mockResolvedValue(route);
    store.claimRunToken.mockResolvedValue(true);
  });

  it('replays against the immutable token revision and claims only after validation', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));

    const finished = await finishRun(submission(2_000));

    expect(store.getRouteRevision).toHaveBeenCalledWith('route-a', 1);
    expect(store.claimRunToken).toHaveBeenCalledWith('token-a', 'player-a');
    expect(finished.route).toBe(route);
    expect(finished.result).toMatchObject({
      routeRevision: 1,
      userId: 'player-a',
      username: 'Player A',
      damageTaken: 0,
      parcelsCollected: 0,
      boostsTriggered: 0,
      completed: true,
      distanceColumns: 6,
    });
  });

  it('rejects a missing or stale revision without consuming the token', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));
    const missingRevision = {
      ...submission(2_000),
      routeRevision: undefined,
    } as unknown as RunSubmission;

    await expect(finishRun(missingRevision)).rejects.toThrow(
      'Run token does not match this route revision.'
    );
    await expect(finishRun({ ...submission(2_000), routeRevision: 2 })).rejects.toThrow(
      'Run token does not match this route revision.'
    );
    expect(store.getRouteRevision).not.toHaveBeenCalled();
    expect(store.claimRunToken).not.toHaveBeenCalled();
  });

  it('fails closed when the immutable revision cannot be recovered', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));
    store.getRouteRevision.mockResolvedValue(undefined);

    await expect(finishRun(submission(2_000))).rejects.toThrow(
      'The immutable route revision for this run is unavailable.'
    );
    expect(store.claimRunToken).not.toHaveBeenCalled();
  });

  it('does not consume malformed replay input', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));

    await expect(
      finishRun({
        ...submission(2_000),
        laneEvents: [
          { column: 1, lane: 0 },
          { column: 2, lane: 2 },
        ],
      })
    ).rejects.toThrow('Lane events may only move one adjacent lane at a time.');
    expect(store.claimRunToken).not.toHaveBeenCalled();
  });

  it('allows only the atomic-claim winner to complete', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));
    store.claimRunToken.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(finishRun(submission(2_000))).resolves.toMatchObject({
      result: { routeRevision: 1, userId: 'player-a' },
    });
    await expect(finishRun(submission(2_000))).rejects.toThrow(
      'Run token is missing, expired, or already used.'
    );
    expect(store.claimRunToken).toHaveBeenCalledTimes(2);
  });
});
