import { createProfile, evaluateAchievementUnlocks } from '../../shared/game/achievements';
import { dateKeyUtc } from '../../shared/game/seed';
import type { PlayerProfile, RouteBundle, RunResult } from '../../shared/game/types';
import { tenantStore } from '../repositories/tenantStore';

const dayNumber = (dateKey: string): number =>
  Math.floor(Date.parse(`${dateKey}T00:00:00.000Z`) / 86_400_000);

const updateStreak = (profile: PlayerProfile, dateKey: string): void => {
  if (profile.lastPlayedDateKey === dateKey) return;
  if (!profile.lastPlayedDateKey) {
    profile.stats.currentStreak = 1;
  } else {
    const difference = dayNumber(dateKey) - dayNumber(profile.lastPlayedDateKey);
    profile.stats.currentStreak = difference === 1 ? profile.stats.currentStreak + 1 : 1;
  }
  profile.stats.bestStreak = Math.max(profile.stats.bestStreak, profile.stats.currentStreak);
  profile.lastPlayedDateKey = dateKey;
};

export const getOrCreateProfile = async (
  userId: string,
  username: string,
  tenantId: string
): Promise<PlayerProfile> => {
  const existing = await tenantStore.getProfile(userId);
  if (existing) {
    existing.username = username;
    existing.tenantId = tenantId;
    // Profiles created before Route Passport did not persist these fields.
    // Start tracking from zero rather than inventing incomplete historical totals.
    existing.stats.failedDeliveries ??= 0;
    existing.stats.distanceColumnsTraveled ??= 0;
    return existing;
  }
  return createProfile(userId, username, tenantId);
};

export const reconcileFeaturedTileProgress = (
  profile: PlayerProfile,
  routes: readonly RouteBundle[]
): PlayerProfile => {
  const featuredTileIds = new Set(
    routes.flatMap((route) =>
      route.tiles
        .filter((tile) => tile.authorId === profile.userId && tile.status !== 'removed')
        .map((tile) => tile.id)
    )
  );
  profile.stats.tilesFeatured = Math.max(profile.stats.tilesFeatured, featuredTileIds.size);
  profile.unlocked = evaluateAchievementUnlocks(profile.stats, profile.unlocked);
  return profile;
};

export const recordCertifiedTile = async (
  userId: string,
  username: string,
  tenantId: string
): Promise<PlayerProfile> => {
  const profile = await getOrCreateProfile(userId, username, tenantId);
  profile.stats.tilesSubmitted += 1;
  profile.stats.tilesCertified += 1;
  profile.unlocked = evaluateAchievementUnlocks(profile.stats, profile.unlocked);
  await tenantStore.saveProfile(profile);
  return profile;
};

export const recordFeaturedTiles = async (route: RouteBundle): Promise<void> => {
  const uniqueAuthors = new Set<string>();
  const routes = await tenantStore.listRoutes();
  for (const tile of route.tiles) {
    if (tile.authorId === 'daily-dash-founders' || uniqueAuthors.has(tile.authorId)) continue;
    uniqueAuthors.add(tile.authorId);
    const profile = await tenantStore.getProfile(tile.authorId);
    if (!profile) continue;
    reconcileFeaturedTileProgress(profile, routes);
    await tenantStore.saveProfile(profile);
    await tenantStore.incrementFeatured(tile.id);
  }
};

export const recordCompletedRun = async (
  run: RunResult,
  route: RouteBundle,
  tenantId: string
): Promise<PlayerProfile> => {
  const profile = await getOrCreateProfile(run.userId, run.username, tenantId);
  profile.stats.distanceColumnsTraveled += run.distanceColumns;
  if (run.completed) {
    profile.stats.runsCompleted += 1;
    if (run.damageTaken === 0) profile.stats.cleanRuns += 1;
    if (!profile.completedRouteIds.includes(run.routeId)) {
      profile.completedRouteIds.push(run.routeId);
      profile.stats.uniqueRoutesCompleted = profile.completedRouteIds.length;
    }
    updateStreak(profile, dateKeyUtc(new Date(run.completedAt)));
  } else {
    profile.stats.failedDeliveries += 1;
  }
  profile.unlocked = evaluateAchievementUnlocks(profile.stats, profile.unlocked);
  await tenantStore.saveProfile(profile);

  const crossedAuthors = new Set<string>();
  for (const tile of route.tiles) {
    if (tile.authorId === 'daily-dash-founders' || crossedAuthors.has(tile.authorId)) continue;
    crossedAuthors.add(tile.authorId);
    const authorProfile = await tenantStore.getProfile(tile.authorId);
    if (!authorProfile) continue;
    authorProfile.stats.totalTileCrossings += 1;
    authorProfile.unlocked = evaluateAchievementUnlocks(
      authorProfile.stats,
      authorProfile.unlocked
    );
    await tenantStore.saveProfile(authorProfile);
  }
  return profile;
};
