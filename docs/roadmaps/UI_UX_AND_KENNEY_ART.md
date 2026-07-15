# UI/UX and Kenney Art Roadmap

## Art thesis

Daily Dash should look like a **handmade parcel-postcard arcade game**, not an untouched asset pack. Community-authored logic is rustic and grid-based; Kenney assets provide readable props and production value; a shared paper, ink, stamp, and cutout treatment makes them one identity.

The repository began in vector-fallback mode. A small CC0 Kenney Platformer Pack Redux meadow subset is now imported and preloaded behind semantic roles. Art replacement must never change collision, fairness, or tile serialization.

## Recommended Kenney source packs

Use only the subset that supports one coherent biome. Candidate roles:

- **Platformer Pack Redux / New Platformer Pack:** ground edges, bridges, crates, signs, vegetation, background pieces.
- **Racing Pack:** road props, barriers, cones, vehicle components where stylistically compatible.
- **UI Pack: Adventure:** panels, buttons, icons, progress frames.
- **Toon Characters 1:** optional courier base if it matches scale; otherwise make one custom courier from simple shapes.

Every imported pack must retain its included license information in an internal `THIRD_PARTY_ASSETS.md`. Do not use the Kenney logo as Daily Dash branding. Do not ship the All-in-1 archive or thousands of unused files.

## Visual language

### Materials

- Warm paper background.
- Dark blue-gray “ink” outlines.
- Soft cut-paper drop shadows.
- Slight texture overlay at low opacity.
- Stamped parcel and achievement marks.
- Road surfaces look assembled, not photorealistic.

### Core palette

| Token            | Use                    |
| ---------------- | ---------------------- |
| Ink `#243642`    | outlines, primary text |
| Paper `#FFF7DF`  | panels, cards          |
| Sky `#AEDFD8`    | main backdrop          |
| Road `#8F5B3A`   | traversable surface    |
| Orange `#EF8C4B` | primary action/courier |
| Green `#72BF9B`  | boost/certified/safe   |
| Red `#E05D4F`    | obstacle/damage        |
| Gold `#F2BF56`   | parcels/achievement    |

Biome palettes may remap scenery but must preserve hazard semantics.

## Asset-role manifest

Runtime code should request semantic roles, not raw filenames:

```json
{
  "courier-body": "characters/courier_orange.png",
  "parcel": "items/parcel_gold.png",
  "road-surface": "terrain/road_dirt_mid.png",
  "obstacle-crate": "props/crate_red.png",
  "boost-marker": "effects/boost_green.png",
  "collectible-stamp": "items/stamp_gold.png",
  "background-far": "backgrounds/meadow_far.png",
  "background-near": "backgrounds/meadow_near.png",
  "ui-panel": "ui/panel_paper.png",
  "ui-button": "ui/button_orange.png"
}
```

`assets/kenney-manifest.json` is the canonical mapping. Missing mappings fall back to vector graphics. The manifest validator prevents silent broken paths.

Current imported roles:

- `road-surface`
- `obstacle-crate`
- `boost-marker`
- `collectible-stamp`
- `background-far`
- `background-near`

Courier, parcel, and UI roles still use vector fallback until a matching source family is selected.

## Runtime asset budget

Target for the demo:

- 30–60 sprite files.
- One atlas per category when practical.
- One or two fonts; system fallback available.
- Six to ten short sound effects.
- One lightweight music loop at most.
- Compressed initial inline view below the expanded game dependency graph.

The splash entrypoint must not import Phaser or the full art atlas. It should load a tiny CSS illustration and request expanded mode on tap.

## Screen architecture

### Inline feed card

Purpose: explain the hook before expansion.

Content hierarchy:

1. Daily Dash logo.
2. “Build today. Ride forever.”
3. Today’s route status and community-authored percentage.
4. Primary button: Ride route.
5. Secondary cue: Build one tile.

No scrolling, hover dependency, tiny text, or complex gesture.

### Main menu

Left: title, tenant identity, daily status, buttons.
Right: animated miniature three-lane diorama showing obstacle, boost, parcel, and courier.

On portrait phones, the menu uses a dedicated stacked composition with large actions and concise status instead of scaling the desktop two-column composition. Portrait navigation preserves that viewport profile through Builder, Creator Result, Roadbook, Runner, Results, and Achievements instead of forcing a landscape canvas into the Reddit modal.

Primary actions:

- Ride today’s route.
- Build a course tile.
- Roadbook/Shuffle.
- Achievements.

World Tour is hidden when adapter disabled, not shown as a broken promise.

### Builder

- First card: five large tools and a concise active-tool readout.
- Second card: budget, undo/redo, and the full 3×18 tile; portrait shows the same tile in deterministic six-column pages.
- Third card: the immediate validator status and repair controls only when a blocker exists.
- Bottom: one certification action; Test Ride and Publish appear only after certification succeeds.
- Validation message adjacent to grid, not in a blocking modal.
- Safe path rendered as green road-stamp dots or a translucent ribbon.
- Error cells pulse once and retain an icon until fixed.

Portrait Builder is implemented as three deterministic six-column pages (`1–6`, `7–12`, `13–18`). The page is only a view: edits, history, validation, publication, and serialization retain one canonical 3×18 tile. Selecting a validator issue reveals its absolute-column page. Landscape continues to show all 18 columns.

The Builder now uses Roadbook's double-stroke section language to reduce menu-like cognitive load without turning the editor into another share card. Its visible hierarchy is `choose a tool → draw your tile → certify it`; repair and post-certification actions are progressively disclosed at the state where they become relevant. Semantic action mirrors follow the same visible/hidden state.

Tool, history, page-navigation, and repair buttons use compact card-relative dimensions and reduced shadows. Their complete painted bounds stay inside the owning section's inner inset in portrait and landscape layouts.

### Runner

- Courier left of center for reaction lookahead.
- HUD top: route, progress, package pips, parcels.
- Touch control zones at right, but visual indicators fade after first successful switches.
- Tile author sign at seam.
- Boost uses particles and audio, not excessive camera zoom.
- Damage produces one brief shake unless reduced-motion is active.

Portrait Runner uses the full 720×1280 logical stage: its three lanes occupy
separate tall touch regions, the courier stays left for lookahead, and the HUD,
course, reward key, and exit action do not overlap. The visible course window is
narrower than landscape, but canonical route timing, collision, lane changes,
replay events, and scoring remain identical.

Mobile dogfooding now requires hazard and reward meaning to survive low-attention and grayscale use: the real crate asset is enlarged over a square warning plate, the real parcel stamp is enlarged over a circular reward halo, and separate `AVOID` / `COLLECT` keys spell out their effects. These are presentation-only changes and do not alter collision geometry or scoring.

### Result postcard

- Completion/failure headline.
- Medal stamp animation.
- Score breakdown.
- Game-world kilometer distance formatted from replay-derived route columns for ranked runs.
- A prominent `RANKED RESULT SAVED` or `PRACTICE RESULT` persistence badge.
- Community-authored fraction.
- Best next action: replay, improve medal, or return to Builder.
- Newly unlocked achievement appears here, not as an unrelated dashboard interruption.

### Roadbook

- Weekly postcard chapters rather than an infinite undifferentiated list.
- Each route card: date, biome, medal, best score, author count, revision.
- Filters: unplayed, medal missing, community favorites later.
- Portrait navigation and moderation actions stay fully inside the paper panel, including button shadows at the bottom safe area.

The implemented Roadbook uses the same collectible-artifact hierarchy as Route Passport: a bordered saved-route cover, separate route-snapshot and leaderboard stamps, and a contained stop-review card. Previous/next controls live with the archive, report/removal controls live with stop review, and `Ride This Route` is the only full-width primary action. This preserves every route and moderation capability without presenting nine equal-weight footer buttons.

### Creator outcome

A separate postcard when a submitted tile is selected:

- route preview thumbnail;
- section number;
- crossings;
- clean-clear rate;
- path choice split;
- share/comment prompt that does not fabricate Reddit actions.

My Daily Dash Card is available from the main menu and Builder's post-publish prompt in responsive portrait and desktop layouts. Its selected Route Passport composition deliberately limits the share surface to four server-backed lifetime metrics: distance traveled, featured tiles, clean deliveries, and failed deliveries. A 2×2 stamp grid, real parcel art, a Daily Dash seal, identity, and one direct Daily Route action replace the earlier congested progress dashboard. The typed Devvit user model exposes a Reddit profile URL but not avatar image data, so the card does not fabricate or scrape an avatar.

Sharing is split into two honest actions: `Share to Reddit` uses the native current-post share sheet with controlled server-backed copy, while `Save Image` produces a standalone 1080×1080 passport using the same four labels and values. Because the native share API has no image attachment field, the image is not presented as automatically attached. Local fallback copies the same controlled text. The card and copy omit raw user IDs, tile/route IDs, tenant keys, tokens, and private URLs.

## Motion system

- 120–180 ms for button and tool feedback.
- 210 ms lane change.
- 300–450 ms card transitions.
- 600–900 ms medal or certification stamp.
- Parallax limited to two layers.
- All motion has a reduced setting; gameplay timing never depends on decorative animation.

The signature reveal can animate the logical grid into a dressed route: pencil cells appear, road tiles stamp into place, props rise, and the courier enters. Use it once per new route, then permit skip.

## Audio identity

- Pencil/chalk tick while painting.
- Rubber stamp for certification and achievements.
- Parcel bell at start/finish.
- Soft crate impact.
- Paper tear for package damage.
- Wind/whistle for boost.
- Short route-complete jingle.

Audio must start only after user interaction, expose mute immediately, and never be required for information.

## Responsive rules

Logical canvases: 1280×720 in landscape and 720×1280 in portrait, each scaled with `FIT`.

- Keep interactive content inside a 1,200×650 safe frame.
- On very narrow mobile, touch zones remain at least 22% of width.
- Portrait Builder cells remain comfortably tappable by showing six columns per deterministic page rather than all 18 simultaneously.
- Page controls display the absolute column range and map pointer input back to the full tile.
- Physical viewport changes do not discard an in-progress draft. Builder recreates its presentation when the viewport profile changes while retaining tile and history state.
- Landscape viewports whose fitted 1280×720 stage would render the smallest normal Builder action below 44 CSS pixels show a large rotate-to-portrait gate. The threshold accounts for both width- and height-constrained screens.
- Respect device safe areas in CSS.
- Never depend on hover.

Current verification boundary: pure layout tests cover viewport selection, compact-landscape gating, Builder page mapping, and Runner geometry. Local browser checks cover portrait and large-landscape Menu/Builder creation, the short-landscape rotate gate, page navigation, issue reveal, undo/redo, and draft persistence through rotation. A three-viewport transition matrix verifies Creator → Roadbook → Runner and Menu → Achievements canvas profiles; portrait visual receipts cover Roadbook, Runner, Results, and Achievements. A local same-session replay check now reaches Results, starts consecutive Runner scenes, renders damage feedback on a recreated scene, and continues beyond that event without the attempt-2 Phaser text-canvas failure. The lifecycle repair still requires a fresh authenticated Reddit playtest before mobile readiness can be claimed live.

Shared Phaser buttons register synchronized native DOM buttons in a scene-labeled navigation group. Keyboard focus reveals a visible 48px-minimum action, and native Tab/Enter/Space activation invokes the same callback as pointer input. Important async states are mirrored to an `aria-live` region. This makes the integrated menu, Builder actions, Creator actions, Roadbook actions, and destructive confirmation operable through semantic controls; it does not make painted grid cells or Runner course geometry fully screen-reader navigable.

Automated Phaser/WebGL evidence capture should use the local `?qaCapture=1` query so Chromium preserves the drawing buffer for complete screenshots after incremental scene updates. Production gameplay does not enable this evidence-only rendering option.

## Import workflow

1. Choose one pack family and inspect its included license. Completed for Kenney Platformer Pack Redux.
2. Copy only selected source files into a staging folder outside `public/`. Completed for a six-file meadow subset.
3. Rename to semantic snake-case names. Completed.
4. Normalize scale and pivot assumptions. Deferred until sprites replace vector rendering in-scene.
5. Pack sprites or copy optimized PNGs into `public/assets/kenney/`. Completed with plain PNGs.
6. Update `assets/kenney-manifest.json` and set mode to `kenney`. Completed.
7. Run `npm run validate:art`. Passing.
8. Test fallback by temporarily removing a mapping. Still pending.
9. Record pack, source URL, version/date, and license in third-party documentation. Completed in `docs/art/THIRD_PARTY_ASSETS.md`.

The Route Passport adds three project-owned generated raster assets under `public/assets/share/`. Their generator/date/provenance records live beside the Kenney mappings in `assets/kenney-manifest.json`, and `validate:art` verifies every declared file exists.

## Definition of done

- The game is visually coherent with only 30–60 imported sprites.
- No raw Kenney logo or default sample-screen composition appears.
- Inline view loads without Phaser/art atlas.
- Every hazard remains legible in grayscale and at phone scale.
- Vector fallback can run the complete game.
- Art replacement does not change a single validator or gameplay test.
