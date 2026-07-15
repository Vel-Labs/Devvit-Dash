import { DEFAULT_ROUTE_LENGTH } from '../../shared/game/constants';
import { generateRoute } from '../../shared/game/generator';
import { dateKeyUtc } from '../../shared/game/seed';
import type { RouteBundle, TenantIdentity } from '../../shared/game/types';
import { tenantStore } from '../repositories/tenantStore';
import { recordFeaturedTiles } from './profileService';

export const ensureDailyRoute = async (
  tenant: TenantIdentity,
  dateKey = dateKeyUtc()
): Promise<RouteBundle> => {
  const existingId = await tenantStore.getDailyRouteId(dateKey);
  if (existingId) {
    const existing = await tenantStore.getRoute(existingId);
    if (existing) return existing;
  }

  const communityTiles = (await tenantStore.listTiles()).filter(
    (tile) => tile.status === 'certified' || tile.status === 'featured'
  );
  const route = generateRoute({
    tenant,
    dateKey,
    communityTiles,
    length: DEFAULT_ROUTE_LENGTH,
    biomeId: biomeForDate(dateKey),
  });
  route.tiles = route.tiles.map((tile) =>
    tile.authorId === 'daily-dash-founders' ? tile : { ...tile, status: 'featured' }
  );
  await tenantStore.saveRoute(route);
  for (const tile of route.tiles) {
    if (tile.authorId !== 'daily-dash-founders') await tenantStore.saveTile(tile);
  }
  await recordFeaturedTiles(route);
  return route;
};

export const randomLocalRoute = async (tenant: TenantIdentity): Promise<RouteBundle> => {
  const routes = await tenantStore.listRoutes();
  if (routes.length === 0) return ensureDailyRoute(tenant);
  const route = routes[Math.floor(Math.random() * routes.length)];
  return route ?? ensureDailyRoute(tenant);
};

export const repairRoutesAfterTileRemoval = async (
  tenant: TenantIdentity,
  removedTileId: string
): Promise<number> => {
  const routes = await tenantStore.listRoutes();
  let repaired = 0;
  for (const route of routes) {
    const index = route.recipe.tileIds.indexOf(removedTileId);
    if (index < 0) continue;
    const communityTiles = (await tenantStore.listTiles()).filter(
      (tile) => tile.id !== removedTileId
    );
    const rebuilt = generateRoute({
      tenant,
      dateKey: route.recipe.dateKey,
      communityTiles,
      length: route.recipe.tileIds.length,
      biomeId: route.recipe.biomeId,
      seedSalt: `repair:${route.recipe.revision + 1}:${removedTileId}`,
    });
    rebuilt.recipe = {
      ...rebuilt.recipe,
      id: route.recipe.id,
      createdAt: route.recipe.createdAt,
      revision: route.recipe.revision + 1,
    };
    await tenantStore.saveRoute(rebuilt);
    repaired += 1;
  }
  return repaired;
};

export const repairRoutesAfterAuthorRemoval = async (
  tenant: TenantIdentity,
  authorId: string
): Promise<number> => {
  const routes = (await tenantStore.listRoutes()).filter(
    (route) =>
      route.recipe.tenantId === tenant.id && route.tiles.some((tile) => tile.authorId === authorId)
  );
  if (routes.length === 0) return 0;
  const communityTiles = (await tenantStore.listTiles()).filter(
    (tile) =>
      tile.tenantId === tenant.id &&
      tile.authorId !== authorId &&
      (tile.status === 'certified' || tile.status === 'featured')
  );
  for (const route of routes) {
    const rebuilt = generateRoute({
      tenant,
      dateKey: route.recipe.dateKey,
      communityTiles,
      length: route.recipe.tileIds.length,
      biomeId: route.recipe.biomeId,
      seedSalt: `privacy-removal:${route.recipe.revision + 1}`,
    });
    rebuilt.recipe = {
      ...rebuilt.recipe,
      id: route.recipe.id,
      createdAt: route.recipe.createdAt,
      revision: route.recipe.revision + 1,
    };
    await tenantStore.saveRoute(rebuilt);
  }
  return routes.length;
};

const biomeForDate = (dateKey: string): string => {
  const choices = ['meadow-postcard', 'harbor-parcel', 'autumn-rail', 'paper-city'];
  const day = Number(dateKey.replaceAll('-', ''));
  return choices[Math.abs(day) % choices.length] ?? 'meadow-postcard';
};
