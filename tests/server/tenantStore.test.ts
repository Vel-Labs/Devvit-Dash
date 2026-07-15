import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRoute } from '../../src/shared/game/generator';

const transaction = vi.hoisted(() => ({
  multi: vi.fn(),
  del: vi.fn(),
  hDel: vi.fn(),
  exec: vi.fn(),
  unwatch: vi.fn(),
}));

const redis = vi.hoisted(() => ({
  hGet: vi.fn(),
  hGetAll: vi.fn(),
  hSet: vi.fn(),
  hSetNX: vi.fn(),
  hDel: vi.fn(),
  hIncrBy: vi.fn(),
  hKeys: vi.fn(),
  zAdd: vi.fn(),
  zRange: vi.fn(),
  zRem: vi.fn(),
  zScore: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  watch: vi.fn(),
}));

vi.mock('@devvit/web/server', () => ({ redis }));

import { KEYS } from '../../src/server/core/keys';
import { tenantStore } from '../../src/server/repositories/tenantStore';

const route = generateRoute({
  tenant: { id: 'tenant-a', name: 'Tenant A' },
  dateKey: '2026-07-13',
  communityTiles: [],
});

describe('tenant route and run-token persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redis.watch.mockResolvedValue(transaction);
    transaction.multi.mockResolvedValue(undefined);
    transaction.del.mockResolvedValue(transaction);
    transaction.hDel.mockResolvedValue(transaction);
    transaction.unwatch.mockResolvedValue(transaction);
  });

  it('inserts an immutable route snapshot before updating the current route', async () => {
    redis.hSetNX.mockResolvedValue(1);
    redis.hSet.mockResolvedValue(1);
    redis.zAdd.mockResolvedValue(1);

    await tenantStore.saveRoute(route);

    expect(redis.hSetNX).toHaveBeenCalledWith(
      KEYS.routeRevisions(route.recipe.id),
      String(route.recipe.revision),
      JSON.stringify(route)
    );
    expect(redis.hSetNX.mock.invocationCallOrder[0]).toBeLessThan(
      redis.hSet.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });

  it('rejects different bytes for an existing route revision', async () => {
    redis.hSetNX.mockResolvedValue(0);
    redis.hGet.mockResolvedValue(JSON.stringify({ ...route, tiles: [] }));

    await expect(tenantStore.saveRoute(route)).rejects.toThrow(
      `Route revision ${route.recipe.id}@${route.recipe.revision} is immutable.`
    );
    expect(redis.hSet).not.toHaveBeenCalled();
  });

  it('backfills only an exact legacy current revision', async () => {
    redis.hGet.mockResolvedValueOnce(undefined).mockResolvedValueOnce(JSON.stringify(route));
    redis.hSetNX.mockResolvedValue(1);

    await expect(
      tenantStore.getRouteRevision(route.recipe.id, route.recipe.revision)
    ).resolves.toEqual(route);
    expect(redis.hSetNX).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    redis.hGet.mockResolvedValueOnce(undefined).mockResolvedValueOnce(JSON.stringify(route));
    await expect(
      tenantStore.getRouteRevision(route.recipe.id, route.recipe.revision + 1)
    ).resolves.toBeUndefined();
    expect(redis.hSetNX).not.toHaveBeenCalled();
  });

  it('claims a token only when the watched delete commits', async () => {
    redis.get.mockResolvedValue('issued-token');
    transaction.exec.mockResolvedValue([1]);

    await expect(tenantStore.claimRunToken('token-a', 'user-a')).resolves.toBe(true);
    expect(redis.watch).toHaveBeenCalledWith(KEYS.runToken('token-a'));
    expect(transaction.multi).toHaveBeenCalledOnce();
    expect(transaction.del).toHaveBeenCalledWith(KEYS.runToken('token-a'));
    expect(transaction.hDel).toHaveBeenCalledWith(KEYS.userRunTokens('user-a'), ['token-a']);

    transaction.exec.mockResolvedValueOnce([]);
    await expect(tenantStore.claimRunToken('token-a', 'user-a')).resolves.toBe(false);
  });

  it('creates an expiring token and owner deletion index together', async () => {
    redis.set.mockResolvedValue('OK');
    redis.hSet.mockResolvedValue(1);

    await tenantStore.saveRunToken('token-a', 'payload', 'user-a', 900);

    expect(redis.set).toHaveBeenCalledWith(
      KEYS.runToken('token-a'),
      'payload',
      expect.objectContaining({ nx: true, expiration: expect.any(Date) })
    );
    expect(redis.hSet).toHaveBeenCalledWith(KEYS.userRunTokens('user-a'), {
      'token-a': '1',
    });
    expect(redis.expire).toHaveBeenCalledWith(KEYS.userRunTokens('user-a'), 900);
  });

  it('does not open a transaction for an already missing token', async () => {
    redis.get.mockResolvedValue(undefined);

    await expect(tenantStore.claimRunToken('token-a', 'user-a')).resolves.toBe(false);
    expect(transaction.unwatch).toHaveBeenCalledOnce();
    expect(transaction.multi).not.toHaveBeenCalled();
  });

  it('indexes submission dates and bounds inactive-user lookup to installation keys', async () => {
    redis.hSet.mockResolvedValue(1);
    redis.zAdd.mockResolvedValue(1);
    redis.zRange.mockResolvedValue([{ member: 'user-a', score: 100 }]);

    await tenantStore.saveSubmissionForDate('2026-07-13', 'user-a', 'tile-a');
    await expect(tenantStore.listInactiveUserIds(100, 10)).resolves.toEqual(['user-a']);

    expect(redis.zAdd).toHaveBeenCalledWith(KEYS.submissionDates, {
      member: '2026-07-13',
      score: Date.parse('2026-07-13T00:00:00.000Z'),
    });
    expect(redis.zRange).toHaveBeenCalledWith(KEYS.userActivity, '-inf', 100, {
      by: 'score',
      limit: { offset: 0, count: 10 },
    });
  });

  it('privacy-purges a route revision and its revision-scoped rankings', async () => {
    await tenantStore.deleteRouteRevision('route-a', 3);

    expect(redis.hDel).toHaveBeenCalledWith(KEYS.routeRevisions('route-a'), ['3']);
    expect(redis.del).toHaveBeenCalledWith(
      KEYS.bestRuns('route-a', 3),
      KEYS.leaderboard('route-a', 3)
    );
  });

  it('deletes every indexed active token for an owner request', async () => {
    redis.hKeys.mockResolvedValue(['token-a', 'token-b']);

    await expect(tenantStore.deleteUserRunTokens('user-a')).resolves.toBe(2);

    expect(redis.del).toHaveBeenCalledWith(KEYS.runToken('token-a'), KEYS.runToken('token-b'));
    expect(redis.del).toHaveBeenCalledWith(KEYS.userRunTokens('user-a'));
  });
});
