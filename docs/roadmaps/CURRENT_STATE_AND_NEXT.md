# Current State and Next

## Substantially refined candidate

- Runnable Devvit/Phaser repository shape.
- Complete vector-fallback Builder and Runner vertical slice.
- Shared tile validator, route generator, founding tiles, scoring, achievements.
- Tenant-local Redis/server architecture.
- Scheduled route/post endpoints.
- Roadbook shuffle endpoint and menu action with local fallback.
- Deletion/recompile path.
- Builder undo/redo controls with bounded local edit history.
- Builder safe-path overlay sourced from shared deterministic movement logic.
- Shared reaction-margin validation rejects one-lane forced switches without two clean columns of warning, same-direction two-lane migrations without four columns of lead space, and forced switches into lanes hidden during the camera-lookahead window; validation issues include lane/column evidence and Builder grid highlighting.
- Builder repair UX shows required-fix counts and cycles through validator issues one at a time with highlighted cells when evidence is available.
- Runner feedback and tile seam labels reuse pooled text objects instead of allocating transient labels during rendering.
- Roadbook route-list scene with selected-route details, shuffle/play actions, and leaderboard panel.
- Route leaderboard persistence and Roadbook reads are scoped by route revision.
- Roadbook tile review panel supports structured reports and guarded author/moderator removal with route repair.
- Ranked runs submit lane-change events; the server replays route geometry to derive damage, rewards, completion, and score.
- Small CC0 Kenney Platformer Pack Redux meadow subset is imported, licensed, manifest-mapped, and preloaded behind semantic roles.
- Route Passport presents exactly four server-backed lifetime metrics—distance, featured tiles, clean deliveries, and failed deliveries—in matching mobile and square-share compositions.
- Runner first-run UI now shows clearer lane controls, large package-integrity pips, event-specific damage/reward feedback, and a compact object legend.
- Runner accepts playfield-wide vertical swipe and tap-a-lane input for lane changes; the previous right-side movement rail was removed after mobile dogfooding.
- Bounded routes show remaining distance and an in-course finish marker so Daily/Roadbook runs do not read as endless generation.
- Builder post-publish flow now offers `My Share Card`, `Test My Tile`, `Ride Today`, `Try Yesterday`, and `Roadbook`; Creator links onward to Roadbook, and `Test My Tile` uses preview mode and stays practice-only.
- Builder repair flow now includes `ERASE FIX` for the currently highlighted validator issue.
- Runner route rendering now uses semantic Kenney textures for road, crate, boost, and collectible roles when available, with vector fallback preserved.
- Runner HUD now shows route date, player-facing course version, average difficulty, and community-built percentage.
- Route Passport art uses a project-owned generated seal and clean/failed parcels plus the licensed Kenney landscape and collectible.
- Shared Phaser actions now have synchronized native DOM buttons for screen readers and Tab/Enter/Space operation, plus scene descriptions and live status announcements. The visual Builder grid and live Runner course remain explicit non-semantic canvas limitations for submission and dogfooding.
- Scoring calibration local sweep on 2026-06-29 left thresholds unchanged: clean no-reward founding-route runs land at Bronze, partial rewards at Silver, and full rewards can reach Gold.
- Detailed product roadmaps and governance.
- Passing local test/type/lint/build gates.
- The local Route Passport candidate passes repository/contracts/art validation, 24 test files / 100 tests, strict types, lint, formatting, a warning-free production build, and a zero-finding production dependency audit. T121 and private Reddit readback remain required before submission use.
- Authorized live attempt 3 installed `drawn-to-deliver` playtest `v0.0.1.13` in `r/drawn_to_deliver_dev` and exercised inline entry, expanded Menu, two consecutive ranked runs, Builder fail-closed validation and certification, Creator Card, and native Reddit sharing at an emulated `390x844` viewport.
- The attempt-2 `Ride Again` lifecycle crash is closed live: both consecutive attempt-3 runs reached Results without the prior stale Phaser-object failure or a matching critical runtime error.
- The controlled QC entry packet is now the operational source for accounts, devices, data setup, stop rules, rollback, and the first 25–30 minute dogfooding session.

## Current proof boundary

The candidate is ready to enter controlled QC, not public submission. Live proof currently covers an authenticated owner in Chrome device emulation. It does not yet cover a fresh non-owner, physical Reddit mobile client, general/public judge, successful ranked finish, independently located PNG download, or live report/remove/route repair.

Current live URL: `https://www.reddit.com/r/drawn_to_deliver_dev/?playtest=drawn-to-deliver`.

First-session contract: [`../goals/daily-dash-hackathon-refinement-v1/notes/QC-DOGFOODING-ENTRY.md`](../goals/daily-dash-hackathon-refinement-v1/notes/QC-DOGFOODING-ENTRY.md).

## Highest-value QC and submission backlog

1. **Fresh-member persistence proof.** Use a non-owner with no submission that UTC day. Publish once, reload, and prove Creator/Roadbook attribution. Do not reuse the owner account: the one-record-per-user/day API upserts the existing submission.
2. **Public/judge access proof.** Read back the documented administrative path from a clean role, then establish the final public or otherwise rules-compliant judge path without changing visibility merely to pass a test.
3. **Physical-device matrix.** Test portrait and rotated landscape in a real Reddit mobile client. Chrome emulation is accepted engineering evidence, not a physical-device claim.
4. **Ranked/share completion.** Obtain a successful ranked finish and a failed ranked ride, verify duplicate completion remains idempotent live, read back all four Route Passport values, and independently locate the saved image.
5. **Moderation/reporting QA.** Report and remove only a tile proven new to the QC session; confirm solver-valid route repair and revision behavior.
6. **Submission packaging.** Reconcile the exact accepted app version, app listing, public post, screenshots/video, README, and Devpost copy only after the live gates above pass.
7. **World Tour and Free Drive remain deferred.** Neither is an MVP or submission dependency.
