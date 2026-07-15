import { describe, expect, it } from 'vitest';
import { medalForScore, scoreRun } from '../../src/shared/game/scoring';

describe('runner scoring', () => {
  it('scores completed runs and never scores failures', () => {
    expect(
      scoreRun({
        routeId: 'r',
        routeRevision: 1,
        elapsedMs: 20_000,
        damageTaken: 0,
        parcelsCollected: 3,
        boostsTriggered: 2,
        completed: true,
      })
    ).toBeGreaterThan(0);
    expect(
      scoreRun({
        routeId: 'r',
        routeRevision: 1,
        elapsedMs: 20_000,
        damageTaken: 0,
        parcelsCollected: 3,
        boostsTriggered: 2,
        completed: false,
      })
    ).toBe(0);
  });

  it('rewards clean runs over otherwise identical damaged runs', () => {
    const clean = scoreRun({
      routeId: 'r',
      routeRevision: 1,
      elapsedMs: 30_000,
      damageTaken: 0,
      parcelsCollected: 2,
      boostsTriggered: 1,
      completed: true,
    });
    const damaged = scoreRun({
      routeId: 'r',
      routeRevision: 1,
      elapsedMs: 30_000,
      damageTaken: 2,
      parcelsCollected: 2,
      boostsTriggered: 1,
      completed: true,
    });
    expect(clean).toBeGreaterThan(damaged);
  });

  it('assigns medals at stable thresholds', () => {
    expect(medalForScore(7_499)).toBe('none');
    expect(medalForScore(7_500)).toBe('bronze');
    expect(medalForScore(10_000)).toBe('silver');
    expect(medalForScore(12_500)).toBe('gold');
  });
});
