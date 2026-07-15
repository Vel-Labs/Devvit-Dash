# Changelog

## Unreleased

### Changed

- Rewrote the Devpost submission draft in a first-person, product-led voice; removed internal task/receipt language and documented primary/secondary Reddit-account testing in judge-facing terms.
- Strengthened the judge-facing Reddit-native story around individual authorship, subreddit-specific playable identity, and a truth-bounded future World Tour that federates opted-in local arcades instead of claiming global shared state today.

### Fixed

- Reorganized Builder into three bordered, glanceable steps—choose a tool, draw the tile, certify it—while hiding repair controls until the validator finds a blocker and withholding Test Ride/Publish until certification succeeds.
- Reined in Builder tool, history, page-navigation, and repair controls so their button faces and shadows stay inside the cards they belong to at portrait and landscape sizes.
- Stabilized both landscape and vertical video opening cards by removing the jitter-prone digital zoom while retaining the concise `Build Today. Ride Forever.` closing lockup.
- Rebuilt Roadbook as a Route Passport-quality archive with bordered route, snapshot, leaderboard, and stop-review cards; compact contextual controls now replace the oversized four-row button footer, and the selected route is the single primary action.
- Kept the portrait Roadbook moderation footer and its drop shadow inside the white panel instead of letting `REMOVE SELECTED TILE` spill below the section boundary.
- Replaced the gated Creator waiting screen with an always-populated player + creator card, added a direct current-Daily-Route action, and shielded the Builder grid while its post-publish actions are open.
- Reflowed the portrait Runner header into dedicated title, community, integrity, metadata, and right-side status rows so long subreddit names no longer collide with package pips.
- Replaced `ROAD SEGMENTS` result copy with game-world kilometers formatted from the same authoritative replay-derived column count.
- Stopped presenting failed ranked starts or completions as saved results; local fallbacks now carry a prominent practice label and do not imply achievement or leaderboard progress.
- Serialized mobile lane input as one adjacent move per logical column so rapid tap/slide gestures remain valid for strict server replay.
- Reconciled `Made the Map` from unique authored tiles in durable routes, repairing stale progress without double counting repeated profile loads or route revisions.
- Enlarged crate and parcel art, added shape-distinct warning/reward backplates, and split the Runner key into explicit `AVOID` and `COLLECT` cues.
- Enforced Builder object caps at placement time, clarified `BUILD POINTS` versus selected-tool counts, and rejected obstacle ten without mutating the draft.
- Made Builder cells direct-manipulation friendly: the selected item toggles off on a second tap, another selected tool replaces it, and each cell changes at most once in one continuous drag.
- Preserved the exact local Builder draft and edit/fresh intent through Test Ride, Results, and Back to Builder.
- Made Runner vertical slides request adjacent lane movement as thresholds are crossed instead of waiting for pointer release; tap-a-lane remains available.
- Reset Runner-owned Phaser object references and pools on every scene creation so `Ride Again` cannot reuse destroyed feedback text, sprites, labels, graphics, or courier parts from the previous run.
- Verified the Runner lifecycle repair in Devvit playtest `v0.0.1.13`: two consecutive ranked runs reached Results without the attempt-2 stale-object crash or a matching critical runtime error.
- Replaced silent same-day tile upserts with an explicit Builder re-entry choice and a truthful updated-versus-created publication result.

### Validation

- Reframed the root README as a judge-first consumption path with curated current screenshots, a 90-second product tour, plain-language retention and Reddit-native explanations, and a dedicated Phaser 4.2 innovation section before technical implementation detail.
- Preserved the exact `0.0.1.43` Playwright source recordings inside the final video package, rebuilt both 58-second masters from those durable sources, and confirmed the 1920×1080 and 1080×1920 hashes remain deterministic.
- Added paste-ready Developer Platform and Phaser integration feedback for the optional one-form-per-entrant Feedback Award survey.
- Re-ran the installed `0.0.1.43` phone journey at 390×844 across Menu, Builder, Roadbook, Achievements, Runner, and Results; no new P0–P2 layout or task-flow issue remained, while Share Card stayed explicitly bounded by the unauthenticated direct-webview fallback.
- Re-recorded Builder, certification recovery, Runner, and Roadbook motion from `0.0.1.43`; rebuilt and checksum-verified 58-second 1920×1080 and 1080×1920 screen-text cuts with no generated voiceover and a separate human-read script.
- Added card-model, creator-outcome API, typed Reddit identity-link, and kilometer conversion coverage for the physical-phone repair.
- Added pure client tests for Builder toggle/override/cap behavior, over-limit cleanup, draft re-entry, and Runner vertical-gesture thresholds.
- Requalified the refinement fingerprint with 17 test files / 67 tests, strict types, lint, repository/contracts/art validation, a warning-free production build, and zero production dependency audit findings.
- Exercised the authenticated-owner live flow at an emulated `390x844` viewport through inline entry, expanded Menu, Runner replay, Builder fail-closed/certified states, Creator Card, and Reddit-native sharing.
- Added a bounded QC/dogfooding entry contract that separates engineering readiness from still-unproven fresh-member, physical-device, public-judge, PNG-download, ranked-success, and live-moderation claims.
- Qualified same-day Builder re-entry with current-player/mismatched-record server tests, edit/fresh/responsive client tests, portrait keyboard and visual walkthroughs, 19 test files / 76 tests, a warning-free build, and zero production audit findings.

### Added

- Rebuilt My Share Card as the dynamic Route Passport selected during mobile dogfooding: four branded stamp panels show server-backed lifetime distance, featured tiles, clean deliveries, and failed deliveries in-app and in the square saved image.
- Added replay-authoritative cumulative distance and failed-delivery profile counters with a zero-default legacy migration that does not invent historical totals.
- Added project-owned passport-seal and clean/failed parcel raster assets with recorded ImageGen provenance and art validation.

- Added logical road-segment distance to Results; ranked distance is derived by server replay and never accepted from the client submission.
- Added a dedicated `Edit Today’s Tile` / `Start Fresh` screen when an authenticated player re-enters Builder with an active UTC-day submission. Neither choice changes persisted content before Publish.
- Added server-authoritative `created` / `updated` tile-publication dispositions and preserved the original creation timestamp when today’s submission is updated.
- Added explicit portrait and landscape client layouts instead of relying on a uniformly shrunken desktop canvas.
- Added dedicated portrait Roadbook, Runner, Results, and Achievements compositions and preserved the active viewport profile across Menu, Builder, Creator Result, replay, and completion transitions.
- Added portrait Runner geometry with full-height lane touch regions, an 11-column visible window, readable HUD separation, and the same canonical gameplay/replay rules as landscape.
- Added a mobile-first portrait Menu with readable stacked actions and safe-area-aware canvas sizing.
- Added deterministic six-column portrait Builder pages with previous/next navigation, absolute column ranges, page-aware painting, and validation-issue reveal while preserving the full 3×18 draft.
- Added a fitted-scale `Rotate to Build` gate so mobile editing never exposes normal Builder actions below a 44 CSS-pixel target floor; rotating back recreates the portrait presentation without discarding the draft.
- Increased large-landscape Builder header actions and moved `Erase Fix` out of the grid region.
- Replaced the Creator text list with a responsive, server-truth-backed Creator Result card inspired by shareable performance cards.
- Added Reddit-native current-post sharing through `showShareSheet`, clipboard fallback outside Reddit, and an independent 1080×1080 PNG save action.
- Relabeled creator-card metrics in player language—other players sampled, clean finishes, lane choices at your tile, and recorded crossings—while preserving the exact current-route sampling boundary.
- Tightened Creator Result claims to whole-route clean samples, tile-midpoint lane choices, and recorded crossings that may include the creator's own completed run.
- Removed tile and route identifiers from the Creator outcome response consumed by the share surface.
- Added pure client layout tests covering viewport selection, page boundaries, clamping, absolute-column mapping, and validation-issue page selection.
- Added viewport-matrix coverage for Creator → Roadbook → Runner and Menu → Achievements transitions at portrait phone, landscape phone, and desktop sizes.
- Builder undo and redo controls with bounded local edit history.
- Builder certification now overlays shared-validator clean paths for every covered entrance lane.
- Shared tile validation now rejects clean paths that require forced lane switches without two columns of reaction margin.
- Shared tile validation now requires four columns of lead space before a same-direction two-lane migration.
- Shared tile validation now rejects forced switches into lanes that were hidden by hazards during the camera-lookahead window.
- Reaction-margin validation issues now include lane and column evidence for Builder highlighting.
- Builder certification failures now highlight the implicated grid cell when validator evidence is available.
- Builder drafts now show required-fix counts and a `NEXT FIX` repair loop that cycles through validator errors one at a time.
- Founding weave/switchback fallback tiles were softened to satisfy the same reaction-margin rule as community tiles.
- Founding parcel-fork and ravine-choice fallback tiles were softened to satisfy the two-lane migration rule.
- Founding meadow-warmup, puddle-run, broken-boardwalk, market-street, and ravine-choice fallback tiles were softened to satisfy camera-lookahead fairness.
- Runner feedback and tile seam labels now reuse pooled text objects instead of creating transient labels during rendering.
- Roadbook scene lists tenant routes, shows route details, loads the selected route leaderboard, and preserves shuffle/play actions.
- Ranked run tokens and Roadbook leaderboards are now scoped to the route revision active when the run started.
- Added write-once route-revision snapshots and required ranked completion to replay against the exact immutable revision issued at start, including a fail-closed legacy backfill boundary.
- Replaced the racy run-token `GET` + `DEL` sequence with a post-validation watched atomic claim so duplicate completion requests cannot both apply ranked persistence effects.
- Added sliding 30-day authenticated-identity retention, irreversible inactive-user anonymization, and a two-confirmation owner data-deletion action.
- Explicit owner deletion now repairs current routes, deletes authored tile content, purges affected historical route revisions, removes rankings/progress/submissions, and anonymizes retained moderation facts.
- Replaced the weekly maintenance placeholder with bounded submission, identity, actioned-report, and daily-post-setting cleanup plus migration grace for existing users.
- Roadbook tile review now supports fixed-reason reports and guarded tile removal that triggers route repair.
- Ranked run completion now submits compact lane-change events and derives damage, parcels, boosts, completion, and score through shared server replay.
- Imported a small CC0 Kenney Platformer Pack Redux meadow subset and preloads mapped semantic art roles while preserving vector fallback.
- Added a Creator postcard that shows featured tile crossings and top/middle/bottom path-choice splits from server-derived route/run data.
- Runner first-run clarity now includes larger package-integrity pips, persistent lane/touch controls, swipe support, and clearer damage/reward feedback.
- Builder publish success now leads directly to `My Share Card`, `Test My Tile`, `Ride Today`, `Try Yesterday`, and `Roadbook`; the card explains when real featured-tile results become available and test rides stay practice-only.
- Builder repair flow now includes an `ERASE FIX` action for the currently highlighted validator issue.
- Runner route rendering now uses semantic Kenney road, crate, boost, and collectible textures when available, with vector fallback preserved.
- Runner route HUD now shows route date, player-facing course version, difficulty, and community-built percentage.
- Creator postcard entries now label featured status and clean-clear rate.
- Runner mobile controls now use playfield-wide vertical swipes and tap-a-lane input instead of a right-side movement rail.
- Bounded routes now show stronger finish affordances with remaining route distance and an in-course finish marker.
- Added native DOM button mirrors for Phaser actions, visible keyboard focus, native Tab/Enter/Space activation, scene-level accessible descriptions, and live status announcements.
- Connected the mobile creator journey end to end: Builder publish → share card → Roadbook, with plain-language Roadbook and Creator copy.
- Added truth-bounded app-listing and Devpost drafts, judge-access instructions, a live-only screenshot plan, and an under-one-minute demo script aligned to the July 15 submission rules.
- Updated the synchronized Devvit packages from 0.13.5 to 0.13.7 and Vite from 8.1.0 to 8.1.4, eliminating both build warnings and the shipped-production audit findings; the Devvit CLI now lives in development dependencies.

## 0.1.0 — 2026-06-25

### Added

- Devvit Web + Phaser repository baseline.
- Three-lane Builder with constrained tools and build budget.
- Shared deterministic tile validator and route generator.
- Founding tile library and cold-start route generation.
- Evergreen courier runner, score, medals, result, and achievements scenes.
- Tenant-local Redis repositories and Hono APIs.
- Daily scheduler/post routes, leaderboards, profiles, deletion, and route repair.
- Disabled World Tour adapter and tenancy contract.
- Vector fallback UI and Kenney art import plan.
- Full product/architecture/governance/roadmap documentation.
