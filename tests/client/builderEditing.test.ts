import { describe, expect, it } from 'vitest';
import { applyBuilderTool, getBuilderToolUsage } from '../../src/client/builderEditing';
import { createDraftTile, setTileCell } from '../../src/shared/game/tile';
import type { CourseTile, Lane } from '../../src/shared/game/types';

const fill = (
  tile: CourseTile,
  cells: Array<[Lane, number]>,
  feature: 'obstacle' | 'boost' | 'parcel'
): CourseTile =>
  cells.reduce((next, [lane, column]) => setTileCell(next, lane, column, 'road', feature), tile);

describe('Builder direct editing', () => {
  it('toggles the selected item off when the same cell is tapped again', () => {
    const draft = createDraftTile();
    const added = applyBuilderTool(draft, 1, 6, 'obstacle');
    expect(added).toMatchObject({ changed: true, action: 'added' });
    if (!added.changed) throw new Error('Expected obstacle addition.');

    const removed = applyBuilderTool(added.tile, 1, 6, 'obstacle');
    expect(removed).toMatchObject({ changed: true, action: 'removed' });
    if (!removed.changed) throw new Error('Expected obstacle removal.');
    expect(removed.tile.lanes[1]?.[6]).toEqual({ terrain: 'road', feature: 'none' });
  });

  it('uses the selected tool to override an occupied cell', () => {
    const draft = setTileCell(createDraftTile(), 2, 7, 'road', 'parcel');
    const replaced = applyBuilderTool(draft, 2, 7, 'boost');

    expect(replaced).toMatchObject({ changed: true, action: 'replaced' });
    if (!replaced.changed) throw new Error('Expected replacement.');
    expect(replaced.tile.lanes[2]?.[7]).toEqual({ terrain: 'road', feature: 'boost' });
  });

  it('blocks obstacle ten immediately without changing the source draft', () => {
    const nineCells: Array<[Lane, number]> = [
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ];
    const draft = fill(createDraftTile(), nineCells, 'obstacle');
    const blocked = applyBuilderTool(draft, 0, 6, 'obstacle');

    expect(blocked).toMatchObject({ changed: false, reason: 'obstacle-limit' });
    expect(blocked.tile).toBe(draft);
    expect(draft.lanes[0]?.[6]).toEqual({ terrain: 'road', feature: 'none' });
  });

  it('blocks budget overflow even when the selected item cap has room', () => {
    const obstacleCells: Array<[Lane, number]> = [
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ];
    let draft = fill(createDraftTile(), obstacleCells, 'obstacle');
    draft = fill(
      draft,
      [
        [0, 6],
        [1, 6],
        [2, 6],
        [1, 7],
        [2, 7],
      ],
      'parcel'
    );
    const blocked = applyBuilderTool(draft, 0, 7, 'boost');

    expect(blocked).toMatchObject({ changed: false, reason: 'build-budget' });
  });

  it('reports the active tool count separately from build-budget points', () => {
    const draft = fill(
      createDraftTile(),
      [
        [0, 4],
        [1, 4],
      ],
      'obstacle'
    );

    expect(getBuilderToolUsage(draft, 'obstacle')).toEqual({ count: 2, limit: 9 });
    expect(getBuilderToolUsage(draft, 'road')).toEqual({ count: 0, limit: null });
  });

  it('allows an over-limit legacy draft to remove items toward validity', () => {
    const cells: Array<[Lane, number]> = [
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ];
    const legacy = fill(createDraftTile(), cells, 'obstacle');
    const removed = applyBuilderTool(legacy, 0, 3, 'obstacle');

    expect(removed).toMatchObject({ changed: true, action: 'removed' });
  });
});
