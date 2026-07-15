import type { CreatorOutcomeTile } from './api';
import type { RouteBundle, RunResult } from './game/types';
import { laneAtColumn } from './game/replay';

export type CreatorRouteRunSample = {
  route: RouteBundle;
  bestRuns: RunResult[];
};

export const collectCreatorOutcomeTiles = (
  authorId: string,
  samples: readonly CreatorRouteRunSample[]
): CreatorOutcomeTile[] => {
  const tiles: CreatorOutcomeTile[] = [];

  for (const sample of samples) {
    const eligibleRuns = sample.bestRuns.filter((run) => run.completed && run.userId !== authorId);
    sample.route.tiles.forEach((tile, tileIndex) => {
      if (tile.authorId !== authorId || tile.status === 'removed') return;
      const startColumn = tileIndex * tile.width;
      const sampleColumn = startColumn + Math.floor(tile.width / 2);
      const midpointLaneChoices = { top: 0, middle: 0, bottom: 0 };

      for (const run of eligibleRuns) {
        const lane = laneAtColumn(run.laneEvents ?? [], sampleColumn);
        if (lane === 0) midpointLaneChoices.top += 1;
        else if (lane === 1) midpointLaneChoices.middle += 1;
        else midpointLaneChoices.bottom += 1;
      }

      tiles.push({
        dateKey: sample.route.recipe.dateKey,
        routeRevision: sample.route.recipe.revision,
        tileIndex,
        bestRunSampleSize: eligibleRuns.length,
        cleanRouteBestRunSamples: eligibleRuns.filter((run) => run.damageTaken === 0).length,
        midpointLaneChoices,
      });
    });
  }

  return tiles.sort(
    (left, right) =>
      right.bestRunSampleSize - left.bestRunSampleSize ||
      right.dateKey.localeCompare(left.dateKey) ||
      right.routeRevision - left.routeRevision ||
      left.tileIndex - right.tileIndex
  );
};
