# Gameplay Loop B — Evergreen Runner

## Promise

**Read the course, choose a lane, deliver the parcel, and master routes made by the community.**

The evergreen game is a finite three-lane side-scrolling runner. “Evergreen” means completed routes remain replayable; it does not mean an unvalidated infinite stream.

## Core control model

- Horizontal movement is automatic and normalized.
- Up moves one lane upward.
- Down moves one lane downward.
- Keyboard: arrows plus W/S.
- Mobile: slide/swipe up/down on the course for immediate adjacent steps, or tap a lane to move one legal lane step toward it.
- No jump in version 1.

Lane movement is visually eased but logically deterministic. The canonical simulator evaluates one time column at a time and applies a one-column lane-change cooldown.

Current implementation note: right-side touch rails were removed after mobile dogfooding on 2026-06-29. Runner accepts playfield-wide tap-a-lane input and consumes each vertical slide threshold during pointer movement instead of waiting for finger release. A long slide can request multiple steps, but each emitted request remains one adjacent lane and only one event may occupy a logical column, keeping the serialized input valid for server replay. Live Devvit mobile gesture-conflict QA remains pending.

## Failure contract

The package has three integrity pips.

```text
■ ■ ■ → ■ ■ □ → ■ □ □ → delivery failed
```

Obstacle:

- removes one pip;
- causes a short slowdown;
- grants temporary invulnerability;
- visibly dents the parcel.

Gap:

- removes one pip;
- applies a larger recovery delay;
- respawns in a valid lane;
- is not instant death in version 1.

The third hit ends the run. This is easier to learn and fairer in a user-generated game than mixing one-hit and three-hit hazards.

## Route reading

The player must see enough horizontal lookahead to react. The courier sits left of screen center. Hazards, gaps, boosts, and parcels have distinct silhouettes that remain legible without color.

The mobile course reinforces semantics twice: crates use a large square warning plate and the persistent `AVOID` key, while parcel stamps use a circular reward halo and the persistent `COLLECT` key. Color supports those cues but is not their only distinction.

At tile boundaries, a small roadside sign credits the builder. Attribution should not cover the playfield or interrupt input.

## Risk/reward vocabulary

### Safe path

- wider reaction windows;
- zero required damage;
- fewer rewards;
- no reliance on boosts.

### Fast path

- boost pads;
- tighter switches;
- lower finish time;
- still cleanly completable.

### Score path

- parcels or stamps;
- may diverge from fastest route;
- encourages replay rather than one solved answer.

A good route makes at least two of these paths meaningfully different.

## Scoring

```text
7,500 completion
+ up to 5,000 time bonus
+ 350 per parcel
+ 75 per boost, capped
− 1,250 per damage
= final score
```

Medals:

- Bronze: 7,500.
- Silver: 10,000.
- Gold: 12,500.

These are scaffold thresholds. Before launch, calibrate them against a corpus of founding and community-style routes. Route-specific percentile medals are a future alternative if fixed thresholds become unfair across biomes.

2026-06-29 local sweep: an eight-tile founding-style route at base speed scored Bronze with no rewards, Silver with partial rewards, and Gold with all source rewards. Constants were left unchanged pending live playtest telemetry.

## Modes

### Daily Dash

One deterministic tenant route per day. Its leaderboard is the primary competitive surface and resets naturally with the date.

Today’s leaderboard is stored by route id and route revision, not by date alone. A repaired route revision starts a separate leaderboard so scores never mix incompatible geometry.

### Yesterday’s route

The previous daily route should remain playable from the post-publish prompt and Roadbook. It uses the same stored route id + revision leaderboard model as every other Roadbook route.

### Roadbook

Permanent list of previously published tenant routes. Each route tracks medal, personal best, community best, contributor count, revision, and community-authored percentage.

Roadbook should make today/yesterday/older routes clear. Starting a ranked run from Roadbook must issue a token for that route id + revision; result screens should link back to that route’s leaderboard.

### Shuffle

Randomly selects a route from the local Roadbook. The endpoint can later query World Tour through the adapter, but local fallback is mandatory.

### Weekly Long Haul — stretch

A finite route assembled from selected tiles across the week. It reuses the same compiler and does not introduce infinite generation.

### Free Drive — future unranked mode

Free Drive may be a deliberately generative, unranked practice surface later. It must stay separate from Daily Dash/Roadbook ranked routes so medals, attribution, route revisions, and server replay remain bounded and reproducible.

## Route composition pacing

An eight-tile route should approximate:

```text
Easy opening → medium read → medium fork → hard peak
→ recovery → hard choice → medium rhythm → readable finish
```

Never place multiple maximum-difficulty tiles without a recovery section. The compiler chooses by difficulty target, author diversity, recent usage, and deterministic seed.

## Replay value

A route supports:

- personal best;
- clean-clear challenge;
- parcel-completion challenge;
- medal progression;
- leaderboard rank;
- route revision history;
- later ghost replays.

Ghosts are optional for launch. A compact input-event replay is preferable to storing video or frame snapshots.

## Route leaderboard storage

Subreddit route leaderboards are installation-local Redis records keyed by route identity and revision:

```text
leaderboard:{routeId}:rev:{revision}
best-runs:{routeId}:rev:{revision}
```

This means:

- Today’s route has its own leaderboard.
- Yesterday’s route keeps its leaderboard forever in Roadbook.
- Older Roadbook routes keep replayable leaderboard history.
- Repaired routes increment revision and do not mix old scores with new geometry.
- Practice/test rides, including `Test My Tile`, never write ranked results.

## Server trust boundary

The server issues one-use run tokens, sanity-checks timing, and replays bounded lane-change events against stored route geometry. Ranked damage, parcels, boosts, completion, score, and logical route-column distance are derived server-side. Results format the canonical distance as game-world kilometers at ten meters per column; the display conversion has no scoring or trust effect. Result presentation says `Ranked result saved` only after completion persistence succeeds; start/completion failures fall back to an explicitly labeled practice result.

The same accepted replay result advances Route Passport lifetime truth. Every ranked result adds its derived distance; zero-damage completions add a clean delivery; non-completions add a failed delivery. Legacy profiles begin these newly introduced fields at zero instead of receiving an incomplete best-run backfill.

Hardening path:

1. Store route version and compiler version in token. Implemented for route revision.
2. Submit lane-change input events with columns. Implemented in compact column-indexed form.
3. Replay the logical simulator server-side. Implemented for route cells and lane transitions.
4. Derive damage, parcels, boosts, completion, score, and distance from replay. Implemented for ranked submissions.
5. Reject impossible speed or lane transitions. Lane transitions are checked; speed/tween calibration remains launch hardening.

## Accessibility

- Inputs remappable after MVP.
- No mechanic depends only on hue.
- Reduced-motion mode removes shake, parallax, and aggressive boost zoom.
- Sound effects have captions/icons and global mute.
- Touch targets are at least 48 CSS pixels.
- Text remains outside the high-motion playfield.
- Practice mode works while signed out; ranked persistence requires authentication.

## Delivery phases

### B1 — deterministic lane simulator

Auto-forward progress, smooth lane movement, hazards, boost, parcel, finish/fail.

### B2 — route renderer

Render canonical tiles with vector fallback and seeded visual dressing.

### B3 — scoring and persistence

Run tokens, result validation, profile, leaderboard, personal best.

### B4 — Roadbook

Route list, selected-route details, revision-scoped leaderboard panel, revision labels, and random local route are implemented in first-pass form. Filters, medal state, and personal best remain launch polish.

Runner HUD now also exposes route date, revision, average difficulty, and community-authored percentage so attribution is visible during play, not only in Roadbook.

### B4.5 — daily/Roadbook play prompts

Expose `Ride Today`, `Try Yesterday`, and `Open Roadbook` from the Builder post-publish flow. Result screens should return to the selected route’s leaderboard and clearly label ranked versus practice runs.

### B5 — mastery

Ghosts, weekly collection, creator section stats, World Tour adapter.

## Acceptance criteria

- A player understands Up/Down and integrity within one run.
- All certified generated routes can be completed without damage.
- One collision does not produce repeated damage due to overlap.
- A mobile player can operate the game with one thumb.
- Vertical movement responds while the finger slides and never emits a non-adjacent lane request.
- A route remains playable if World Tour and server calls fail; practice result still appears locally.
- Today, yesterday, and Roadbook routes each record ranked runs against route id + revision.
- Test-tile practice runs are clearly labeled and never appear on leaderboards.
- Every Result shows game-world kilometer distance derived from canonical route columns and distinguishes a saved ranked result from a practice fallback.
