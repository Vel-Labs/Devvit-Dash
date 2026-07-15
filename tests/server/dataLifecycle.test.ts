import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfile } from '../../src/shared/game/achievements';
import { generateRoute } from '../../src/shared/game/generator';
import type { RouteBundle, RunResult, TileReport } from '../../src/shared/game/types';

const store = vi.hoisted(() => ({
  listRoutes: vi.fn(),
  listRouteRevisions: vi.fn(),
  listTiles: vi.fn(),
  saveTile: vi.fn(),
  deleteTile: vi.fn(),
  replaceCurrentRouteForPrivacy: vi.fn(),
  replaceRouteRevisionForPrivacy: vi.fn(),
  deleteRouteRevision: vi.fn(),
  listReports: vi.fn(),
  saveReport: vi.fn(),
  deleteReport: vi.fn(),
  listBestRuns: vi.fn(),
  deleteUserBestRun: vi.fn(),
  deleteUserRunTokens: vi.fn(),
  listSubmissionDates: vi.fn(),
  hasSubmissionsForDate: vi.fn(),
  indexSubmissionDate: vi.fn(),
  getSubmissionForDate: vi.fn(),
  removeUserSubmission: vi.fn(),
  deleteSubmissionDate: vi.fn(),
  getProfile: vi.fn(),
  listProfiles: vi.fn(),
  deleteProfile: vi.fn(),
  getUserActivity: vi.fn(),
  touchUserActivity: vi.fn(),
  listInactiveUserIds: vi.fn(),
  removeUserActivity: vi.fn(),
  listSettings: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  deleteSetting: vi.fn(),
}));

const repairRoutesAfterAuthorRemoval = vi.hoisted(() => vi.fn());

vi.mock('../../src/server/repositories/tenantStore', () => ({ tenantStore: store }));
vi.mock('../../src/server/services/routeService', () => ({
  repairRoutesAfterAuthorRemoval,
}));

import {
  DELETED_USER_ID,
  DELETED_USER_NAME,
  anonymizeInactiveUser,
  anonymizeReportIdentity,
  anonymizeRouteAuthors,
  deleteUserData,
  runWeeklyMaintenance,
} from '../../src/server/services/dataLifecycleService';

const tenant = { id: 'tenant-a', name: 'Tenant A' };
const userId = 'user-a';

const routeWithAuthor = (revision = 1): RouteBundle => {
  const route = generateRoute({
    tenant,
    dateKey: '2026-07-13',
    communityTiles: [],
  });
  const first = route.tiles[0];
  if (!first) throw new Error('Expected a founding route tile.');
  route.recipe.revision = revision;
  route.tiles[0] = {
    ...first,
    tenantId: tenant.id,
    authorId: userId,
    authorName: 'User A',
  };
  return route;
};

const safeRoute = (revision = 2): RouteBundle => {
  const route = generateRoute({
    tenant,
    dateKey: '2026-07-13',
    communityTiles: [],
  });
  route.recipe.revision = revision;
  return route;
};

const report: TileReport = {
  id: 'report-a',
  tenantId: tenant.id,
  routeId: 'route-a',
  routeRevision: 1,
  tileId: 'tile-a',
  tileAuthorId: userId,
  tileAuthorName: 'User A',
  reporterId: userId,
  reporterName: 'User A',
  reason: 'broken-route',
  status: 'actioned',
  createdAt: '2025-01-01T00:00:00.000Z',
  actionedAt: '2025-01-02T00:00:00.000Z',
  actionedBy: userId,
};

const bestRun = (route: RouteBundle): RunResult => ({
  token: 'used',
  routeId: route.recipe.id,
  routeRevision: route.recipe.revision,
  laneEvents: [],
  elapsedMs: 2_000,
  damageTaken: 0,
  parcelsCollected: 0,
  boostsTriggered: 0,
  completed: true,
  userId,
  username: 'User A',
  score: 12_000,
  distanceColumns: 108,
  completedAt: '2026-07-13T00:00:00.000Z',
});

describe('tenant data lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.listRoutes.mockResolvedValue([]);
    store.listRouteRevisions.mockResolvedValue([]);
    store.listTiles.mockResolvedValue([]);
    store.listReports.mockResolvedValue([]);
    store.listBestRuns.mockResolvedValue([]);
    store.deleteUserRunTokens.mockResolvedValue(0);
    store.listSubmissionDates.mockResolvedValue([]);
    store.hasSubmissionsForDate.mockResolvedValue(false);
    store.getSubmissionForDate.mockResolvedValue(undefined);
    store.getProfile.mockResolvedValue(undefined);
    store.listProfiles.mockResolvedValue([]);
    store.getUserActivity.mockResolvedValue(undefined);
    store.listInactiveUserIds.mockResolvedValue([]);
    store.listSettings.mockResolvedValue({});
    store.getSetting.mockResolvedValue('done');
    repairRoutesAfterAuthorRemoval.mockResolvedValue(0);
  });

  it('redacts identity without changing route geometry or moderation facts', () => {
    const route = routeWithAuthor();
    const redactedRoute = anonymizeRouteAuthors(route, userId);
    const redactedReport = anonymizeReportIdentity(report, userId);

    expect(redactedRoute.recipe).toEqual(route.recipe);
    expect(redactedRoute.tiles[0]?.lanes).toEqual(route.tiles[0]?.lanes);
    expect(redactedRoute.tiles[0]).toMatchObject({
      authorId: DELETED_USER_ID,
      authorName: DELETED_USER_NAME,
    });
    expect(redactedReport).toMatchObject({
      reason: 'broken-route',
      status: 'actioned',
      tileAuthorId: DELETED_USER_ID,
      reporterId: DELETED_USER_ID,
      actionedBy: DELETED_USER_ID,
    });
    expect(JSON.stringify({ route: redactedRoute, report: redactedReport })).not.toContain(userId);
  });

  it('anonymizes an inactive user while preserving playable content', async () => {
    const route = routeWithAuthor();
    const authoredTile = route.tiles[0];
    if (!authoredTile) throw new Error('Expected authored tile.');
    store.listRoutes.mockResolvedValue([route]);
    store.listRouteRevisions.mockResolvedValue([route]);
    store.listTiles.mockResolvedValue([authoredTile]);
    store.listReports.mockResolvedValue([report]);
    store.listBestRuns.mockResolvedValue([bestRun(route)]);
    store.listSubmissionDates.mockResolvedValue(['2026-07-13']);
    store.getSubmissionForDate.mockResolvedValue(authoredTile.id);
    store.getProfile.mockResolvedValue(createProfile(userId, 'User A', tenant.id));
    store.deleteUserRunTokens.mockResolvedValue(2);

    const result = await anonymizeInactiveUser(tenant, userId);

    expect(result).toMatchObject({
      mode: 'inactive-anonymization',
      tilesAnonymized: 1,
      tilesDeleted: 0,
      routesRedacted: 1,
      routeRevisionsRedacted: 1,
      reportsAnonymized: 1,
      bestRunsDeleted: 1,
      runTokensDeleted: 2,
      submissionsDeleted: 1,
      profileDeleted: true,
    });
    expect(store.deleteTile).not.toHaveBeenCalled();
    expect(store.saveTile).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: DELETED_USER_ID })
    );
    expect(store.deleteUserBestRun).toHaveBeenCalledWith(
      route.recipe.id,
      route.recipe.revision,
      userId
    );
    expect(store.deleteProfile).toHaveBeenCalledWith(userId);
    expect(store.removeUserActivity).toHaveBeenCalledWith(userId);
  });

  it('explicit deletion repairs current routes and purges revisions containing user content', async () => {
    const oldRoute = routeWithAuthor(1);
    const repaired = safeRoute(2);
    const authoredTile = oldRoute.tiles[0];
    if (!authoredTile) throw new Error('Expected authored tile.');
    store.listTiles.mockResolvedValueOnce([authoredTile]).mockResolvedValueOnce([]);
    store.listRoutes.mockResolvedValue([repaired]);
    store.listRouteRevisions.mockResolvedValue([oldRoute, repaired]);
    store.listReports.mockResolvedValue([report]);
    store.listBestRuns.mockResolvedValue([]);
    store.getProfile.mockResolvedValue(createProfile(userId, 'User A', tenant.id));
    repairRoutesAfterAuthorRemoval.mockResolvedValue(1);

    const result = await deleteUserData(tenant, userId);

    expect(result).toMatchObject({
      mode: 'explicit-deletion',
      tilesDeleted: 1,
      routeRevisionsDeleted: 1,
      routesRepaired: 1,
      reportsAnonymized: 1,
      profileDeleted: true,
    });
    expect(repairRoutesAfterAuthorRemoval).toHaveBeenCalledWith(tenant, userId);
    expect(store.deleteTile).toHaveBeenCalledWith(authoredTile.id);
    expect(store.deleteRouteRevision).toHaveBeenCalledWith(
      oldRoute.recipe.id,
      oldRoute.recipe.revision
    );
    expect(store.deleteRouteRevision).not.toHaveBeenCalledWith(
      repaired.recipe.id,
      repaired.recipe.revision
    );
  });

  it('runs deterministic bounded expiry and gives unknown existing users a grace period', async () => {
    const now = new Date('2026-07-13T12:00:00.000Z');
    store.listProfiles.mockResolvedValue([createProfile(userId, 'User A', tenant.id)]);
    store.listSubmissionDates.mockResolvedValue(['2026-05-01', '2026-07-12']);
    store.listReports.mockResolvedValue([
      report,
      { ...report, id: 'open-old', status: 'open', actionedAt: undefined, actionedBy: undefined },
    ]);
    store.listSettings.mockResolvedValue({
      'daily-post:2026-01-01': 'old-post',
      'daily-post:2026-07-12': 'new-post',
      'compiler-version': '1',
    });
    store.getSetting.mockResolvedValue(undefined);
    store.hasSubmissionsForDate.mockImplementation((dateKey: string) =>
      Promise.resolve(dateKey === '2026-07-12')
    );

    const result = await runWeeklyMaintenance(tenant, now);

    expect(result).toEqual({
      activityBackfilled: 1,
      submissionDatesBackfilled: 1,
      inactiveUsersAnonymized: 0,
      submissionDatesDeleted: 1,
      reportsDeleted: 1,
      settingsDeleted: 1,
    });
    expect(store.touchUserActivity).toHaveBeenCalledWith(userId, now.getTime());
    expect(store.indexSubmissionDate).toHaveBeenCalledWith('2026-07-12');
    expect(store.deleteSubmissionDate).toHaveBeenCalledWith('2026-05-01');
    expect(store.deleteReport).toHaveBeenCalledWith(report.id);
    expect(store.deleteReport).not.toHaveBeenCalledWith('open-old');
    expect(store.deleteSetting).toHaveBeenCalledWith('daily-post:2026-01-01');
  });

  it('does not redact malformed records from another tenant installation', async () => {
    const foreignRoute = routeWithAuthor();
    foreignRoute.recipe.tenantId = 'tenant-b';
    const foreignTile = { ...foreignRoute.tiles[0]!, tenantId: 'tenant-b' };
    const foreignReport = { ...report, tenantId: 'tenant-b' };
    store.listRoutes.mockResolvedValue([foreignRoute]);
    store.listTiles.mockResolvedValue([foreignTile]);
    store.listReports.mockResolvedValue([foreignReport]);
    store.getProfile.mockResolvedValue(createProfile(userId, 'User A', 'tenant-b'));

    const result = await anonymizeInactiveUser(tenant, userId);

    expect(result.tilesAnonymized).toBe(0);
    expect(result.routesRedacted).toBe(0);
    expect(result.reportsAnonymized).toBe(0);
    expect(result.profileDeleted).toBe(false);
    expect(store.saveTile).not.toHaveBeenCalled();
    expect(store.saveReport).not.toHaveBeenCalled();
    expect(store.deleteProfile).not.toHaveBeenCalled();
  });
});
