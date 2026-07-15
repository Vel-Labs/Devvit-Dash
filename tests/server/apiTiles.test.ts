import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '../../src/shared/game/achievements';
import { generateRoute } from '../../src/shared/game/generator';
import { createDraftTile } from '../../src/shared/game/tile';

const store = vi.hoisted(() => ({
  getSubmissionForDate: vi.fn(),
  getTile: vi.fn(),
  saveTile: vi.fn(),
  saveSubmissionForDate: vi.fn(),
  saveProfile: vi.fn(),
  listRoutes: vi.fn(),
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
vi.mock('../../src/server/services/dataLifecycleService', () => ({
  deleteUserData: vi.fn(),
}));
vi.mock('../../src/server/services/worldCatalog', () => ({
  disabledWorldCatalog: { enabled: false },
}));

import { api } from '../../src/server/routes/api';

const tenant = { id: 'tenant-a', name: 'Tenant A' };
const player = { authenticated: true as const, userId: 'player-a', username: 'Player A' };
const dailyRoute = generateRoute({ tenant, dateKey: '2026-07-14', communityTiles: [] });

const postTile = async (tile = createDraftTile()): Promise<Response> =>
  await api.request('/tiles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tile }),
  });

describe('daily tile submission API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identity.getTenantIdentity.mockReturnValue(tenant);
    identity.getCurrentPlayer.mockResolvedValue(player);
    profiles.getOrCreateProfile.mockResolvedValue(
      createProfile(player.userId, player.username, tenant.id)
    );
    routes.ensureDailyRoute.mockResolvedValue(dailyRoute);
    store.getSubmissionForDate.mockResolvedValue(undefined);
    store.getTile.mockResolvedValue(undefined);
    store.listRoutes.mockResolvedValue([]);
  });

  it('returns only the authenticated player’s active current-day submission at bootstrap', async () => {
    const existing = createDraftTile({
      id: 'today-tile',
      tenantId: tenant.id,
      authorId: player.userId,
      authorName: player.username,
      status: 'certified',
    });
    store.getSubmissionForDate.mockResolvedValue(existing.id);
    store.getTile.mockResolvedValue(existing);

    const response = await api.request('/bootstrap');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      todaySubmission: { id: 'today-tile', authorId: 'player-a', tenantId: 'tenant-a' },
    });
  });

  it('does not expose a mismatched submission record through bootstrap', async () => {
    store.getSubmissionForDate.mockResolvedValue('foreign-tile');
    store.getTile.mockResolvedValue(
      createDraftTile({
        id: 'foreign-tile',
        tenantId: tenant.id,
        authorId: 'another-player',
        status: 'certified',
      })
    );

    const response = await api.request('/bootstrap');

    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      todaySubmission: null,
    });
  });

  it('labels a first daily publication as created and rebuilds identity server-side', async () => {
    const clientTile = createDraftTile({
      tenantId: 'spoofed-tenant',
      authorId: 'spoofed-user',
      authorName: 'Spoofed User',
    });

    const response = await postTile(clientTile);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      disposition: 'created',
      tile: {
        tenantId: tenant.id,
        authorId: player.userId,
        authorName: player.username,
        status: 'certified',
      },
    });
    expect(store.saveSubmissionForDate).toHaveBeenCalledOnce();
    expect(profiles.recordCertifiedTile).toHaveBeenCalledOnce();
  });

  it('labels a same-day replacement as updated and preserves original creation time', async () => {
    const existing = createDraftTile({
      id: 'today-tile',
      tenantId: tenant.id,
      authorId: player.userId,
      authorName: player.username,
      createdAt: '2026-07-14T01:00:00.000Z',
      status: 'certified',
    });
    store.getSubmissionForDate.mockResolvedValue(existing.id);
    store.getTile.mockResolvedValue(existing);
    const replacement = createDraftTile({ createdAt: '2026-07-14T05:00:00.000Z' });

    const response = await postTile(replacement);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      disposition: 'updated',
      tile: { id: 'today-tile', createdAt: '2026-07-14T01:00:00.000Z' },
    });
    expect(profiles.recordCertifiedTile).not.toHaveBeenCalled();
  });

  it('rejects an inconsistent mapped tile before any publication write', async () => {
    store.getSubmissionForDate.mockResolvedValue('foreign-tile');
    store.getTile.mockResolvedValue(
      createDraftTile({
        id: 'foreign-tile',
        tenantId: tenant.id,
        authorId: 'another-player',
        status: 'certified',
      })
    );

    const response = await postTile();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ status: 'error', code: 'submission-record-invalid' });
    expect(store.saveTile).not.toHaveBeenCalled();
    expect(store.saveSubmissionForDate).not.toHaveBeenCalled();
    expect(profiles.recordCertifiedTile).not.toHaveBeenCalled();
  });

  it('rejects a mapped tile that no longer exists before any publication write', async () => {
    store.getSubmissionForDate.mockResolvedValue('missing-tile');
    store.getTile.mockResolvedValue(undefined);

    const response = await postTile();

    expect(response.status).toBe(409);
    expect(store.saveTile).not.toHaveBeenCalled();
    expect(store.saveSubmissionForDate).not.toHaveBeenCalled();
  });
});
