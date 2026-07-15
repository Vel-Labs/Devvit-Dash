import type {
  AchievementDefinition,
  CourseTile,
  LeaderboardEntry,
  PlayerProfile,
  RouteBundle,
  RunResult,
  RunStart,
  RunSubmission,
  TenantIdentity,
  TileReport,
  TileReportReason,
  TileValidationResult,
} from './game/types';

export type ApiError = {
  status: 'error';
  code: string;
  message: string;
};

export type BootstrapResponse = {
  status: 'ok';
  tenant: TenantIdentity;
  username: string;
  authenticated: boolean;
  dailyRoute: RouteBundle;
  todaySubmission: CourseTile | null;
  profile: PlayerProfile | null;
  achievements: AchievementDefinition[];
  worldTourEnabled: boolean;
};

export type ValidateTileRequest = {
  tile: CourseTile;
};

export type ValidateTileResponse = {
  status: 'ok';
  validation: TileValidationResult;
};

export type SubmitTileRequest = {
  tile: CourseTile;
};

export type SubmitTileResponse = {
  status: 'ok';
  disposition: 'created' | 'updated';
  tile: CourseTile;
  validation: TileValidationResult;
};

export type RouteResponse = {
  status: 'ok';
  route: RouteBundle;
};

export type RoutesResponse = {
  status: 'ok';
  routes: RouteBundle[];
};

export type StartRunRequest = {
  routeId: string;
};

export type StartRunResponse = {
  status: 'ok';
  run: RunStart;
};

export type CompleteRunRequest = RunSubmission;

export type CompleteRunResponse = {
  status: 'ok';
  result: RunResult;
  profile: PlayerProfile;
};

export type CreatorOutcomeTile = {
  dateKey: string;
  routeRevision: number;
  tileIndex: number;
  bestRunSampleSize: number;
  cleanRouteBestRunSamples: number;
  midpointLaneChoices: {
    top: number;
    middle: number;
    bottom: number;
  };
};

export type CreatorOutcomeResponse = {
  status: 'ok';
  profile: PlayerProfile;
  creatorName: string;
  communityName: string;
  profileUrl?: string;
  dailyRoute: RouteBundle;
  featuredRouteAppearances: number;
  lifetimeRecordedCrossings: number;
  sampleScope: 'current-route-revision-best-runs-by-other-players';
  tiles: CreatorOutcomeTile[];
};

export type ReportTileRequest = {
  routeId: string;
  routeRevision: number;
  tileId: string;
  reason: TileReportReason;
};

export type ReportTileResponse = {
  status: 'ok';
  report: TileReport;
};

export type RemoveTileRequest = {
  routeId: string;
  routeRevision: number;
  reportId?: string;
};

export type RemoveTileResponse = {
  status: 'ok';
  removedTileId: string;
  repairedRoutes: number;
};

export type ProfileResponse = {
  status: 'ok';
  profile: PlayerProfile;
};

export type DeleteMyDataResponse = {
  status: 'ok';
  tilesDeleted: number;
  routeRevisionsDeleted: number;
  routesRepaired: number;
  reportsAnonymized: number;
  bestRunsDeleted: number;
  runTokensDeleted: number;
  submissionsDeleted: number;
  profileDeleted: boolean;
};

export type LeaderboardResponse = {
  status: 'ok';
  routeRevision: number;
  entries: LeaderboardEntry[];
};
