# QA and Fairness Roadmap

## Test pyramid

### Pure unit tests

- cell costs and object caps;
- connector protection;
- zero-damage route solver;
- entry lane coverage;
- deterministic generation;
- scoring and medals;
- streak and achievement idempotence;
- route repair semantics.

### Property/fuzz tests

Generate thousands of random 3×18 grids and assert:

- validator never crashes;
- every certified tile has minimum damage zero;
- every certified tile has all entry lanes covered;
- generator only emits certified whole routes;
- serialization round-trip preserves solution;
- removed/unknown features fail closed.

### Integration tests

Use an in-memory tenant-store adapter to test:

- first bootstrap cold start;
- one daily submission and replacement;
- daily compilation;
- route feature stats once;
- run token consumption;
- leaderboard personal best;
- deletion and route revision.
- immutable route-revision replay and atomic duplicate completion rejection.

### Device/playtest matrix

- Reddit web desktop: Chrome, Firefox, Safari.
- Reddit mobile web/app webview on narrow Android and iPhone dimensions.
- Mouse, keyboard, touch.
- Slow network and failed API.
- anonymous practice and authenticated ranked mode.
- reduced motion and mute.

## Refinement candidate live boundary — 2026-07-13

Playtest `v0.0.1.13` passed an authenticated-owner Chrome session at an
emulated `390x844` viewport. The session covered inline entry, expanded Menu,
two consecutive ranked runs through Results, Builder invalid/certified states,
one publish, Creator Card truth labels, and Reddit-native sharing. The prior
second-run stale Phaser-object crash did not recur, and the runtime log contained
no matching critical error.

This evidence does not substitute for the remaining QC rows: fresh non-owner
publish/reload, physical portrait/landscape Reddit clients, a successful ranked
finish and live duplicate-completion probe, independently located PNG output,
or report/remove/route-repair. The exact session order and stop rules live in
[`../goals/daily-dash-hackathon-refinement-v1/notes/QC-DOGFOODING-ENTRY.md`](../goals/daily-dash-hackathon-refinement-v1/notes/QC-DOGFOODING-ENTRY.md).

## Fairness metrics

A tile is mathematically valid but may still be unpleasant. Collect:

- clean-clear rate;
- damage by cell/lane;
- lane-choice distribution;
- time from obstacle reveal to input;
- abandonment at tile;
- repeated attempts;
- path balance;
- boost conversion.

Flag rather than automatically delete:

- clean-clear rate below threshold after minimum sample;
- one cell causing disproportionate failures;
- route choice over 95/5 despite advertised fork;
- abnormal run timings;
- author repeatedly producing borderline tiles.

## Playability gates

- Minimum lookahead remains constant at all boosts; shared certification rejects forced switches into lanes hidden during the camera-lookahead window.
- Lane tween completes before another forced switch.
- No obstacle can damage multiple times during one invulnerability window.
- Gaps always recover to a valid lane.
- Tile seams reset transient state.
- Route completion replays the immutable `RouteBundle` revision issued at run start; repaired current geometry cannot replace it.
- The one-use token is claimed with a watched Redis transaction only after validation, so at most one duplicate request can proceed to ranked persistence.
- Ranked score counters are derived from server replay of submitted lane events.

## Performance budgets

- Inline entry excludes Phaser.
- Expanded first interactive target under a few seconds on a typical mobile connection.
- Route render uses pooled or redrawn objects; runner seam labels and feedback messages now reuse text objects instead of allocating transient labels during rendering.
- No entire Kenney bundle in build.
- API payloads comfortably below platform request limits.
- Server endpoint work remains bounded; scheduled maintenance batches large work.

## Current scaffold caveats

- Runner rendering is still a functional vector prototype, with initial text-object pooling in place for seam labels and feedback messages.
- Result submission now requires an exact revision, uses server-side lane-event replay for score counters, and claims the token atomically after validation. Further hardening should calibrate speed/tween timing against live playtest telemetry.
- Reaction-margin validation covers one-lane forced switches, same-direction two-lane migrations, camera-lookahead destination checks, lane/column issue evidence, and Builder issue-cell highlighting.

These are explicit launch tasks, not hidden assumptions.
