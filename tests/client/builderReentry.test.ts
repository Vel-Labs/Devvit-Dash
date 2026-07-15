import { describe, expect, it } from 'vitest';
import { builderRestartData, resolveBuilderEntry } from '../../src/client/builderReentry';
import { createDraftTile } from '../../src/shared/game/tile';

const existingTile = createDraftTile({
  id: 'today-tile',
  tenantId: 'tenant-a',
  authorId: 'player-a',
  authorName: 'Player A',
  createdAt: '2026-07-14T01:00:00.000Z',
  updatedAt: '2026-07-14T01:05:00.000Z',
  status: 'certified',
});

describe('Builder same-day re-entry', () => {
  it('starts a new draft when no current-day submission exists', () => {
    const entry = resolveBuilderEntry();

    expect(entry).toMatchObject({
      mode: 'build',
      source: 'new',
      replacingToday: false,
    });
  });

  it('requires an explicit choice before opening an existing submission', () => {
    const entry = resolveBuilderEntry({ todaySubmission: existingTile });

    expect(entry).toMatchObject({ mode: 'choose', existingTile: { id: 'today-tile' } });
  });

  it('edits a defensive clone of today’s submitted tile', () => {
    const entry = resolveBuilderEntry({ todaySubmission: existingTile, choice: 'edit' });

    expect(entry).toMatchObject({
      mode: 'build',
      source: 'edit',
      replacingToday: true,
      tile: { id: 'today-tile' },
    });
    if (entry.mode !== 'build') throw new Error('Expected build entry.');
    expect(entry.tile).not.toBe(existingTile);
    expect(entry.tile.lanes).not.toBe(existingTile.lanes);
  });

  it('starts a blank local replacement without changing the existing object', () => {
    const entry = resolveBuilderEntry({ todaySubmission: existingTile, choice: 'fresh' });

    expect(entry).toMatchObject({
      mode: 'build',
      source: 'fresh',
      replacingToday: true,
      tile: { status: 'draft' },
    });
    if (entry.mode !== 'build') throw new Error('Expected build entry.');
    expect(entry.tile.id).not.toBe(existingTile.id);
    expect(existingTile.id).toBe('today-tile');
  });

  it('preserves a draft across a responsive scene restart', () => {
    const draft = createDraftTile({ id: 'draft-in-progress' });
    draft.lanes[1]![7] = { terrain: 'road', feature: 'obstacle' };

    const entry = resolveBuilderEntry({
      resume: { tile: draft, source: 'fresh', replacingToday: true },
    });

    expect(entry).toMatchObject({
      mode: 'build',
      source: 'fresh',
      replacingToday: true,
      tile: { id: 'draft-in-progress' },
    });
    if (entry.mode !== 'build') throw new Error('Expected build entry.');
    expect(entry.tile.lanes[1]?.[7]?.feature).toBe('obstacle');
  });

  it('builds the same preserving payload for automatic resize and manual recheck', () => {
    const draft = createDraftTile({ id: 'draft-before-recheck' });
    draft.lanes[2]![8] = { terrain: 'road', feature: 'parcel' };
    const entry = resolveBuilderEntry({
      resume: { tile: draft, source: 'edit', replacingToday: true },
    });

    const restart = builderRestartData(entry, draft);
    const resumed = resolveBuilderEntry(restart);

    expect(resumed).toMatchObject({
      mode: 'build',
      source: 'edit',
      replacingToday: true,
      tile: { id: 'draft-before-recheck' },
    });
    if (resumed.mode !== 'build') throw new Error('Expected build entry.');
    expect(resumed.tile.lanes[2]?.[8]?.feature).toBe('parcel');
  });
});
