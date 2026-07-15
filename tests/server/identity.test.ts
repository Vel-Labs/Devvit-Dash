import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({
  context: {
    subredditName: 'tenant-a',
    subredditId: 't5_tenant-a',
    userId: 'user-a' as string | undefined,
    postId: 'post-a',
  },
  reddit: {
    getCurrentUser: vi.fn(),
    getCurrentUsername: vi.fn(),
    getModerators: vi.fn(),
  },
}));

const touchUserActivity = vi.hoisted(() => vi.fn());

vi.mock('@devvit/web/server', () => server);
vi.mock('../../src/server/repositories/tenantStore', () => ({
  tenantStore: { touchUserActivity },
}));

import { getCurrentPlayer } from '../../src/server/core/identity';

describe('authenticated activity tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.context.userId = 'user-a';
    server.reddit.getCurrentUser.mockResolvedValue(undefined);
    server.reddit.getCurrentUsername.mockResolvedValue('User A');
  });

  it('returns the typed Reddit profile URL when the current user is available', async () => {
    server.reddit.getCurrentUser.mockResolvedValue({
      username: 'User A',
      url: 'https://www.reddit.com/user/User_A/',
    });

    await expect(getCurrentPlayer()).resolves.toEqual({
      userId: 'user-a',
      username: 'User A',
      authenticated: true,
      profileUrl: 'https://www.reddit.com/user/User_A/',
    });
  });

  it('touches the server-derived authenticated user id', async () => {
    await expect(getCurrentPlayer()).resolves.toEqual({
      userId: 'user-a',
      username: 'User A',
      authenticated: true,
    });
    expect(touchUserActivity).toHaveBeenCalledWith('user-a');
  });

  it('does not retain activity for anonymous practice', async () => {
    server.context.userId = undefined;
    server.reddit.getCurrentUsername.mockResolvedValue(undefined);

    await expect(getCurrentPlayer()).resolves.toEqual({
      userId: 'anonymous:post-a',
      username: 'anonymous',
      authenticated: false,
    });
    expect(touchUserActivity).not.toHaveBeenCalled();
  });
});
