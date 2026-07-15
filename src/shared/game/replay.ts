import { LANE_CHANGE_COOLDOWN_COLUMNS, LANE_COUNT } from './constants';
import type { Cell, Lane, LaneInputEvent } from './types';

export type ReplaySuccess = {
  ok: true;
  completed: boolean;
  damageTaken: number;
  parcelsCollected: number;
  boostsTriggered: number;
  failedAtColumn?: number;
};

export type ReplayFailureCode =
  | 'too-many-events'
  | 'invalid-event-column'
  | 'invalid-event-lane'
  | 'non-monotonic-events'
  | 'invalid-lane-transition';

export type ReplayFailure = {
  ok: false;
  code: ReplayFailureCode;
  message: string;
};

export type ReplayResult = ReplaySuccess | ReplayFailure;

const MAX_LANE_EVENTS = 256;
const START_LANE: Lane = 1;

const isLane = (value: number): value is Lane =>
  Number.isInteger(value) && value >= 0 && value < LANE_COUNT;

export const laneAtColumn = (laneEvents: readonly LaneInputEvent[] = [], column: number): Lane => {
  let lane: Lane = START_LANE;
  for (const event of laneEvents) {
    if (event.column > column) break;
    if (isLane(event.lane)) lane = event.lane;
  }
  return lane;
};

export const appendReplaySafeLaneEvent = (
  laneEvents: readonly LaneInputEvent[],
  column: number,
  lane: Lane
): readonly LaneInputEvent[] => {
  const last = laneEvents.at(-1);
  const previousLane = last?.lane ?? START_LANE;
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    Math.abs(lane - previousLane) !== 1 ||
    (last && column - last.column < LANE_CHANGE_COOLDOWN_COLUMNS)
  ) {
    return laneEvents;
  }
  return [...laneEvents, { column, lane }];
};

export const replayRun = (
  columns: Cell[][],
  laneEvents: readonly LaneInputEvent[] = []
): ReplayResult => {
  if (laneEvents.length > MAX_LANE_EVENTS) {
    return {
      ok: false,
      code: 'too-many-events',
      message: `Runs may submit at most ${MAX_LANE_EVENTS} lane events.`,
    };
  }

  let lane: Lane = START_LANE;
  let previousColumn = -1;
  for (const event of laneEvents) {
    if (!Number.isInteger(event.column) || event.column < 0 || event.column >= columns.length) {
      return {
        ok: false,
        code: 'invalid-event-column',
        message: 'Lane events must target a valid route column.',
      };
    }
    if (!isLane(event.lane)) {
      return {
        ok: false,
        code: 'invalid-event-lane',
        message: 'Lane events must target one of the three lanes.',
      };
    }
    if (event.column <= previousColumn) {
      return {
        ok: false,
        code: 'non-monotonic-events',
        message: 'Lane events must be strictly ordered by route column.',
      };
    }
    if (Math.abs(event.lane - lane) > 1) {
      return {
        ok: false,
        code: 'invalid-lane-transition',
        message: 'Lane events may only move one adjacent lane at a time.',
      };
    }
    lane = event.lane;
    previousColumn = event.column;
  }

  lane = START_LANE;
  let eventIndex = 0;
  let damageTaken = 0;
  let parcelsCollected = 0;
  let boostsTriggered = 0;

  for (let column = 0; column < columns.length; column += 1) {
    const nextEvent = laneEvents[eventIndex];
    if (nextEvent && nextEvent.column === column) {
      lane = nextEvent.lane;
      eventIndex += 1;
    }

    const cell = columns[column]?.[lane];
    if (!cell || cell.terrain === 'gap' || cell.feature === 'obstacle') {
      damageTaken += 1;
      if (damageTaken >= 3) {
        return {
          ok: true,
          completed: false,
          damageTaken,
          parcelsCollected,
          boostsTriggered,
          failedAtColumn: column,
        };
      }
      continue;
    }

    if (cell.feature === 'parcel') parcelsCollected += 1;
    if (cell.feature === 'boost') boostsTriggered += 1;
  }

  return {
    ok: true,
    completed: true,
    damageTaken,
    parcelsCollected,
    boostsTriggered,
  };
};
