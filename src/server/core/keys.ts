const PREFIX = 'dd:v1';

export const KEYS = {
  tiles: `${PREFIX}:tiles`,
  routes: `${PREFIX}:routes`,
  routeRevisions: (routeId: string): string => `${PREFIX}:route-revisions:${routeId}`,
  dailyRoutes: `${PREFIX}:daily-routes`,
  profiles: `${PREFIX}:profiles`,
  userActivity: `${PREFIX}:user-activity`,
  submissionDates: `${PREFIX}:submission-dates`,
  routeIndex: `${PREFIX}:route-index`,
  reportIndex: `${PREFIX}:report-index`,
  reports: `${PREFIX}:reports`,
  featuredCounts: `${PREFIX}:featured-counts`,
  settings: `${PREFIX}:settings`,
  submissionsForDate: (dateKey: string): string => `${PREFIX}:submissions:${dateKey}`,
  leaderboard: (routeId: string, revision: number): string =>
    `${PREFIX}:leaderboard:${routeId}:rev:${revision}`,
  bestRuns: (routeId: string, revision: number): string =>
    `${PREFIX}:best-runs:${routeId}:rev:${revision}`,
  runToken: (token: string): string => `${PREFIX}:run-token:${token}`,
  userRunTokens: (userId: string): string => `${PREFIX}:user-run-tokens:${userId}`,
} as const;
