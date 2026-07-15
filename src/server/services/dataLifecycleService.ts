import type { CourseTile, RouteBundle, TenantIdentity, TileReport } from '../../shared/game/types';
import { tenantStore } from '../repositories/tenantStore';
import { repairRoutesAfterAuthorRemoval } from './routeService';

export const DATA_LIFECYCLE = {
  inactiveIdentityDays: 30,
  submissionDays: 35,
  actionedReportDays: 180,
  dailyPostSettingDays: 90,
  inactiveUserBatch: 10,
  reportDeleteBatch: 100,
  submissionIndexMigrationDays: 90,
} as const;

export const DELETED_USER_ID = 'deleted-user';
export const DELETED_USER_NAME = 'Deleted player';
const SYSTEM_AUTHOR_ID = 'daily-dash-founders';
const DAY_MS = 86_400_000;

export type UserLifecycleResult = {
  userId: string;
  mode: 'inactive-anonymization' | 'explicit-deletion';
  tilesAnonymized: number;
  tilesDeleted: number;
  routesRedacted: number;
  routeRevisionsRedacted: number;
  routeRevisionsDeleted: number;
  routesRepaired: number;
  reportsAnonymized: number;
  bestRunsDeleted: number;
  runTokensDeleted: number;
  submissionsDeleted: number;
  profileDeleted: boolean;
};

export type MaintenanceResult = {
  activityBackfilled: number;
  submissionDatesBackfilled: number;
  inactiveUsersAnonymized: number;
  submissionDatesDeleted: number;
  reportsDeleted: number;
  settingsDeleted: number;
};

export const anonymizeTileAuthor = (tile: CourseTile, userId: string): CourseTile =>
  tile.authorId === userId
    ? { ...tile, authorId: DELETED_USER_ID, authorName: DELETED_USER_NAME }
    : tile;

export const anonymizeRouteAuthors = (route: RouteBundle, userId: string): RouteBundle => {
  let changed = false;
  const tiles = route.tiles.map((tile) => {
    const next = anonymizeTileAuthor(tile, userId);
    if (next !== tile) changed = true;
    return next;
  });
  return changed ? { ...route, tiles } : route;
};

export const anonymizeReportIdentity = (report: TileReport, userId: string): TileReport => {
  let changed = false;
  let next = report;
  if (report.tileAuthorId === userId) {
    changed = true;
    next = {
      ...next,
      tileAuthorId: DELETED_USER_ID,
      tileAuthorName: DELETED_USER_NAME,
    };
  }
  if (report.reporterId === userId) {
    changed = true;
    next = {
      ...next,
      reporterId: DELETED_USER_ID,
      reporterName: DELETED_USER_NAME,
    };
  }
  if (report.actionedBy === userId) {
    changed = true;
    next = { ...next, actionedBy: DELETED_USER_ID };
  }
  return changed ? next : report;
};

const listTenantRouteRevisions = async (
  tenantId: string
): Promise<Array<{ route: RouteBundle; revisions: RouteBundle[] }>> => {
  const routes = (await tenantStore.listRoutes()).filter(
    (route) => route.recipe.tenantId === tenantId
  );
  return await Promise.all(
    routes.map(async (route) => ({
      route,
      revisions: (await tenantStore.listRouteRevisions(route.recipe.id)).filter(
        (revision) => revision.recipe.tenantId === tenantId
      ),
    }))
  );
};

const clearPersonalRecords = async (
  tenantId: string,
  userId: string,
  routeRecords: Array<{ route: RouteBundle; revisions: RouteBundle[] }>
): Promise<
  Pick<
    UserLifecycleResult,
    'bestRunsDeleted' | 'runTokensDeleted' | 'submissionsDeleted' | 'profileDeleted'
  >
> => {
  let bestRunsDeleted = 0;
  for (const { route, revisions } of routeRecords) {
    const revisionNumbers = new Set<number>(
      Array.from({ length: route.recipe.revision }, (_, index) => index + 1)
    );
    for (const revision of revisions) revisionNumbers.add(revision.recipe.revision);
    for (const revision of revisionNumbers) {
      const hadRun = (await tenantStore.listBestRuns(route.recipe.id, revision)).some(
        (run) => run.userId === userId
      );
      if (!hadRun) continue;
      await tenantStore.deleteUserBestRun(route.recipe.id, revision, userId);
      bestRunsDeleted += 1;
    }
  }

  let submissionsDeleted = 0;
  for (const dateKey of await tenantStore.listSubmissionDates()) {
    if (await tenantStore.getSubmissionForDate(dateKey, userId)) submissionsDeleted += 1;
    await tenantStore.removeUserSubmission(dateKey, userId);
  }

  const profile = await tenantStore.getProfile(userId);
  const profileDeleted = profile?.tenantId === tenantId;
  if (profileDeleted) await tenantStore.deleteProfile(userId);
  const runTokensDeleted = await tenantStore.deleteUserRunTokens(userId);
  await tenantStore.removeUserActivity(userId);
  return { bestRunsDeleted, runTokensDeleted, submissionsDeleted, profileDeleted };
};

const redactIdentityReferences = async (
  tenantId: string,
  userId: string,
  routeRecords: Array<{ route: RouteBundle; revisions: RouteBundle[] }>
): Promise<
  Pick<
    UserLifecycleResult,
    'tilesAnonymized' | 'routesRedacted' | 'routeRevisionsRedacted' | 'reportsAnonymized'
  >
> => {
  let tilesAnonymized = 0;
  for (const tile of await tenantStore.listTiles()) {
    if (tile.tenantId !== tenantId || tile.authorId !== userId) continue;
    await tenantStore.saveTile(anonymizeTileAuthor(tile, userId));
    tilesAnonymized += 1;
  }

  let routesRedacted = 0;
  let routeRevisionsRedacted = 0;
  for (const { route, revisions } of routeRecords) {
    const current = anonymizeRouteAuthors(route, userId);
    if (current !== route) {
      await tenantStore.replaceCurrentRouteForPrivacy(current);
      routesRedacted += 1;
    }
    for (const revision of revisions) {
      const redacted = anonymizeRouteAuthors(revision, userId);
      if (redacted === revision) continue;
      await tenantStore.replaceRouteRevisionForPrivacy(redacted);
      routeRevisionsRedacted += 1;
    }
  }

  let reportsAnonymized = 0;
  for (const report of await tenantStore.listReports()) {
    if (report.tenantId !== tenantId) continue;
    const redacted = anonymizeReportIdentity(report, userId);
    if (redacted === report) continue;
    await tenantStore.saveReport(redacted);
    reportsAnonymized += 1;
  }
  return { tilesAnonymized, routesRedacted, routeRevisionsRedacted, reportsAnonymized };
};

export const anonymizeInactiveUser = async (
  tenant: TenantIdentity,
  userId: string
): Promise<UserLifecycleResult> => {
  const routeRecords = await listTenantRouteRevisions(tenant.id);
  const redacted = await redactIdentityReferences(tenant.id, userId, routeRecords);
  const cleared = await clearPersonalRecords(tenant.id, userId, routeRecords);
  return {
    userId,
    mode: 'inactive-anonymization',
    ...redacted,
    ...cleared,
    tilesDeleted: 0,
    routeRevisionsDeleted: 0,
    routesRepaired: 0,
  };
};

export const deleteUserData = async (
  tenant: TenantIdentity,
  userId: string
): Promise<UserLifecycleResult> => {
  const authoredTiles = (await tenantStore.listTiles()).filter(
    (tile) => tile.tenantId === tenant.id && tile.authorId === userId
  );
  const routesRepaired = await repairRoutesAfterAuthorRemoval(tenant, userId);
  for (const tile of authoredTiles) await tenantStore.deleteTile(tile.id);

  const routeRecords = await listTenantRouteRevisions(tenant.id);
  let routeRevisionsDeleted = 0;
  const survivingRouteRecords: Array<{ route: RouteBundle; revisions: RouteBundle[] }> = [];
  for (const record of routeRecords) {
    const survivingRevisions: RouteBundle[] = [];
    for (const revision of record.revisions) {
      if (revision.tiles.some((tile) => tile.authorId === userId)) {
        await tenantStore.deleteRouteRevision(revision.recipe.id, revision.recipe.revision);
        routeRevisionsDeleted += 1;
      } else {
        survivingRevisions.push(revision);
      }
    }
    survivingRouteRecords.push({ route: record.route, revisions: survivingRevisions });
  }

  const redacted = await redactIdentityReferences(tenant.id, userId, survivingRouteRecords);
  const cleared = await clearPersonalRecords(tenant.id, userId, survivingRouteRecords);
  return {
    userId,
    mode: 'explicit-deletion',
    ...redacted,
    ...cleared,
    tilesDeleted: authoredTiles.length,
    routeRevisionsDeleted,
    routesRepaired,
  };
};

const collectKnownUserIds = async (tenantId: string): Promise<Set<string>> => {
  const ids = new Set<string>();
  const add = (id: string | undefined): void => {
    if (!id || id === SYSTEM_AUTHOR_ID || id === DELETED_USER_ID || id.startsWith('anonymous:'))
      return;
    ids.add(id);
  };
  for (const profile of await tenantStore.listProfiles()) {
    if (profile.tenantId === tenantId) add(profile.userId);
  }
  for (const tile of await tenantStore.listTiles()) {
    if (tile.tenantId === tenantId) add(tile.authorId);
  }
  for (const report of await tenantStore.listReports()) {
    if (report.tenantId !== tenantId) continue;
    add(report.tileAuthorId);
    add(report.reporterId);
    add(report.actionedBy);
  }
  for (const { route, revisions } of await listTenantRouteRevisions(tenantId)) {
    const revisionNumbers = new Set<number>(
      Array.from({ length: route.recipe.revision }, (_, index) => index + 1)
    );
    for (const revision of revisions) revisionNumbers.add(revision.recipe.revision);
    for (const revision of revisionNumbers) {
      for (const run of await tenantStore.listBestRuns(route.recipe.id, revision)) add(run.userId);
    }
  }
  return ids;
};

const dateKeyDaysAgo = (nowMs: number, daysAgo: number): string =>
  new Date(nowMs - daysAgo * DAY_MS).toISOString().slice(0, 10);

const backfillSubmissionDateIndex = async (nowMs: number): Promise<number> => {
  const migrationKey = 'lifecycle:submission-index-v1';
  if (await tenantStore.getSetting(migrationKey)) return 0;
  let backfilled = 0;
  for (let daysAgo = 0; daysAgo < DATA_LIFECYCLE.submissionIndexMigrationDays; daysAgo += 1) {
    const dateKey = dateKeyDaysAgo(nowMs, daysAgo);
    if (!(await tenantStore.hasSubmissionsForDate(dateKey))) continue;
    await tenantStore.indexSubmissionDate(dateKey);
    backfilled += 1;
  }
  await tenantStore.setSetting(migrationKey, new Date(nowMs).toISOString());
  return backfilled;
};

const expireSubmissionDates = async (nowMs: number): Promise<number> => {
  const cutoff = nowMs - DATA_LIFECYCLE.submissionDays * DAY_MS;
  let deleted = 0;
  for (const dateKey of await tenantStore.listSubmissionDates()) {
    const dateMs = Date.parse(`${dateKey}T00:00:00.000Z`);
    if (!Number.isFinite(dateMs) || dateMs > cutoff) continue;
    await tenantStore.deleteSubmissionDate(dateKey);
    deleted += 1;
  }
  return deleted;
};

const expireActionedReports = async (tenantId: string, nowMs: number): Promise<number> => {
  const cutoff = nowMs - DATA_LIFECYCLE.actionedReportDays * DAY_MS;
  const expired = (await tenantStore.listReports())
    .filter(
      (report) =>
        report.tenantId === tenantId &&
        report.status === 'actioned' &&
        Date.parse(report.actionedAt ?? report.createdAt) <= cutoff
    )
    .slice(0, DATA_LIFECYCLE.reportDeleteBatch);
  for (const report of expired) await tenantStore.deleteReport(report.id);
  return expired.length;
};

const expireDailyPostSettings = async (nowMs: number): Promise<number> => {
  const cutoff = nowMs - DATA_LIFECYCLE.dailyPostSettingDays * DAY_MS;
  let deleted = 0;
  for (const name of Object.keys(await tenantStore.listSettings())) {
    if (!name.startsWith('daily-post:')) continue;
    const dateMs = Date.parse(`${name.slice('daily-post:'.length)}T00:00:00.000Z`);
    if (!Number.isFinite(dateMs) || dateMs > cutoff) continue;
    await tenantStore.deleteSetting(name);
    deleted += 1;
  }
  return deleted;
};

export const runWeeklyMaintenance = async (
  tenant: TenantIdentity,
  now = new Date()
): Promise<MaintenanceResult> => {
  const nowMs = now.getTime();
  const submissionDatesBackfilled = await backfillSubmissionDateIndex(nowMs);
  let activityBackfilled = 0;
  for (const userId of await collectKnownUserIds(tenant.id)) {
    if (typeof (await tenantStore.getUserActivity(userId)) === 'number') continue;
    await tenantStore.touchUserActivity(userId, nowMs);
    activityBackfilled += 1;
  }

  const cutoff = nowMs - DATA_LIFECYCLE.inactiveIdentityDays * DAY_MS;
  const inactiveUserIds = await tenantStore.listInactiveUserIds(
    cutoff,
    DATA_LIFECYCLE.inactiveUserBatch
  );
  for (const userId of inactiveUserIds) await anonymizeInactiveUser(tenant, userId);

  const [submissionDatesDeleted, reportsDeleted, settingsDeleted] = await Promise.all([
    expireSubmissionDates(nowMs),
    expireActionedReports(tenant.id, nowMs),
    expireDailyPostSettings(nowMs),
  ]);
  return {
    activityBackfilled,
    submissionDatesBackfilled,
    inactiveUsersAnonymized: inactiveUserIds.length,
    submissionDatesDeleted,
    reportsDeleted,
    settingsDeleted,
  };
};
