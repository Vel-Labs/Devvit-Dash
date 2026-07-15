# Decision Log

## D-001 — Use the official Devvit Phaser structure

**Date:** 2026-06-25
**Status:** Accepted

Use Vite + Phaser client, Hono server, and pure shared TypeScript. Overlay product governance rather than making the governance scaffold the runtime base.

## D-002 — Three-lane logical tiles replace freeform physics lines

**Date:** 2026-06-25
**Status:** Accepted

A 3×18 grid makes user content objectively certifiable, composable, mobile-friendly, and safer to moderate. The visual editor may feel painterly, but serialized truth remains discrete cells.

## D-003 — Finite evergreen routes before infinite mode

**Date:** 2026-06-25
**Status:** Accepted

Finite routes have destinations, reproducible leaderboards, medals, attribution, and deterministic whole-route validation. Long Haul/infinite chaining is a later reuse of certified content.

## D-004 — Neutral connectors on every tile

**Date:** 2026-06-25
**Status:** Accepted

All three lanes are clear for the first/last three columns. This reduces expressive range but makes independent user tiles safely composable and protects players entering from any lane.

## D-005 — Subreddit installation is the default tenant

**Date:** 2026-06-25
**Status:** Accepted

Use installation-scoped Redis for local tiles/routes/profiles. Cross-subreddit discovery requires a separate external catalog and moderator opt-in; it is disabled in MVP.

## D-006 — Kenney assets are a semantic skin

**Date:** 2026-06-25
**Status:** Accepted

The repository ships vector fallback and an asset-role manifest. Selected license-verified Kenney assets can replace semantic roles without changing collision or data.

## D-007 — Package integrity uses three full pips

**Date:** 2026-06-25
**Status:** Accepted

Obstacles and gaps each remove one pip; the third failure ends delivery. Full pips are clearer than half-hearts and align with the courier fiction.

## D-008 — Leaderboards are route-revision scoped

**Date:** 2026-06-28
**Status:** Accepted

Route repair can change playable geometry while preserving route identity. Ranked run tokens bind the revision issued at start, and best-run storage is namespaced by route revision so old scores never compete against repaired route layouts.

## D-009 — Reports use fixed reason codes only

**Date:** 2026-06-28
**Status:** Accepted

Daily Dash keeps moderation input constrained like Builder input. Route/tile reports use predefined reason codes and server-side identity rather than free text, uploads, links, or chat.

## D-010 — Ranked scores derive from lane-event replay

**Date:** 2026-06-28
**Status:** Accepted

Ranked run submissions include bounded column-indexed lane events. The server replays those events against the stored route geometry and derives damage, rewards, completion, and score instead of trusting client summary counters.

## D-011 — Two-lane migrations need four columns

**Date:** 2026-06-28
**Status:** Accepted

The deterministic solver may prove a zero-damage path that crosses from one edge lane to the other quickly, but certification must also protect human reaction time. Same-direction two-lane migrations require at least four columns between the first and second lane change; founding fallback tiles obey the same rule as community submissions.

## D-012 — Destination lanes must be visible before forced switches

**Date:** 2026-06-28
**Status:** Accepted

The fair-path solver rejects forced lane changes into a destination lane that was blocked during the camera-lookahead window immediately before the move. This keeps certified paths readable in the runner, where the courier sits left of center and players must see the safe route before committing to a lane change.

## D-013 — Do not ship raw Redis diagnostics by default

**Date:** 2026-06-29
**Status:** Accepted

Direct Redis proof is useful for platform audits, but a reusable diagnostics panel can become an unnecessary data surface. If diagnostics are needed, expose only aggregate health signals behind authenticated moderator checks: tenant id/name, current app version, daily route id exists, stored route count, certified tile count, profile count, report count, current user's profile exists, and today's post setting exists. Do not expose raw Redis values, arbitrary key lookup, user ids beyond the current user, run tokens, report bodies, or tile JSON.

## D-014 — Post-publish test rides are explicitly practice-only

**Date:** 2026-06-29
**Status:** Accepted

After a certified tile is published, Builder offers `My Share Card`, `Test My Tile`, `Ride Today`, `Try Yesterday`, and `Roadbook`. The share-card destination honestly explains that results appear only after the tile reaches a Daily Route and completed rides arrive. `Test My Tile` starts a preview route and never writes ranked leaderboard results; ranked play only starts from stored route id + revision routes issued by the server.

## D-015 — Runner sprites remain semantic and replaceable

**Date:** 2026-06-29
**Status:** Accepted

Runner route objects may render with curated Kenney textures for readability, but gameplay continues to depend only on canonical cells and semantic roles. Missing art falls back to vector drawing, and no rule or collision path may depend on a filename.

## D-016 — Mobile Runner input belongs on the playfield

**Date:** 2026-06-29
**Status:** Accepted

The right-side movement rail is not accessible enough in Reddit mobile view. Runner mobile input should use the course itself: vertical swipes move one lane, and tapping a top/middle/bottom lane region moves one legal step toward that lane. Ranked replay still records adjacent lane-change events only.

## D-017 — Portrait Builder uses deterministic six-column pages

**Date:** 2026-07-13
**Status:** Accepted

Daily Dash uses explicit portrait and landscape logical layouts rather than shrinking the desktop canvas until controls become unreadable. Portrait Builder shows six of the canonical 18 columns at a time, with previous/next controls, a visible absolute-column range, and pointer translation from the visible page to the full tile. Validation issues reveal the page that contains the implicated column, while undo, redo, certification, publication, and serialization continue to operate on one unchanged 3×18 draft. Landscape Builder continues to show all 18 columns.

Builder listens for viewport-profile changes and recreates its presentation while preserving the in-memory draft. Short landscape viewports do not expose a uniformly shrunken editor: they show a large rotate-to-portrait gate and recheck action. Menu still chooses its composition when created or recreated.

## D-018 — Short landscape gates Builder editing

**Date:** 2026-07-13
**Status:** Accepted

When Phaser's 1280×720 landscape stage would FIT its smallest 54-logical-pixel Builder action below 44 CSS pixels, Daily Dash pauses editing behind a readable `Rotate to Build` panel with large `Back` and `Rotated? Recheck` actions. The calculation uses the smaller of the viewport width and height scale factors, so width-constrained and height-constrained devices receive the same target guarantee. Rotating back to portrait automatically recreates the Builder presentation without discarding the 3×18 draft or its edit history. Large landscape and desktop viewports retain the full 18-column editor.

Automated Chromium captures of the Phaser WebGL canvas can read an incomplete back buffer immediately after undo even though the scene state remains intact. The local `?qaCapture=1` evidence mode preserves the drawing buffer for stable automation screenshots. Normal Reddit gameplay leaves buffer preservation disabled to avoid imposing an unmeasured mobile rendering cost. This QA switch does not change gameplay, serialization, scene state, or the production renderer type.

## D-019 — Creator sharing separates post sharing from image saving

**Date:** 2026-07-13
**Status:** Accepted

The Creator Result is built only from the authenticated creator's current tenant route records, current revision best-run samples from other players, and lifetime profile counters. Clean metrics are labeled as whole-route best-run samples, and lane choices are labeled as the tile-midpoint sample; neither is presented as tile-local or all-time behavior. The lifetime profile counter is labeled as recorded crossings across featured route appearances because it does not exclude a creator's own completed run. A zero-sample tile uses an incoming state instead of a fabricated `0%` rate.

`showShareSheet` is the primary Reddit action and shares controlled text plus the current post link; the installed API does not accept an image attachment. `Save Card PNG` independently renders a 1080×1080 card without IDs, tenant keys, tokens, or private URLs. If the native share sheet is unavailable outside Reddit, controlled copy falls back to the clipboard. The UI does not imitate unsupported Facebook, Telegram, WhatsApp, or X integrations.

## D-020 — Ranked completion replays immutable route revisions

**Date:** 2026-07-13
**Status:** Accepted

Every stored route revision is a write-once `RouteBundle` snapshot. The current-route hash may advance to a repaired revision, but an existing `routeId + revision` field cannot be rewritten with different bytes. Ranked start backfills a legacy current route only when its embedded revision exactly matches the revision being bound; an unrecoverable older revision fails closed instead of replaying against new geometry.

`RunSubmission.routeRevision` is required. Completion loads the server-issued token without consuming it, validates token identity, exact revision, expiry, timing, immutable snapshot integrity, and lane-event replay, then atomically claims the one-use token with Redis `WATCH`/`MULTI`/`EXEC`. Only the successful claimant may write the best run and profile effects. Client counters, completion status, score, identity, and current-route geometry remain non-authoritative.

## D-021 — Privacy deletion outranks attribution history

**Date:** 2026-07-13
**Status:** Accepted

Daily Dash retains authenticated identity on a sliding 30-day activity window. Inactive identities are irreversibly removed from profiles, rankings, submissions, tiles, route snapshots, and moderation attribution while deterministic geometry may remain under `Deleted player`. Existing identities without an activity timestamp receive a 30-day grace period on first maintenance.

Explicit owner deletion is stronger than inactivity anonymization: current routes are rebuilt without the requester’s tiles, tile content is deleted, and historical revisions containing that content are purged with their rankings. This is the only privacy exception to byte-level snapshot immutability; retained gameplay cells may never change in place. The app exposes a two-confirmation user action and a server endpoint that derives identity and tenant exclusively from Devvit context.

Open structured reports remain actionable but lose deleted/inactive identity. Actioned reports expire after 180 days, submission hashes after 35 days, and daily post settings after 90 days. The current Devvit Web configuration has no account-deletion trigger, so the app does not claim one; the 30-day window, owner action, and an app-review question are the implemented mitigation.

## D-022 — Canvas actions have a semantic keyboard mirror

**Date:** 2026-07-13
**Status:** Accepted

Phaser remains the visual and pointer surface, but every shared `createButton` action also registers a native DOM `button` in the current scene action group. Those controls expose the same label and callback to screen readers and keyboard users, appear visibly when focused, support native Tab/Enter/Space behavior, and are removed with their Phaser object. Dynamic destructive-action labels and disabled state update both surfaces together.

Scene changes publish a concise accessible scene description and important asynchronous outcomes through an `aria-live` status. This strategy does not claim that the canvas art, Builder grid cells, or high-speed Runner course are fully screen-reader navigable; it establishes semantic access to the integrated navigation/action layer while the remaining non-button accessibility boundary stays explicit for submission and dogfooding.

## D-023 — Scene transitions preserve the active viewport profile

**Date:** 2026-07-13
**Status:** Accepted

A portrait Reddit expanded modal remains a portrait game surface across Menu,
Builder, Creator Result, Roadbook, Runner, Results, and Achievements. Navigation
must not force Phaser to 1280×720 in anticipation of a landscape-only target;
each destination applies the current viewport profile and owns a deliberate
portrait or landscape composition.

Portrait Runner uses the full 720×1280 logical stage with three vertically
separated lane regions, a narrower visible-column window, playfield-wide swipe
and tap input, and non-overlapping HUD/actions. Canonical route geometry,
timing, lane-event replay, scoring, and persistence do not vary by layout.
Roadbook, Results, and Achievements similarly rearrange existing information
and actions without redefining product or moderation behavior.

## D-024 — Recreated Runner scenes must not retain destroyed display objects

**Date:** 2026-07-13
**Status:** Accepted

Phaser may retain the `RunnerScene` instance while destroying its display-list
children during a transition to Results. Every Runner creation therefore drops
all cached display-object, tween, keyboard, pointer, and pooled-map references
before constructing the new scene. The feedback text is created as part of the
new scene rather than first being allocated during an update event. A defensive
active-object check may recreate it, but no replay may call `setText` on an
object owned by the previous run.

This is a presentation-lifecycle rule only. It does not change route geometry,
collision, timing, lane-event replay, scoring, server validation, or
persistence.

## D-025 — Same-day Builder re-entry is explicit and non-destructive

**Date:** 2026-07-13
**Status:** Accepted

One authenticated player has one active submission per UTC day. Returning to
Builder with an active submission must therefore show a dedicated choice before
the editor: `Edit Today’s Tile` loads a defensive copy of the stored geometry,
while `Start Fresh` creates a blank local draft. Neither choice writes, removes,
or replaces persisted content. Only a later successful `Publish` updates the
same daily submission.

Bootstrap may return only the current authenticated player’s active daily tile
after server-side tenant and author checks. Publication continues to rebuild
tenant, author, status, width, metrics, and certification on the server. Its
response explicitly reports `created` or `updated`, and an update preserves the
submission’s original creation time. The player-facing result must say when the
same daily submission was updated rather than implying that another tile was
created.

## D-026 — Builder edits are reversible at the cell and preview boundaries

**Date:** 2026-07-14
**Status:** Accepted

Builder uses explicit tool selection with direct cell semantics. Applying the
selected non-road tool to ordinary road adds it; applying it to the same item
removes it; applying a different tool replaces the existing item. One
continuous pointer gesture may change each cell at most once so dragging back
over a cell cannot toggle it repeatedly.

The client checks the canonical per-object caps and total build-point budget on
every candidate edit and rejects only changes that move farther beyond a limit.
This lets a legacy over-limit local draft remove items toward validity while
making obstacle ten fail immediately. Shared and server certification remain
authoritative and retain the same cap values.

A practice Test Ride carries a defensive local Builder return payload through
Runner and Results. `Back to Builder` restores the exact draft plus its
new/edit/fresh intent; it does not persist or publish anything. Runner vertical
slides consume threshold crossings during pointer movement and emit only
adjacent lane requests, while short gestures preserve tap-a-lane behavior.

## D-027 — Result truth follows persistence, and ranked distance follows replay

**Date:** 2026-07-14
**Status:** Accepted

A visually successful local ride is not evidence that Reddit persistence succeeded. Runner records only one adjacent lane event per logical column, and the server remains the authority for ranked replay. Results may say `RANKED RESULT SAVED` only after the completion endpoint accepts the token, revision, timing, replay, and atomic claim. A start or completion failure still returns a useful local Result, but it is visibly labeled practice and does not advance rankings or achievements.

Ranked distance is derived from the same server replay as damage and rewards. It counts logical route columns through the failure column or the full route on completion, is capped at route length, and has no scoring effect. Practice uses the same unit for honest local feedback without becoming ranked authority.

Featured-tile achievement progress is reconciled from unique, non-removed authored tile IDs in durable routes on authenticated profile load. Repeated loads and repeated appearances of the same tile do not increment it again. This may repair stale `Made the Map` progress, but an unpersisted clean run is never retroactively credited.

## D-028 — The share card is identity-first; sampled tile performance is optional

**Date:** 2026-07-14
**Status:** Accepted

My Daily Dash Card must remain useful before a creator tile is selected for a route or sampled by other players. The server returns the authenticated profile plus the current Daily Route, and the card always shows truthful player and creator progress. A strongest current featured-tile outcome may add detail, but an empty sample may not replace the identity card with a promised future state.

The native share sheet continues to share the current Reddit post, and the card includes an in-app action that starts the exact Daily Route supplied by the server. Raw user IDs, tenant IDs, route IDs, and tokens remain excluded. The installed typed Devvit `User` surface exposes the public profile URL but not an avatar image; Daily Dash therefore does not scrape, infer, or fabricate a user avatar.

Ranked distance remains a server-derived route-column count. Results express it as game-world kilometers using a fixed ten meters per route column solely to improve player comprehension; this conversion cannot affect replay, scoring, or persistence.

## D-029 — Route Passport is a four-metric lifetime identity card

**Date:** 2026-07-15
**Status:** Accepted

The share surface uses the user-selected Route Passport visual direction and exactly four glanceable metrics: distance traveled, featured tiles, clean deliveries, and failed deliveries. The in-app card and 1080×1080 export use the same model, labels, values, identity, and Daily Route date. Reddit sharing continues to share the current post; saving the image remains a separate action.

Distance and failure counts are profile fields advanced only by accepted server replay. Every accepted run adds its authoritative partial or complete column distance; completed zero-damage runs increment clean deliveries, while replay-derived non-completions increment failed deliveries. Practice fallbacks do not advance the passport. Older profiles initialize the new fields to zero rather than reconstructing incomplete history from best-run records.

The passport uses project-owned generated raster assets for the seal and clean/failed parcels plus the existing licensed Kenney background and collectible. Their paths and provenance live in the art manifest. The card does not scrape or fabricate a Reddit avatar, expose private identifiers, or restore the congested multi-stat dashboard.

## D-030 — Roadbook controls belong to the artifact they affect

**Date:** 2026-07-15
**Status:** Accepted

Roadbook follows Route Passport's collectible-artifact visual language rather than presenting route navigation, play, shuffle, moderation, and exit as one undifferentiated footer. Previous/next controls belong inside the saved-route cover; stop selection, report reason, report, and guarded removal belong inside the stop-review card. `Ride This Route` is the sole full-width primary action, with `Surprise Me` and `Back` treated as secondary choices.

This is a presentation hierarchy only. Route selection, revision-scoped ranking, structured private reporting, guarded removal, route repair, server trust, and ranked-versus-practice behavior are unchanged. Semantic DOM mirrors retain precise action labels even where the painted control uses shorter copy.

## D-031 — Builder reveals actions at the step where they become useful

**Date:** 2026-07-15
**Status:** Accepted

Builder uses the same bordered collectible-workshop hierarchy as Roadbook while preserving its direct-manipulation editor identity. The default screen presents three explicit steps: choose a tool, draw the tile, and certify it. Undo/redo stay attached to the blueprint, validator status stays adjacent to the grid, and Back remains secondary.

Repair controls are hidden unless the shared validator reports a blocking issue. Test Ride and Publish are hidden until a successful certification has produced safe paths for every entrance lane. Painting, undoing, redoing, or clearing history removes that certified presentation and returns the player to the certification step. Hidden Phaser actions are also hidden and disabled in the semantic DOM mirror.

Controls embedded inside a Builder card use compact sizing and reduced shadow offsets. Their full painted bounds must respect that card's inner inset; tool, history, page-navigation, and repair controls may not borrow space from the surrounding panel or cross a section border.

This is progressive disclosure, not a rules change. The shared validator, server recertification, build budget, object caps, tile serialization, tenant scope, and publication identity remain authoritative and unchanged.
