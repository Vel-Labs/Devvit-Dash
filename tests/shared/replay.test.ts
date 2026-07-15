import { describe, expect, it } from 'vitest';
import { appendReplaySafeLaneEvent, laneAtColumn, replayRun } from '../../src/shared/game/replay';
import { createBlankLanes, setTileCell } from '../../src/shared/game/tile';
import type { Cell, CourseTile } from '../../src/shared/game/types';

const makeColumns = (): Cell[][] => {
  let tile: CourseTile = {
    version: 1,
    id: 'replay-tile',
    tenantId: 'tenant',
    authorId: 'author',
    authorName: 'Author',
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z',
    width: 6,
    lanes: createBlankLanes(6),
    visualSeed: 1,
    status: 'certified',
  };
  tile = setTileCell(tile, 1, 1, 'road', 'parcel');
  tile = setTileCell(tile, 0, 2, 'road', 'boost');
  tile = setTileCell(tile, 1, 2, 'road', 'obstacle');
  tile = setTileCell(tile, 0, 4, 'road', 'obstacle');
  return Array.from({ length: tile.width }, (_, column) =>
    tile.lanes.map((lane) => lane[column] ?? { terrain: 'gap', feature: 'none' })
  );
};

describe('run replay', () => {
  it('reports the active lane at a route column', () => {
    const events = [
      { column: 2, lane: 0 },
      { column: 5, lane: 1 },
    ] as const;

    expect(laneAtColumn(events, 1)).toBe(1);
    expect(laneAtColumn(events, 3)).toBe(0);
    expect(laneAtColumn(events, 5)).toBe(1);
  });

  it('derives run counters from route cells and lane inputs', () => {
    const result = replayRun(makeColumns(), [
      { column: 2, lane: 0 },
      { column: 4, lane: 1 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.completed).toBe(true);
    expect(result.damageTaken).toBe(0);
    expect(result.parcelsCollected).toBe(1);
    expect(result.boostsTriggered).toBe(1);
  });

  it('rejects impossible lane jumps', () => {
    const result = replayRun(makeColumns(), [
      { column: 1, lane: 0 },
      { column: 2, lane: 2 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid-lane-transition');
  });

  it('serializes only adjacent lane changes at distinct route columns', () => {
    const initial = [] as const;
    const top = appendReplaySafeLaneEvent(initial, 1, 0);
    const sameColumnSecondMove = appendReplaySafeLaneEvent(top, 1, 1);
    const nonAdjacent = appendReplaySafeLaneEvent(top, 2, 2);
    const backToMiddle = appendReplaySafeLaneEvent(top, 2, 1);

    expect(top).toEqual([{ column: 1, lane: 0 }]);
    expect(sameColumnSecondMove).toBe(top);
    expect(nonAdjacent).toBe(top);
    expect(backToMiddle).toEqual([
      { column: 1, lane: 0 },
      { column: 2, lane: 1 },
    ]);
    expect(replayRun(makeColumns(), backToMiddle).ok).toBe(true);
  });
});
