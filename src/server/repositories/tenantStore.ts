import { redis } from '@devvit/web/server';
import { KEYS } from '../core/keys';
import type {
  CourseTile,
  PlayerProfile,
  RouteBundle,
  RunResult,
  TileReport,
} from '../../shared/game/types';

const parse = <T>(value: string | undefined): T | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const parseRecord = <T>(record: Record<string, string> | undefined): T[] =>
  Object.values(record ?? {}).flatMap((value) => {
    const parsed = parse<T>(value);
    return parsed ? [parsed] : [];
  });

export const tenantStore = {
  async getTile(id: string): Promise<CourseTile | undefined> {
    return parse<CourseTile>(await redis.hGet(KEYS.tiles, id));
  },

  async listTiles(): Promise<CourseTile[]> {
    return parseRecord<CourseTile>(await redis.hGetAll(KEYS.tiles));
  },

  async saveTile(tile: CourseTile): Promise<void> {
    await redis.hSet(KEYS.tiles, { [tile.id]: JSON.stringify(tile) });
  },

  async removeTile(id: string): Promise<void> {
    const tile = await this.getTile(id);
    if (!tile) return;
    await this.saveTile({ ...tile, status: 'removed', updatedAt: new Date().toISOString() });
  },

  async deleteTile(id: string): Promise<void> {
    await redis.hDel(KEYS.tiles, [id]);
    await redis.hDel(KEYS.featuredCounts, [id]);
  },

  async getRoute(id: string): Promise<RouteBundle | undefined> {
    return parse<RouteBundle>(await redis.hGet(KEYS.routes, id));
  },

  async getRouteRevision(id: string, revision: number): Promise<RouteBundle | undefined> {
    const field = String(revision);
    const stored = parse<RouteBundle>(await redis.hGet(KEYS.routeRevisions(id), field));
    if (stored) return stored;

    // Migration bridge: a pre-snapshot current route is safe to backfill only
    // when its embedded revision is the exact revision requested.
    const current = await this.getRoute(id);
    if (!current || current.recipe.revision !== revision) return undefined;
    await redis.hSetNX(KEYS.routeRevisions(id), field, JSON.stringify(current));
    return current;
  },

  async listRoutes(): Promise<RouteBundle[]> {
    return parseRecord<RouteBundle>(await redis.hGetAll(KEYS.routes));
  },

  async listRouteRevisions(id: string): Promise<RouteBundle[]> {
    return parseRecord<RouteBundle>(await redis.hGetAll(KEYS.routeRevisions(id)));
  },

  async replaceCurrentRouteForPrivacy(route: RouteBundle): Promise<void> {
    await redis.hSet(KEYS.routes, { [route.recipe.id]: JSON.stringify(route) });
  },

  async replaceRouteRevisionForPrivacy(route: RouteBundle): Promise<void> {
    await redis.hSet(KEYS.routeRevisions(route.recipe.id), {
      [String(route.recipe.revision)]: JSON.stringify(route),
    });
  },

  async deleteRouteRevision(id: string, revision: number): Promise<void> {
    await redis.hDel(KEYS.routeRevisions(id), [String(revision)]);
    await redis.del(KEYS.bestRuns(id, revision), KEYS.leaderboard(id, revision));
  },

  async saveRoute(route: RouteBundle): Promise<void> {
    const serialized = JSON.stringify(route);
    const revisionKey = KEYS.routeRevisions(route.recipe.id);
    const revisionField = String(route.recipe.revision);
    const inserted = await redis.hSetNX(revisionKey, revisionField, serialized);
    if (inserted === 0) {
      const existing = await redis.hGet(revisionKey, revisionField);
      if (existing !== serialized) {
        throw new Error(`Route revision ${route.recipe.id}@${route.recipe.revision} is immutable.`);
      }
    }
    await redis.hSet(KEYS.routes, { [route.recipe.id]: serialized });
    await redis.zAdd(KEYS.routeIndex, {
      member: route.recipe.id,
      score: Date.parse(route.recipe.createdAt),
    });
    await redis.hSet(KEYS.dailyRoutes, { [route.recipe.dateKey]: route.recipe.id });
  },

  async getDailyRouteId(dateKey: string): Promise<string | undefined> {
    return await redis.hGet(KEYS.dailyRoutes, dateKey);
  },

  async getProfile(userId: string): Promise<PlayerProfile | undefined> {
    return parse<PlayerProfile>(await redis.hGet(KEYS.profiles, userId));
  },

  async saveProfile(profile: PlayerProfile): Promise<void> {
    await redis.hSet(KEYS.profiles, { [profile.userId]: JSON.stringify(profile) });
  },

  async deleteProfile(userId: string): Promise<void> {
    await redis.hDel(KEYS.profiles, [userId]);
  },

  async listProfiles(): Promise<PlayerProfile[]> {
    return parseRecord<PlayerProfile>(await redis.hGetAll(KEYS.profiles));
  },

  async getSubmissionForDate(dateKey: string, userId: string): Promise<string | undefined> {
    return await redis.hGet(KEYS.submissionsForDate(dateKey), userId);
  },

  async saveSubmissionForDate(dateKey: string, userId: string, tileId: string): Promise<void> {
    await redis.hSet(KEYS.submissionsForDate(dateKey), { [userId]: tileId });
    await redis.zAdd(KEYS.submissionDates, {
      member: dateKey,
      score: Date.parse(`${dateKey}T00:00:00.000Z`),
    });
  },

  async listSubmissionDates(): Promise<string[]> {
    return (await redis.zRange(KEYS.submissionDates, 0, -1, { by: 'rank' })).map(
      ({ member }) => member
    );
  },

  async hasSubmissionsForDate(dateKey: string): Promise<boolean> {
    return (await redis.hLen(KEYS.submissionsForDate(dateKey))) > 0;
  },

  async indexSubmissionDate(dateKey: string): Promise<void> {
    await redis.zAdd(KEYS.submissionDates, {
      member: dateKey,
      score: Date.parse(`${dateKey}T00:00:00.000Z`),
    });
  },

  async removeUserSubmission(dateKey: string, userId: string): Promise<void> {
    await redis.hDel(KEYS.submissionsForDate(dateKey), [userId]);
  },

  async deleteSubmissionDate(dateKey: string): Promise<void> {
    await redis.del(KEYS.submissionsForDate(dateKey));
    await redis.zRem(KEYS.submissionDates, [dateKey]);
  },

  async touchUserActivity(userId: string, touchedAtMs = Date.now()): Promise<void> {
    await redis.zAdd(KEYS.userActivity, { member: userId, score: touchedAtMs });
  },

  async getUserActivity(userId: string): Promise<number | undefined> {
    return await redis.zScore(KEYS.userActivity, userId);
  },

  async listInactiveUserIds(cutoffMs: number, limit: number): Promise<string[]> {
    return (
      await redis.zRange(KEYS.userActivity, '-inf', cutoffMs, {
        by: 'score',
        limit: { offset: 0, count: limit },
      })
    ).map(({ member }) => member);
  },

  async removeUserActivity(userId: string): Promise<void> {
    await redis.zRem(KEYS.userActivity, [userId]);
  },

  async saveRunToken(
    token: string,
    payload: string,
    userId: string,
    ttlSeconds = 900
  ): Promise<void> {
    const key = KEYS.runToken(token);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const result = await redis.set(key, payload, { nx: true, expiration: expiresAt });
    if (result !== 'OK') throw new Error('Run token collision.');
    await redis.hSet(KEYS.userRunTokens(userId), { [token]: '1' });
    await redis.expire(KEYS.userRunTokens(userId), ttlSeconds);
  },

  async getRunToken(token: string): Promise<string | undefined> {
    return await redis.get(KEYS.runToken(token));
  },

  async claimRunToken(token: string, userId: string): Promise<boolean> {
    const key = KEYS.runToken(token);
    const transaction = await redis.watch(key);
    if (!(await redis.get(key))) {
      await transaction.unwatch();
      return false;
    }
    await transaction.multi();
    await transaction.del(key);
    await transaction.hDel(KEYS.userRunTokens(userId), [token]);
    const result = await transaction.exec();
    return result[0] === 1;
  },

  async deleteUserRunTokens(userId: string): Promise<number> {
    const indexKey = KEYS.userRunTokens(userId);
    const tokens = await redis.hKeys(indexKey);
    if (tokens.length > 0) await redis.del(...tokens.map((token) => KEYS.runToken(token)));
    await redis.del(indexKey);
    return tokens.length;
  },

  async saveBestRun(routeId: string, revision: number, run: RunResult): Promise<void> {
    const existingRaw = await redis.hGet(KEYS.bestRuns(routeId, revision), run.userId);
    const existing = parse<RunResult>(existingRaw);
    if (!existing || run.score > existing.score) {
      await redis.hSet(KEYS.bestRuns(routeId, revision), { [run.userId]: JSON.stringify(run) });
      await redis.zAdd(KEYS.leaderboard(routeId, revision), {
        member: run.userId,
        score: run.score,
      });
    }
  },

  async listBestRuns(routeId: string, revision: number): Promise<RunResult[]> {
    return parseRecord<RunResult>(await redis.hGetAll(KEYS.bestRuns(routeId, revision)));
  },

  async deleteUserBestRun(routeId: string, revision: number, userId: string): Promise<void> {
    await redis.hDel(KEYS.bestRuns(routeId, revision), [userId]);
    await redis.zRem(KEYS.leaderboard(routeId, revision), [userId]);
  },

  async getReport(id: string): Promise<TileReport | undefined> {
    return parse<TileReport>(await redis.hGet(KEYS.reports, id));
  },

  async saveReport(report: TileReport): Promise<void> {
    await redis.hSet(KEYS.reports, { [report.id]: JSON.stringify(report) });
    await redis.zAdd(KEYS.reportIndex, {
      member: report.id,
      score: Date.parse(report.createdAt),
    });
  },

  async listReports(): Promise<TileReport[]> {
    return parseRecord<TileReport>(await redis.hGetAll(KEYS.reports));
  },

  async deleteReport(id: string): Promise<void> {
    await redis.hDel(KEYS.reports, [id]);
    await redis.zRem(KEYS.reportIndex, [id]);
  },

  async actionReportsForTile(
    tileId: string,
    actionedAt: string,
    actionedBy: string
  ): Promise<void> {
    const reports = parseRecord<TileReport>(await redis.hGetAll(KEYS.reports));
    const updates = Object.fromEntries(
      reports
        .filter((report) => report.tileId === tileId && report.status === 'open')
        .map((report) => [
          report.id,
          JSON.stringify({ ...report, status: 'actioned', actionedAt, actionedBy }),
        ])
    );
    if (Object.keys(updates).length > 0) await redis.hSet(KEYS.reports, updates);
  },

  async incrementFeatured(tileId: string): Promise<number> {
    return await redis.hIncrBy(KEYS.featuredCounts, tileId, 1);
  },

  async getSetting(name: string): Promise<string | undefined> {
    return await redis.hGet(KEYS.settings, name);
  },

  async setSetting(name: string, value: string): Promise<void> {
    await redis.hSet(KEYS.settings, { [name]: value });
  },

  async listSettings(): Promise<Record<string, string>> {
    return await redis.hGetAll(KEYS.settings);
  },

  async deleteSetting(name: string): Promise<void> {
    await redis.hDel(KEYS.settings, [name]);
  },
};
