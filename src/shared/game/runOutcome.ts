import type { ReplaySuccess } from './replay';

export const METERS_PER_ROUTE_COLUMN = 10;

export const clampDistanceColumns = (distanceColumns: number, totalColumns: number): number =>
  Math.max(0, Math.min(totalColumns, Math.floor(distanceColumns)));

export const distanceColumnsFromReplay = (totalColumns: number, replay: ReplaySuccess): number =>
  replay.completed
    ? totalColumns
    : clampDistanceColumns((replay.failedAtColumn ?? -1) + 1, totalColumns);

export const distanceKilometers = (distanceColumns: number, totalColumns: number): number =>
  (clampDistanceColumns(distanceColumns, totalColumns) * METERS_PER_ROUTE_COLUMN) / 1_000;

export const formatDistanceKilometers = (distanceColumns: number, totalColumns: number): string =>
  `${distanceKilometers(distanceColumns, totalColumns).toFixed(2)} KM`;
