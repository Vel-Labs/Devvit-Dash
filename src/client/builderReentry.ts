import { cloneTile, createDraftTile } from '../shared/game/tile';
import type { CourseTile } from '../shared/game/types';

export type BuilderReentryChoice = 'edit' | 'fresh';

export type BuilderEntryData = {
  todaySubmission?: CourseTile | null;
  choice?: BuilderReentryChoice;
  resume?: {
    tile: CourseTile;
    source: 'new' | 'edit' | 'fresh';
    replacingToday: boolean;
  };
};

export type BuilderEntryResolution =
  | {
      mode: 'choose';
      existingTile: CourseTile;
    }
  | {
      mode: 'build';
      source: 'new' | 'edit' | 'fresh';
      replacingToday: boolean;
      tile: CourseTile;
    };

export const resolveBuilderEntry = (data: BuilderEntryData = {}): BuilderEntryResolution => {
  if (data.resume) {
    return {
      mode: 'build',
      source: data.resume.source,
      replacingToday: data.resume.replacingToday,
      tile: cloneTile(data.resume.tile),
    };
  }

  const existing =
    data.todaySubmission && data.todaySubmission.status !== 'removed'
      ? cloneTile(data.todaySubmission)
      : undefined;

  if (!existing) {
    return {
      mode: 'build',
      source: 'new',
      replacingToday: false,
      tile: createDraftTile(),
    };
  }

  if (!data.choice) return { mode: 'choose', existingTile: existing };

  if (data.choice === 'edit') {
    return {
      mode: 'build',
      source: 'edit',
      replacingToday: true,
      tile: existing,
    };
  }

  return {
    mode: 'build',
    source: 'fresh',
    replacingToday: true,
    tile: createDraftTile(),
  };
};

export const builderRestartData = (
  entry: BuilderEntryResolution,
  currentTile: CourseTile
): BuilderEntryData => {
  if (entry.mode === 'choose') {
    return { todaySubmission: cloneTile(entry.existingTile) };
  }
  return {
    resume: {
      tile: cloneTile(currentTile),
      source: entry.source,
      replacingToday: entry.replacingToday,
    },
  };
};
