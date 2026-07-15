import { describe, expect, it } from 'vitest';
import {
  clampDistanceColumns,
  distanceKilometers,
  distanceColumnsFromReplay,
  formatDistanceKilometers,
} from '../../src/shared/game/runOutcome';

describe('authoritative run distance', () => {
  it('reports the full route for a completed replay', () => {
    expect(
      distanceColumnsFromReplay(108, {
        ok: true,
        completed: true,
        damageTaken: 0,
        parcelsCollected: 8,
        boostsTriggered: 2,
      })
    ).toBe(108);
  });

  it('counts the terminal failed column exactly once', () => {
    expect(
      distanceColumnsFromReplay(108, {
        ok: true,
        completed: false,
        damageTaken: 3,
        parcelsCollected: 1,
        boostsTriggered: 0,
        failedAtColumn: 26,
      })
    ).toBe(27);
  });

  it('clamps display values to the route boundary', () => {
    expect(clampDistanceColumns(-4, 108)).toBe(0);
    expect(clampDistanceColumns(999, 108)).toBe(108);
    expect(distanceKilometers(144, 144)).toBe(1.44);
    expect(formatDistanceKilometers(999, 108)).toBe('1.08 KM');
  });
});
