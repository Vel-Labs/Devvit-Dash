import { context, reddit } from '@devvit/web/server';
import type { TenantIdentity } from '../../shared/game/types';
import { tenantStore } from '../repositories/tenantStore';

export const getTenantIdentity = (): TenantIdentity => {
  const name = context.subredditName ?? 'daily-dash-playtest';
  const id = context.subredditId ?? name.toLowerCase();
  return { id, name };
};

export const getCurrentPlayer = async (): Promise<{
  userId: string;
  username: string;
  authenticated: boolean;
  profileUrl?: string;
}> => {
  let currentUser: Awaited<ReturnType<typeof reddit.getCurrentUser>>;
  try {
    currentUser = await reddit.getCurrentUser();
  } catch {
    currentUser = undefined;
  }
  const username = currentUser?.username ?? (await reddit.getCurrentUsername()) ?? 'anonymous';
  const userId = context.userId ?? `anonymous:${context.postId ?? 'post'}`;
  const authenticated = Boolean(context.userId && username !== 'anonymous');
  if (authenticated) await tenantStore.touchUserActivity(userId);
  return {
    userId,
    username,
    authenticated,
    ...(currentUser?.url ? { profileUrl: currentUser.url } : {}),
  };
};

export const isCurrentPlayerModerator = async (username: string): Promise<boolean> => {
  const tenant = getTenantIdentity();
  try {
    const moderators = await reddit
      .getModerators({ subredditName: tenant.name, username, limit: 1, pageSize: 1 })
      .get(1);
    return moderators.some(
      (moderator) => moderator.username.toLowerCase() === username.toLowerCase()
    );
  } catch {
    return false;
  }
};
