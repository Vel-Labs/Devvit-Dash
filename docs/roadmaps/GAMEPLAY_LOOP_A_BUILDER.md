# Gameplay Loop A — Builder

## Promise

**Make a six-second piece of a future level, prove that it is fair, and publish it in under two minutes.**

The Builder is a constrained creation game, not a professional level editor. Its pleasure comes from making an interesting choice with a small budget and receiving immediate, legible feedback.

## Session flow

```text
Open Builder
  → receive blank 3×18 tile with locked connectors
  → select road/gap/obstacle/boost/parcel tool
  → drag or tap to paint cells; tap the same item again to remove it
  → watch selected-item count, build points, and warnings update
  → certify
  → inspect safe-path overlay and metrics
  → test ride using Evergreen runner
  → revise or publish
  → after publish, choose My Share Card, Test My Tile, Ride Today, Try Yesterday, or Roadbook
  → from the share card, ride the server-provided current Daily Route
  → return later for feature/crossing outcome
```

## Tile anatomy

- Three horizontal lanes: top, middle, bottom.
- Eighteen logical columns representing time/progress.
- Columns 0–2 and 15–17 are protected neutral connectors.
- Columns 3–14 are editable.
- All visual rendering must map back to this canonical grid.

The connector zones guarantee that independently created tiles remain composable. They are visually framed and cannot be painted.

## Tool palette

### Road

Restores ordinary passable terrain and removes any feature. It is the reset/erase-to-safe tool.

### Gap

Removes road. Crossing it costs one package-integrity pip and triggers a recovery delay. It costs one build-budget point.

### Obstacle

Places a collision hazard on road. It costs two budget points and one integrity pip when hit.

### Boost

Places an optional speed advantage. It costs two budget points and may never be necessary for completion.

### Parcel stamp

Places an optional score collectible. It costs one point and should usually tempt a riskier line rather than sit on the only safe path.

## Builder economy

The budget should make “fill every lane with hazards” impossible and make revision understandable.

| Object   | Cost | Cap |
| -------- | ---: | --: |
| Gap cell |    1 |  14 |
| Obstacle |    2 |   9 |
| Boost    |    2 |   5 |
| Parcel   |    1 |   7 |
| Total    |    — |  24 |

The UI distinguishes total build points from the selected tool's object count.
For example, `BUILD POINTS 18/24` and `ACTIVE TOOL: OBSTACLE · 9/9` are
different constraints. A placement that would exceed either constraint is
rejected immediately without changing the draft; certification repeats the
same canonical checks.

## Certification contract

Publishing requires both deterministic and experiential certification.

### Deterministic certification

- Exact shape: 3×18.
- Protected connectors unchanged.
- Features cannot occupy gaps.
- Object and budget caps respected.
- At least one zero-damage path exists.
- A zero-damage path is reachable from each entrance lane.
- No boost is necessary.
- Whole tile uses the canonical lane-change cooldown.

### Builder clear

The author must complete one test ride. This is not sufficient security by itself, but it gives the creator immediate empathy for the runner.

### Human-fair hardening

The initial solver proves reachability. A reaction-margin pass now rejects mandatory switches without sufficient visible lead time. Target tuning:

- one-lane forced switch: at least two columns of warning (implemented);
- two-lane migration: at least four columns (implemented);
- no consecutive forced switches during lane transition;
- safe route remains visible within the camera lookahead (implemented);
- boost state resets before the connector zone.

## Feedback hierarchy

The validator must explain the next useful action, not only return “invalid.”

1. Hard blocking error at the exact lane/column. Reaction-margin issues now carry lane/column evidence.
2. Highlighted cells implicated in the failure. Builder certification failures now draw a warning highlight on the implicated cell when validator evidence is available.
3. Green safe-path overlay when certified. Implemented overlay paths come from shared deterministic movement logic, not client-only heuristics.
4. Gold high-reward path overlay as a non-authoritative suggestion.
5. Summary: clean path count, entry coverage, difficulty, budget, risk score.

Example messages:

- “Middle entrance cannot reach a clean path. Clear one of the highlighted cells.”
- “Connector zones must remain ordinary road.”
- “Certified, but both rewards sit on the safest path. Consider making a meaningful fork.”
- “No hazards: playable, but unlikely to be featured.”

## Selection incentives

Do not rank creators by failure rate. The compiler should prefer tiles with:

- valid clean completion;
- meaningful route forks;
- adequate reaction margin;
- distinct shape from recently selected tiles;
- reasonable difficulty for its route position;
- author freshness;
- balanced future path usage.

Selection occurs from a quality pool using a seeded weighted choice. This prevents a tiny group of experts from owning every route.

## Creator consequence

A published tile has a lifecycle:

```text
Draft → Certified → Candidate → Featured → Evergreen usage → Removed/replaced
```

The return screen should show:

- whether the tile was featured;
- route and section where it appeared;
- number of crossings;
- clean-clear rate;
- route choice distribution;
- fastest crossing;
- whether players took the boosted path;
- achievement progress.

Only crossing count exists in the first code slice; route-choice analytics are a later event stream.

## Post-publish play prompt

Publishing should not dead-end the creator in the editor. After a certified tile is saved, show clear next actions:

- `My Share Card`: open the always-populated Route Passport immediately, with authoritative lifetime distance, featured tiles, clean deliveries, and failed deliveries plus Reddit/share-image actions.
- `Test My Tile`: immediately play the tile inserted into a short test route. This is creator QA and must not create a ranked leaderboard entry.
- `Ride Today`: start the current community route as a ranked run when the player is authenticated.
- `Try Yesterday`: start the previous daily route if one exists in the local Roadbook.
- `Open Roadbook`: browse today, yesterday, and older evergreen routes.

The prompt reinforces the loop: create a small level insert, prove it is fair, then experience the subreddit’s current route. It also gives creators an obvious path to leaderboard play without implying that their just-published tile appears instantly in today’s route.

While the post-publish prompt is open, the underlying Builder grid is input-shielded. Opening My Share Card clears gesture state and the prompt before changing scenes so the same tap cannot mutate a tile underneath the overlay.

Practice/test ride labels must remain explicit. Ranked runs only apply to stored route id + revision combinations issued by the server.

## Mobile interaction

- Tap tool, then drag through cells.
- Tapping a cell that already contains the selected item removes it back to ordinary road.
- Tapping an occupied cell with a different selected tool replaces the existing item.
- A cell changes only once per continuous drag to avoid oscillation.
- Long press is not required.
- Locked connectors visibly reject paint.
- Undo, redo, certified safe-path overlay, one-lane reaction margin, two-lane migration timing, camera-lookahead destination checks, reaction-margin lane/column issue evidence, and Builder issue-cell highlighting are implemented.
- `ERASE FIX` clears the currently highlighted validator issue cell back to ordinary road when the highlighted cell is editable.
- The editor must fit without page scrolling in expanded view.
- Haptic feedback is optional and must not be assumed available.

## Abuse and moderation

The grid contains no text, uploads, custom colors, or arbitrary freehand image. Attribution, report, and author deletion remain required. A deleted featured tile causes route recompilation with a system fallback and increments route revision.

## Delivery phases

### A1 — editor foundation

Grid, tools, budget, clear connectors, local draft.

### A2 — certification

Shared validator, issue overlays, metrics, founding-tile tests.

### A3 — actual test ride

Open the same runner with the candidate tile between neutral/founding flanks.

### A4 — persistence

Server rewrites identity and metadata, validates again, enforces one daily active submission, saves certified tile.

Same-day re-entry is explicit: if the authenticated player already submitted,
Builder first offers `Edit Today’s Tile` or `Start Fresh`. Both paths are local
until Publish; publishing again updates the same server-certified daily record
and says `updated` instead of implying a second creation.

### A5 — creator analytics

Feature notification, crossing counter, path-choice events, balanced-design achievement.

### A6 — post-publish play continuation

After publish, offer `Test My Tile`, `Ride Today`, `Try Yesterday`, and `Open Roadbook`. Test rides stay local/practice-only; ranked runs use server-issued route-revision tokens. Implemented locally on 2026-06-29; live persistence proof remains a separate QA gate.

Builder test rides carry a defensive copy of the current draft and its entry
intent through Runner and Results. `Back to Builder` restores that exact local
draft rather than constructing an empty editor. This return payload is
session-local and does not weaken server-authoritative Publish.

## Acceptance criteria

- A new player creates and publishes a valid tile in under two minutes.
- No client can publish an invalid tile by bypassing the UI.
- Every published tile is cleanly reachable from all three entry lanes.
- A tile is recognizable when rendered inside a generated route.
- Removing a tile removes it from future use and repairs existing route recipes.
- Publishing a tile presents clear next play actions without ranking practice/test rides.
- Returning on the same UTC day never silently starts over or silently overwrites:
  the player chooses edit/fresh before Builder, and persisted state changes only
  on Publish.
- The tenth obstacle and any other cap/budget overflow fail at placement time.
- Test Ride → Results → Back to Builder preserves the exact draft geometry.
