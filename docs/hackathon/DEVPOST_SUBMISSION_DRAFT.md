# Devpost Submission Draft — Daily Dash

## Submission identity

- Project: **Daily Dash**
- Tagline: **Build today. Ride forever.**
- App listing: `https://developers.reddit.com/apps/drawn-to-deliver`
- Demo post: `https://www.reddit.com/r/drawn_to_deliver_dev/comments/1uvsr1g/daily_dash_20260714_build_today_ride_forever/`
- Public repository: `https://github.com/Vel-Labs/Devvit-Dash`
- Demo video: `[OPTIONAL — exact public URL, under 60 seconds]`

## One-paragraph pitch

Daily Dash turns tiny daily contributions into a permanent community arcade. Members paint constrained three-lane course tiles, and shared deterministic rules certify that every starting lane has a zero-damage path. A seeded compiler combines accepted tiles into finite Daily Routes. Players protect three package-integrity pips while steering an auto-moving courier, then revisit an evergreen Roadbook, route-safe leaderboards, achievements, and a branded Route Passport that makes player and creator progress worth sharing.

## Inspiration

I love the anticipation created by daily games, but I wanted yesterday's participation to mean more than a cleared puzzle or expired score. Open-ended level editors can create lasting content, but they also introduce fairness, moderation, and usability problems. That led me to a smaller and more Reddit-native idea: let each community member create about six seconds of tomorrow's level, then prove that contribution is fair before anyone has to play it.

## What Daily Dash does

- **Daily Builder:** Members paint one 3×18 course tile using a constrained vocabulary and a 24-point budget.
- **Shared fairness certification:** Publication requires a server-rerun validator proving a readable zero-damage path from all three entrances.
- **Finite community routes:** Deterministic compilation mixes certified submissions with equally validated founding tiles.
- **Courier Runner:** Players steer by keyboard, touch, tap, or swipe while collecting parcels and protecting three package-integrity pips.
- **Evergreen Roadbook:** Previous Daily Routes remain replayable with version-safe scores, contributor history, and private fixed-reason reporting.
- **Visible creator impact:** The Route Passport shows server-backed lifetime distance, featured tiles, clean deliveries, and failed deliveries, then links directly to today's route and exports a square share image.
- **A reason to return:** Recurring posts, daily submissions, streaks, achievements, leaderboards, saved routes, and delayed creator outcomes ensure that tomorrow is meaningfully different from today.

## Why Daily Dash belongs on Reddit

Reddit is made of communities and individuals with radically different tastes, traditions, skill levels, and creative instincts. Daily Dash turns those differences into something playable. Each constrained tile preserves one person's design choices. As those tiles accumulate, every subreddit develops its own course-building fingerprint, while the Roadbook records how that community style changes over time.

The community does not merely discuss the game—its contributions become literal course geometry. Shared rules preserve merit and playability, fixed report reasons keep moderation bounded, and creator attribution makes individual impact visible. The result is not a game decorated with Reddit references; it is a game whose world could not evolve without Reddit participation.

Daily Dash is deliberately subreddit-local today. In the future, an opt-in World Tour could connect distinct community-built arcades while preserving source identity, authorship, moderation, and removal propagation. That would be a federation of strong local identities, not a claim that private installation data is globally shared now.

## How I built it

I built the expanded game as a Phaser + Vite client inside Devvit Web. Hono endpoints run in Devvit's Node serverless runtime and use installation-scoped Redis. Pure TypeScript under `src/shared` owns tile validation, route generation, replay, scoring, and achievements, allowing responsive client feedback and server authority to follow the same deterministic rules.

Ranked rides bind to immutable route versions. The client sends bounded lane-change events; the server loads the exact route version issued at the start, replays the ride, derives damage, rewards, completion, score, and distance, then atomically claims the one-use run token only after validation. The server also reruns tile certification, derives identity from Devvit context, and never accepts client-selected tenant, author, status, metrics, or score.

I tested Daily Dash using both primary and secondary Reddit accounts across desktop and mobile flows, including real play inside Reddit on a physical iPhone. Those sessions directly shaped the mobile Builder, Runner feedback, result persistence, Roadbook hierarchy, Route Passport, and touch controls.

## Best Use of Phaser

Phaser powers two complementary play surfaces from the same deterministic course data: a responsive painter-like Builder and a real-time side-scrolling courier game.

For the Builder, I used Phaser for pointer painting, undo and redo, repair highlighting, safe-path overlays, resize handling, and portrait pagination that preserves the full 18-column draft instead of shrinking desktop controls below a usable size. For the Runner, I used playfield-wide touch gestures, keyboard input, lane tweens, camera shake, deterministic route rendering, reusable feedback effects, and semantic replaceable art roles. Phaser provides the expressive, tactile layer while shared pure logic keeps fairness and ranked replay identical on the client and server.

## Best Use of Retention Mechanics

Daily posts and UTC-based submissions feed an evolving route archive instead of replacing yesterday's content. The Roadbook, route leaderboards, streaks, achievements, and delayed creator outcomes create several reasons to return: ride today's new course, improve an older score, see whether a tile was selected, or discover how the community handled it.

The central loop is simple: build today, ride tomorrow, and revisit the routes the community created together.

## Best Use of User Contributions

User contributions are the game's level geometry, not a decorative feed. Contributors work inside a constrained tool and budget system. Server certification prevents unfair layouts from entering the candidate pool, deterministic compilation balances authors and difficulty, and removal repairs affected current routes. There is no free text, upload, URL, or arbitrary drawing surface, which keeps the contribution loop expressive without making moderation unbounded.

## Challenges I overcame

- I made an 18-column level editor usable inside a portrait Reddit WebView without changing its canonical data.
- I defined fairness beyond basic reachability by accounting for reaction margin and camera lookahead.
- I kept repaired routes and in-flight ranked rides honest through immutable route versions and server replay.
- I designed a celebratory Route Passport whose four lifetime claims remain exact across legacy profiles, clean and failed runs, and private identifiers.
- I separated native Reddit post sharing from truthful image export because the native share API cannot attach the generated card directly.
- I implemented identity minimization and owner deletion without breaking evergreen route validity.

## Accomplishments I am proud of

- One shared validator governs Builder feedback, server publication, founding tiles, and whole-route compilation.
- The mobile Builder uses deterministic six-column pages, large actions, rotation-safe draft preservation, and visible repair guidance.
- Ranked completion is replay-derived and revision-bound, with an atomic run-token claim only after validation.
- The Route Passport combines player and creator history without fabricating unavailable statistics or exposing private identifiers.
- Native Reddit sharing returns people to the playable post, while the game separately produces an honest square image export.
- User identity has a sliding retention window, explicit content and progress deletion, and bounded maintenance.
- The project passes repository, contract, art, unit and integration, type, lint, format, build, and production-dependency audit gates.

## What I changed during the hackathon

I substantially expanded and refined Daily Dash after June 17. The hackathon work added responsive portrait and landscape layouts, mobile touch controls, reaction-margin fairness rules, Builder undo and redo, repair guidance, post-publish continuation, creator share cards, semantic keyboard actions, immutable ranked-route replay, atomic run claims, server integration tests, owner data deletion and retention, and submission-focused mobile polish.

## What I learned

I learned that the strongest community UGC loop is not necessarily the most permissive one. A small vocabulary, a strong validator, visible creator impact, and permanent replay history can create more trust and anticipation than an editor that accepts anything.

I also learned to treat share visuals and share transport as separate product problems. Reddit can share the playable post while Daily Dash independently exports a truthful visual record of a player's progress.

## What comes next

My near-term priorities are continued live-device calibration, broader member and moderator dogfooding, and app-review clarification for account-deletion signaling. World Tour, payments, jumping, live multiplayer, and infinite mode are deliberately outside the MVP. The current game is already a complete subreddit-local loop: build today, ride tomorrow, and preserve what the community creates.
