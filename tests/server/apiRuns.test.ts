import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '../../src/shared/game/achievements';
import { createBlankLanes } from '../../src/shared/game/tile';
import type { CourseTile, RouteBundle, RunSubmission } from '../../src/shared/game/types';

const store = vi.hoisted(() => ({
  getRunToken: vi.fn(),
  getRouteRevision: vi.fn(),
  claimRunToken: vi.fn(),
  saveBestRun: vi.fn(),
  touchUserActivity: vi.fn(),
}));

const profiles = vi.hoisted(() => ({
  getOrCreateProfile: vi.fn(),
  recordCertifiedTile: vi.fn(),
  recordCompletedRun: vi.fn(),
}));

const deleteUserData = vi.hoisted(() => vi.fn());

const identity = vi.hoisted(() => ({
  getTenantIdentity: vi.fn(),
  getCurrentPlayer: vi.fn(),
  isCurrentPlayerModerator: vi.fn(),
}));

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));
vi.mock('../../src/server/core/identity', () => identity);
vi.mock('../../src/server/services/profileService', () => profiles);
vi.mock('../../src/server/services/dataLifecycleService', () => ({ deleteUserData }));
vi.mock('../../src/server/services/routeService', () => ({
  ensureDailyRoute: vi.fn(),
  randomLocalRoute: vi.fn(),
  repairRoutesAfterTileRemoval: vi.fn(),
}));
vi.mock('../../src/server/services/worldCatalog', () => ({
  disabledWorldCatalog: { enabled: false },
}));

import { api } from '../../src/server/routes/api';

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

const routeRevisionOne: RouteBundle = {
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
    routeId: routeRevisionOne.recipe.id,
    routeRevision: routeRevisionOne.recipe.revision,
    userId: 'player-a',
    username: 'Player A',
    issuedAtMs,
    expiresAtMs: issuedAtMs + 15 * 60 * 1000,
  });

const submission = (elapsedMs: number): RunSubmission => ({
  token: 'token-a',
  routeId: 'route-a',
  routeRevision: 1,
  laneEvents: [],
  elapsedMs,
  damageTaken: 3,
  parcelsCollected: 99,
  boostsTriggered: 99,
  completed: false,
});

const postCompletion = async (body: unknown): Promise<Response> =>
  await api.request('/runs/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /runs/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identity.getTenantIdentity.mockReturnValue({ id: 'tenant-a', name: 'Tenant A' });
    identity.getCurrentPlayer.mockResolvedValue({
      authenticated: true,
      userId: 'player-a',
      username: 'Player A',
    });
    identity.isCurrentPlayerModerator.mockResolvedValue(false);
    store.getRouteRevision.mockResolvedValue(routeRevisionOne);
    store.claimRunToken.mockResolvedValue(true);
    store.saveBestRun.mockResolvedValue(undefined);
    store.touchUserActivity.mockResolvedValue(undefined);
    profiles.recordCompletedRun.mockResolvedValue(
      createProfile('player-a', 'Player A', 'tenant-a')
    );
    deleteUserData.mockResolvedValue({
      tilesDeleted: 2,
      routeRevisionsDeleted: 3,
      routesRepaired: 1,
      reportsAnonymized: 1,
      bestRunsDeleted: 4,
      runTokensDeleted: 1,
      submissionsDeleted: 1,
      profileDeleted: true,
    });
  });

  it('persists an accepted result under the immutable token revision', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));

    const response = await postCompletion(submission(2_000));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      result: {
        routeId: 'route-a',
        routeRevision: 1,
        userId: 'player-a',
        damageTaken: 0,
        parcelsCollected: 0,
        boostsTriggered: 0,
        completed: true,
        distanceColumns: 6,
      },
    });
    expect(store.saveBestRun).toHaveBeenCalledWith(
      'route-a',
      1,
      expect.objectContaining({ routeRevision: 1 })
    );
    expect(profiles.recordCompletedRun).toHaveBeenCalledWith(
      expect.objectContaining({ routeRevision: 1 }),
      routeRevisionOne,
      'tenant-a'
    );
  });

  it('rejects missing revision before claim or persistence', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));
    const withoutRevision: Record<string, unknown> = { ...submission(2_000) };
    delete withoutRevision.routeRevision;

    const response = await postCompletion(withoutRevision);

    expect(response.status).toBe(400);
    expect(store.claimRunToken).not.toHaveBeenCalled();
    expect(store.saveBestRun).not.toHaveBeenCalled();
    expect(profiles.recordCompletedRun).not.toHaveBeenCalled();
  });

  it('accepts an in-flight old snapshot after the current route is repaired', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));

    const response = await postCompletion(submission(2_000));

    expect(response.status).toBe(200);
    expect(store.getRouteRevision).toHaveBeenCalledWith('route-a', 1);
    expect(store.saveBestRun).toHaveBeenCalledWith('route-a', 1, expect.any(Object));
  });

  it('applies ranked persistence only for the duplicate-request claim winner', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));
    store.claimRunToken.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const first = await postCompletion(submission(2_000));
    const duplicate = await postCompletion(submission(2_000));

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(400);
    expect(store.saveBestRun).toHaveBeenCalledOnce();
    expect(profiles.recordCompletedRun).toHaveBeenCalledOnce();
  });

  it('rejects malformed lane events without claiming or persisting', async () => {
    const now = Date.now();
    store.getRunToken.mockResolvedValue(tokenPayload(now - 2_000));

    const response = await postCompletion({
      ...submission(2_000),
      laneEvents: [
        { column: 1, lane: 0 },
        { column: 2, lane: 2 },
      ],
    });

    expect(response.status).toBe(400);
    expect(store.claimRunToken).not.toHaveBeenCalled();
    expect(store.saveBestRun).not.toHaveBeenCalled();
    expect(profiles.recordCompletedRun).not.toHaveBeenCalled();
  });

  it('exposes authenticated owner data deletion without accepting a user id', async () => {
    const response = await api.request('/profile', { method: 'DELETE' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      tilesDeleted: 2,
      routeRevisionsDeleted: 3,
      routesRepaired: 1,
      profileDeleted: true,
    });
    expect(deleteUserData).toHaveBeenCalledWith({ id: 'tenant-a', name: 'Tenant A' }, 'player-a');
  });

  it('rejects anonymous data-deletion requests', async () => {
    identity.getCurrentPlayer.mockResolvedValue({
      authenticated: false,
      userId: 'anonymous:post-a',
      username: 'anonymous',
    });

    const response = await api.request('/profile', { method: 'DELETE' });

    expect(response.status).toBe(401);
    expect(deleteUserData).not.toHaveBeenCalled();
  });
});
