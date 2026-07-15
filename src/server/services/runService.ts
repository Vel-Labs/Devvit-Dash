import { randomUUID } from 'node:crypto';
import { replayRun } from '../../shared/game/replay';
import { distanceColumnsFromReplay } from '../../shared/game/runOutcome';
import { scoreRun } from '../../shared/game/scoring';
import { flattenRouteColumns } from '../../shared/game/tile';
import type { RouteBundle, RunResult, RunStart, RunSubmission } from '../../shared/game/types';
import { tenantStore } from '../repositories/tenantStore';

type StoredRunToken = {
  token: string;
  routeId: string;
  routeRevision: number;
  userId: string;
  username: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

export type FinishedRun = {
  result: RunResult;
  route: RouteBundle;
};

const parseStoredRunToken = (raw: string): StoredRunToken => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Run token payload is invalid.');
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('token' in value) ||
    typeof value.token !== 'string' ||
    !('routeId' in value) ||
    typeof value.routeId !== 'string' ||
    !('routeRevision' in value) ||
    typeof value.routeRevision !== 'number' ||
    !Number.isInteger(value.routeRevision) ||
    value.routeRevision < 1 ||
    !('userId' in value) ||
    typeof value.userId !== 'string' ||
    !('username' in value) ||
    typeof value.username !== 'string' ||
    !('issuedAtMs' in value) ||
    typeof value.issuedAtMs !== 'number' ||
    !('expiresAtMs' in value) ||
    typeof value.expiresAtMs !== 'number'
  ) {
    throw new Error('Run token payload is invalid.');
  }
  return {
    token: value.token,
    routeId: value.routeId,
    routeRevision: value.routeRevision,
    userId: value.userId,
    username: value.username,
    issuedAtMs: value.issuedAtMs,
    expiresAtMs: value.expiresAtMs,
  };
};

export const createRun = async (
  routeId: string,
  userId: string,
  username: string
): Promise<RunStart> => {
  const route = await tenantStore.getRoute(routeId);
  if (!route) throw new Error('Route not found.');
  const immutableRoute = await tenantStore.getRouteRevision(routeId, route.recipe.revision);
  if (!immutableRoute) throw new Error('Route revision could not be bound for ranked play.');
  const now = Date.now();
  const token = randomUUID();
  const stored: StoredRunToken = {
    token,
    routeId,
    routeRevision: route.recipe.revision,
    userId,
    username,
    issuedAtMs: now,
    expiresAtMs: now + 15 * 60 * 1000,
  };
  await tenantStore.saveRunToken(token, JSON.stringify(stored), userId, 15 * 60);
  return {
    token,
    routeId,
    routeRevision: stored.routeRevision,
    issuedAt: new Date(stored.issuedAtMs).toISOString(),
    expiresAt: new Date(stored.expiresAtMs).toISOString(),
  };
};

export const finishRun = async (submission: RunSubmission): Promise<FinishedRun> => {
  const raw = await tenantStore.getRunToken(submission.token);
  if (!raw) throw new Error('Run token is missing, expired, or already used.');
  const stored = parseStoredRunToken(raw);
  if (stored.token !== submission.token) throw new Error('Run token payload is invalid.');
  if (stored.routeId !== submission.routeId)
    throw new Error('Run token does not match this route.');
  if (stored.routeRevision !== submission.routeRevision) {
    throw new Error('Run token does not match this route revision.');
  }
  if (Date.now() > stored.expiresAtMs) throw new Error('Run token expired.');

  const route = await tenantStore.getRouteRevision(stored.routeId, stored.routeRevision);
  if (!route) {
    throw new Error('The immutable route revision for this run is unavailable.');
  }
  if (route.recipe.id !== stored.routeId || route.recipe.revision !== stored.routeRevision) {
    throw new Error('The stored route revision failed integrity validation.');
  }

  const serverElapsed = Date.now() - stored.issuedAtMs;
  const elapsedDelta = Math.abs(serverElapsed - submission.elapsedMs);
  if (submission.elapsedMs < 1_000 || elapsedDelta > 20_000) {
    throw new Error('Run timing failed validation.');
  }
  const replay = replayRun(flattenRouteColumns(route.tiles), submission.laneEvents ?? []);
  if (!replay.ok) throw new Error(replay.message);

  const authoritative: RunSubmission = {
    ...submission,
    routeRevision: stored.routeRevision,
    damageTaken: replay.damageTaken,
    parcelsCollected: replay.parcelsCollected,
    boostsTriggered: replay.boostsTriggered,
    completed: replay.completed,
  };

  const completedAt = new Date().toISOString();
  const result: RunResult = {
    ...authoritative,
    routeRevision: stored.routeRevision,
    userId: stored.userId,
    username: stored.username,
    score: scoreRun(authoritative),
    distanceColumns: distanceColumnsFromReplay(flattenRouteColumns(route.tiles).length, replay),
    completedAt,
  };
  if (!(await tenantStore.claimRunToken(submission.token, stored.userId))) {
    throw new Error('Run token is missing, expired, or already used.');
  }
  return { result, route };
};
