import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '../../src/shared/game/achievements';
import { generateRoute } from '../../src/shared/game/generator';

const store = vi.hoisted(() => ({
  listRoutes: vi.fn(),
  listBestRuns: vi.fn(),
  saveProfile: vi.fn(),
}));

const profiles = vi.hoisted(() => ({
  getOrCreateProfile: vi.fn(),
  recordCertifiedTile: vi.fn(),
  recordCompletedRun: vi.fn(),
  reconcileFeaturedTileProgress: vi.fn(),
}));

const identity = vi.hoisted(() => ({
  getTenantIdentity: vi.fn(),
  getCurrentPlayer: vi.fn(),
  isCurrentPlayerModerator: vi.fn(),
}));

const routes = vi.hoisted(() => ({
  ensureDailyRoute: vi.fn(),
  randomLocalRoute: vi.fn(),
  repairRoutesAfterTileRemoval: vi.fn(),
}));

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));
vi.mock('../../src/server/core/identity', () => identity);
vi.mock('../../src/server/services/profileService', () => profiles);
vi.mock('../../src/server/services/routeService', () => routes);
vi.mock('../../src/server/services/dataLifecycleService', () => ({ deleteUserData: vi.fn() }));
vi.mock('../../src/server/services/worldCatalog', () => ({
  disabledWorldCatalog: { enabled: false },
}));

import { api } from '../../src/server/routes/api';

describe('creator outcome API', () => {
  const tenant = { id: 'tenant-a', name: 'drawn_to_deliver_dev' };
  const player = {
    authenticated: true as const,
    userId: 'player-a',
    username: 'dashmaker',
    profileUrl: 'https://www.reddit.com/user/dashmaker/',
  };
  const dailyRoute = generateRoute({ tenant, dateKey: '2026-07-15', communityTiles: [] });

  beforeEach(() => {
    vi.clearAllMocks();
    identity.getTenantIdentity.mockReturnValue(tenant);
    identity.getCurrentPlayer.mockResolvedValue(player);
    routes.ensureDailyRoute.mockResolvedValue(dailyRoute);
    store.listRoutes.mockResolvedValue([dailyRoute]);
    store.listBestRuns.mockResolvedValue([]);
    const profile = createProfile(player.userId, player.username, tenant.id);
    profile.stats.runsCompleted = 1;
    profile.stats.tilesCertified = 1;
    profiles.getOrCreateProfile.mockResolvedValue(profile);
  });

  it('returns an always-populated identity card basis and current Daily Route', async () => {
    const response = await api.request('/creator/outcome');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      creatorName: 'dashmaker',
      communityName: 'drawn_to_deliver_dev',
      profileUrl: 'https://www.reddit.com/user/dashmaker/',
      dailyRoute: { recipe: { dateKey: '2026-07-15' } },
      profile: { stats: { runsCompleted: 1, tilesCertified: 1 } },
      tiles: [],
    });
    expect(profiles.reconcileFeaturedTileProgress).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'player-a' }),
      [dailyRoute]
    );
    expect(store.saveProfile).toHaveBeenCalled();
  });
});
