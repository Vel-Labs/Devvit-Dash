import { describe, expect, it } from 'vitest';
import {
  createCreatorCardModel,
  createCreatorShareSheetOptions,
  createCreatorShareText,
  formatLifetimeDistance,
} from '../../src/client/creatorCard';
import type { CreatorOutcomeResponse } from '../../src/shared/api';
import { createProfile } from '../../src/shared/game/achievements';
import { generateRoute } from '../../src/shared/game/generator';

const tenant = { id: 'private-tenant-id', name: 'DailyDashTest' };
const dailyRoute = generateRoute({ tenant, dateKey: '2026-07-15', communityTiles: [] });

const outcome = (sampleSize: number): CreatorOutcomeResponse => {
  const profile = createProfile('private-user-id', 'dashmaker', 'private-tenant-id');
  profile.stats = {
    ...profile.stats,
    runsCompleted: 4,
    cleanRuns: 2,
    failedDeliveries: 1,
    distanceColumnsTraveled: 144,
    uniqueRoutesCompleted: 3,
    bestStreak: 2,
    tilesCertified: 1,
    tilesFeatured: 3,
    totalTileCrossings: 27,
  };
  return {
    status: 'ok',
    profile,
    creatorName: 'dashmaker',
    communityName: 'DailyDashTest',
    profileUrl: 'https://www.reddit.com/user/dashmaker/',
    dailyRoute,
    featuredRouteAppearances: 3,
    lifetimeRecordedCrossings: 27,
    sampleScope: 'current-route-revision-best-runs-by-other-players',
    tiles: [
      {
        dateKey: '2026-07-13',
        routeRevision: 4,
        tileIndex: 2,
        bestRunSampleSize: sampleSize,
        cleanRouteBestRunSamples: sampleSize === 0 ? 0 : 9,
        midpointLaneChoices: { top: 4, middle: 5, bottom: 2 },
      },
    ],
  };
};

describe('creator share card model', () => {
  it('derives the four-metric Route Passport without private identifiers', () => {
    const model = createCreatorCardModel(outcome(11));
    expect(model).toMatchObject({
      creatorLabel: 'u/dashmaker',
      communityLabel: 'r/DailyDashTest',
      profileUrl: 'https://www.reddit.com/user/dashmaker/',
      dailyRouteDateKey: '2026-07-15',
      distanceColumnsTraveled: 144,
      distanceLabel: '1.44 KM',
      featuredTiles: 3,
      cleanDeliveries: 2,
      failedDeliveries: 1,
    });
    const text = createCreatorShareText(model);
    expect(text).toContain('1.44 km traveled');
    expect(text).toContain('3 featured tiles');
    expect(text).toContain('2 clean deliveries');
    expect(text).toContain('1 failed delivery');
    expect(text).toContain('Ride the 2026-07-15 Daily Route from this post');
    expect(text).not.toContain('private-user-id');
    expect(text).not.toContain('private-tenant-id');
    expect(text.length).toBeLessThanOrEqual(1_024);
    expect(createCreatorShareSheetOptions(model)).toEqual({
      title: 'My Daily Dash Route Passport',
      text,
      data: text,
    });
  });

  it('formats canonical route columns as game-world kilometers', () => {
    expect(formatLifetimeDistance(0)).toBe('0 KM');
    expect(formatLifetimeDistance(1)).toBe('0.01 KM');
    expect(formatLifetimeDistance(144)).toBe('1.44 KM');
    expect(formatLifetimeDistance(1_440)).toBe('14.4 KM');
    expect(formatLifetimeDistance(-10)).toBe('0 KM');
  });

  it('does not depend on a current featured-tile outcome sample', () => {
    const model = createCreatorCardModel({ ...outcome(1), tiles: [] });
    expect(model).toMatchObject({
      featuredTiles: 3,
      cleanDeliveries: 2,
      failedDeliveries: 1,
      distanceLabel: '1.44 KM',
      dailyRouteDateKey: '2026-07-15',
    });
  });
});
