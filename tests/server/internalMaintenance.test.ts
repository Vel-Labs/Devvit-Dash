import { beforeEach, describe, expect, it, vi } from 'vitest';

const runWeeklyMaintenance = vi.hoisted(() => vi.fn());

vi.mock('../../src/server/services/dataLifecycleService', () => ({ runWeeklyMaintenance }));
vi.mock('../../src/server/core/identity', () => ({
  getTenantIdentity: () => ({ id: 'tenant-a', name: 'Tenant A' }),
}));
vi.mock('../../src/server/core/post', () => ({ createGamePost: vi.fn() }));
vi.mock('../../src/server/repositories/tenantStore', () => ({
  tenantStore: { getSetting: vi.fn(), setSetting: vi.fn() },
}));
vi.mock('../../src/server/services/routeService', () => ({ ensureDailyRoute: vi.fn() }));

import { internal } from '../../src/server/routes/internal';

describe('weekly maintenance scheduler boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWeeklyMaintenance.mockResolvedValue({
      activityBackfilled: 2,
      submissionDatesBackfilled: 6,
      inactiveUsersAnonymized: 1,
      submissionDatesDeleted: 3,
      reportsDeleted: 4,
      settingsDeleted: 5,
    });
  });

  it('executes bounded lifecycle work and reports exact counts', async () => {
    const response = await internal.request('/scheduler/weekly-maintenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      message:
        'Weekly maintenance anonymized 1 inactive users, expired 3 submission dates, 4 reports, and 5 post settings; backfilled 2 activity records and 6 submission dates.',
    });
    expect(runWeeklyMaintenance).toHaveBeenCalledWith({ id: 'tenant-a', name: 'Tenant A' });
  });
});
