# Hackathon Delivery Roadmap

Current planning date: **June 25, 2026**. Submission target from the official rules: **July 15, 2026 at 6:00 pm PT**. Before any final submission claim, review [`../hackathon/RULES_COMPLIANCE.md`](../hackathon/RULES_COMPLIANCE.md) against the live rules and Devvit Rules.

2026-07-13 refinement status: app-listing copy, Devpost narrative, judge access, screenshot plan, and 58-second demo script are staged under `docs/hackathon/`. Playtest `v0.0.1.13` closed the repeated-run lifecycle P1 and exercised the authenticated-owner mobile-emulation path. The candidate is ready for controlled QC; public/general judge access, fresh-member persistence, physical-device captures, live moderation, and final submission-version reconciliation remain explicit gates. These drafts are not proof of publication or submission.

2026-07-15 packaging status: installed client `0.0.1.43` passed a fresh 390×844 QOL pass across Menu, Builder, Roadbook, Achievements, Runner, and Results. Fresh Builder, certification, Runner, and Roadbook footage now drives checksum-verified 58-second landscape and vertical screen-text cuts under `outputs/final-video-package-20260715/`, with a separate human-read script and the exact raw captures preserved for rebuilds after transient Playwright cleanup. The root README now leads with a judge itinerary, consumer journey, Reddit-native return loop, and dedicated Phaser 4.2 section. Paste-ready Developer Platform/Phaser feedback is staged for the optional Feedback Award survey. The direct capture is explicitly local-practice client proof; judge-accessible Reddit persistence and physical-device behavior remain outside that video claim.

Dependency freeze: synchronized Devvit packages are pinned to 0.13.7, the six-day-old stable patch that added Vite 8 support and moved affected transitive security ranges past 0.13.6. Vite is pinned to 8.1.4, which produces a warning-free build with that plugin. The same-day 0.13.8 maintenance release and unrelated Phaser/Hono/tooling patches are intentionally deferred until after submission unless a candidate-blocking issue appears.

## June 25–27 — prove the artifact

- Install dependencies and initialize Devvit app name.
- Run official playtest post.
- Validate shared contracts and founding tiles.
- Finish Builder → test ride → result vertical slice on phone.
- Decide final product name and custom courier identity.

Gate: no persistence or achievements work can compensate for an unfun tile-to-run transformation.

## June 28–July 2 — complete core gameplay

- Undo/redo and safe-path overlay.
- Lane lookahead and reaction-margin validator.
- Runner collision/recovery polish.
- Small Kenney-derived meadow subset imported; full in-scene sprite replacement remains polish.
- Tutorial through action, not modal paragraphs.
- Result score tuning across founding routes.

Gate: first-time player succeeds in understanding both loops.

## July 3–6 — durable tenant loop

- Redis integration in real playtest.
- Authenticated publish and one-daily-submission transaction.
- Daily route compiler and scheduled post.
- Roadbook route list.
- Run token and leaderboard.
- Owner deletion and route revision.

Scope checkpoint: if this is unstable on July 6, cut weekly mode, path analytics, and advanced achievements—not polish/testing.

## July 7–10 — retention and creator consequence

- Feature reveal.
- Crossings and creator postcard.
- Six launch achievements.
- Streak.
- Weekly chapter presentation.
- Moderator controls/reporting.

World Tour remains a document/adapter unless all local gates are green.

## July 11–13 — break and polish

- Device matrix.
- Cold start and zero-player route.
- Date rollover and scheduler retry.
- duplicate submit/run requests.
- removed tile in archived route.
- slow API/local practice fallback.
- reduced motion, mute, text scale.
- asset/license audit.

## July 14–15 — freeze

- No new mechanics.
- Deploy final version.
- Create public demo post with founding route history already visible.
- Verify app listing, permissions, rules, privacy/deletion behavior.
- Verify Devpost package: app listing link, public test subreddit, public game post, README, text description, and optional sub-one-minute demo video.
- Record short demo capture only if submission allows/benefits.
- Fix submission blockers only.

## Demo-post script

The post must demonstrate the whole proposition immediately:

1. Ride an existing route.
2. See community tile attribution.
3. Enter Builder and create a tile.
4. Certify/test it.
5. Explain that daily compilation creates tomorrow’s permanent route.
6. Show Roadbook growth and creator crossings using seeded demo data where honest and labeled.

## Prize alignment

- **Hook/retention:** delayed feature outcome + daily route + permanent Roadbook.
- **Phaser:** editor input, procedural rendering, lane simulation, particles/audio, route compiler visualization.
- **User contributions:** certified tiles are literal gameplay geometry.
- **Polish:** mobile-first, single coherent art direction, cold-start founding routes, clear moderation.
