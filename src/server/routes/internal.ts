import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import type { MenuItemRequest, TriggerResponse, UiResponse } from '@devvit/web/shared';
import { dateKeyUtc } from '../../shared/game/seed';
import { createGamePost } from '../core/post';
import { getTenantIdentity } from '../core/identity';
import { tenantStore } from '../repositories/tenantStore';
import { ensureDailyRoute } from '../services/routeService';
import { runWeeklyMaintenance } from '../services/dataLifecycleService';

export const internal = new Hono();

const createPostOnce = async (dateKey: string) => {
  const settingKey = `daily-post:${dateKey}`;
  const existing = await tenantStore.getSetting(settingKey);
  if (existing) return { id: existing, existing: true };
  const route = await ensureDailyRoute(getTenantIdentity(), dateKey);
  const post = await createGamePost(route);
  await tenantStore.setSetting(settingKey, post.id);
  return { id: post.id, existing: false };
};

internal.post('/menu/create-post', async (c) => {
  await c.req.json<MenuItemRequest>();
  const result = await createPostOnce(dateKeyUtc());
  const response: UiResponse = {
    showToast: {
      appearance: 'success',
      text: result.existing
        ? `Today's Daily Dash post already exists (${result.id}).`
        : `Created Daily Dash post ${result.id}.`,
    },
  };
  return c.json(response);
});

internal.post('/triggers/on-app-install', async (c) => {
  try {
    await c.req.json();
    const tenant = getTenantIdentity();
    const route = await ensureDailyRoute(tenant);
    const post = await createGamePost(route);
    await tenantStore.setSetting(`daily-post:${route.recipe.dateKey}`, post.id);
    const response: TriggerResponse = {
      status: 'success',
      message: `Daily Dash installed in r/${tenant.name}; founding post ${post.id} created.`,
    };
    return c.json(response);
  } catch (caught) {
    const response: TriggerResponse = {
      status: 'error',
      message: caught instanceof Error ? caught.message : 'Install initialization failed.',
    };
    return c.json(response, 400);
  }
});

internal.post('/scheduler/compile-daily-route', async (c) => {
  await c.req.json<TaskRequest>();
  const dateKey = dateKeyUtc();
  const route = await ensureDailyRoute(getTenantIdentity(), dateKey);
  await createPostOnce(dateKey);
  const response: TaskResponse = {
    status: 'ok',
    message: `Compiled ${route.recipe.id} with ${route.tiles.length} tiles.`,
  };
  return c.json(response);
});

internal.post('/scheduler/weekly-maintenance', async (c) => {
  await c.req.json<TaskRequest>();
  const result = await runWeeklyMaintenance(getTenantIdentity());
  const response: TaskResponse = {
    status: 'ok',
    message: `Weekly maintenance anonymized ${result.inactiveUsersAnonymized} inactive users, expired ${result.submissionDatesDeleted} submission dates, ${result.reportsDeleted} reports, and ${result.settingsDeleted} post settings; backfilled ${result.activityBackfilled} activity records and ${result.submissionDatesBackfilled} submission dates.`,
  };
  return c.json(response);
});
