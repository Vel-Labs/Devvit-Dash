import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRoute } from '../../src/shared/game/generator';
import { flattenRouteColumns } from '../../src/shared/game/tile';
import { solveColumns } from '../../src/shared/game/validator';

const store = vi.hoisted(() => ({
  listRoutes: vi.fn(),
  listTiles: vi.fn(),
  saveRoute: vi.fn(),
}));

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));
vi.mock('../../src/server/services/profileService', () => ({
  recordFeaturedTiles: vi.fn(),
}));

import { repairRoutesAfterAuthorRemoval } from '../../src/server/services/routeService';

const tenant = { id: 'tenant-a', name: 'Tenant A' };

describe('author privacy route repair', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rebuilds each affected current route once without the deleted author', async () => {
    const route = generateRoute({
      tenant,
      dateKey: '2026-07-13',
      communityTiles: [],
      length: 3,
    });
    const first = route.tiles[0];
    if (!first) throw new Error('Expected route tile.');
    route.tiles[0] = {
      ...first,
      tenantId: tenant.id,
      authorId: 'user-a',
      authorName: 'User A',
      status: 'featured',
    };
    store.listRoutes.mockResolvedValue([route]);
    store.listTiles.mockResolvedValue([route.tiles[0]]);

    await expect(repairRoutesAfterAuthorRemoval(tenant, 'user-a')).resolves.toBe(1);

    expect(store.saveRoute).toHaveBeenCalledOnce();
    const rebuilt = store.saveRoute.mock.calls[0]?.[0];
    expect(rebuilt).toMatchObject({
      recipe: {
        id: route.recipe.id,
        createdAt: route.recipe.createdAt,
        revision: route.recipe.revision + 1,
      },
    });
    expect(rebuilt.tiles.some((tile: { authorId: string }) => tile.authorId === 'user-a')).toBe(
      false
    );
    expect(JSON.stringify(rebuilt)).not.toContain('user-a');
    expect(solveColumns(flattenRouteColumns(rebuilt.tiles)).minimumDamage).toBe(0);
  });

  it('ignores a malformed route from another installation', async () => {
    const route = generateRoute({
      tenant: { id: 'tenant-b', name: 'Tenant B' },
      dateKey: '2026-07-13',
      communityTiles: [],
    });
    const first = route.tiles[0];
    if (!first) throw new Error('Expected route tile.');
    route.tiles[0] = { ...first, authorId: 'user-a', authorName: 'User A' };
    store.listRoutes.mockResolvedValue([route]);

    await expect(repairRoutesAfterAuthorRemoval(tenant, 'user-a')).resolves.toBe(0);
    expect(store.saveRoute).not.toHaveBeenCalled();
  });
});
