import type {
  ApiError,
  BootstrapResponse,
  CompleteRunRequest,
  CompleteRunResponse,
  CreatorOutcomeResponse,
  DeleteMyDataResponse,
  LeaderboardResponse,
  RemoveTileRequest,
  RemoveTileResponse,
  ReportTileRequest,
  ReportTileResponse,
  RouteResponse,
  RoutesResponse,
  StartRunResponse,
  SubmitTileRequest,
  SubmitTileResponse,
} from '../../shared/api';
import type { CourseTile } from '../../shared/game/types';

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const rawBody = await response.text();
  let body: T | ApiError;
  try {
    body = JSON.parse(rawBody) as T | ApiError;
  } catch {
    throw new Error(
      response.ok ? 'Server returned an unreadable response.' : 'Server unavailable.'
    );
  }
  if (
    !response.ok ||
    (typeof body === 'object' && body !== null && 'status' in body && body.status === 'error')
  ) {
    const error = body as ApiError;
    throw new Error(error.message ?? `Request failed with ${response.status}.`);
  }
  return body as T;
};

export const apiClient = {
  bootstrap: (): Promise<BootstrapResponse> => requestJson('/api/bootstrap'),
  dailyRoute: (): Promise<RouteResponse> => requestJson('/api/routes/daily'),
  routes: (): Promise<RoutesResponse> => requestJson('/api/routes'),
  randomRoute: (): Promise<RouteResponse> => requestJson('/api/routes/random'),
  creatorOutcome: (): Promise<CreatorOutcomeResponse> => requestJson('/api/creator/outcome'),
  deleteMyData: (): Promise<DeleteMyDataResponse> =>
    requestJson('/api/profile', { method: 'DELETE' }),
  submitTile: (tile: CourseTile): Promise<SubmitTileResponse> =>
    requestJson('/api/tiles', {
      method: 'POST',
      body: JSON.stringify({ tile } satisfies SubmitTileRequest),
    }),
  startRun: (routeId: string): Promise<StartRunResponse> =>
    requestJson('/api/runs/start', {
      method: 'POST',
      body: JSON.stringify({ routeId }),
    }),
  completeRun: (run: CompleteRunRequest): Promise<CompleteRunResponse> =>
    requestJson('/api/runs/complete', {
      method: 'POST',
      body: JSON.stringify(run),
    }),
  leaderboard: (routeId: string, routeRevision?: number): Promise<LeaderboardResponse> => {
    const query =
      typeof routeRevision === 'number' ? `?revision=${encodeURIComponent(routeRevision)}` : '';
    return requestJson(`/api/leaderboards/${encodeURIComponent(routeId)}${query}`);
  },
  reportTile: (report: ReportTileRequest): Promise<ReportTileResponse> =>
    requestJson('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    }),
  removeRouteTile: (tileId: string, request: RemoveTileRequest): Promise<RemoveTileResponse> =>
    requestJson(`/api/moderation/tiles/${encodeURIComponent(tileId)}/remove`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
};
