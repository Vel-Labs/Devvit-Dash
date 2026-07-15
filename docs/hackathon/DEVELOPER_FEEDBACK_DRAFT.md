# Developer Platform feedback — paste-ready notes

Status: draft for the optional Games with a Hook developer satisfaction survey. One feedback form is allowed per entrant. The official rules require actionable SDK or documentation feedback submitted before the July 15, 2026 6:00 PM Pacific deadline.

Survey: <https://forms.gle/YByxxCneDsn174qb9>

## Short project context

I built Daily Dash, a mobile-first Devvit Web game using Phaser 4.2, Vite, Hono, TypeScript, and installation-scoped Redis. It combines a constrained course-tile Builder, shared deterministic certification, a real-time lane Runner, daily route compilation, leaderboards, achievements, moderation, explicit data deletion, and a shareable Route Passport.

## What worked well

- Devvit Web made it practical to bring an existing web-game workflow and Phaser scene model into Reddit.
- Installation-scoped Redis maps naturally to subreddit-owned game state.
- `requestExpandedMode` allows a lightweight inline post to lead into a substantial game surface.
- The Devvit context boundary makes it possible to derive subreddit and user identity on the server rather than trusting the client.
- Phaser, Hono, Vite, and pure shared TypeScript worked well together once their responsibilities were kept separate.

## Highest-value improvements

### 1. Provide an authenticated Devvit Web capture and test harness

Directly opening an installed webview is useful for visual automation, but it loses the Reddit parent bridge. The app then correctly falls back to practice mode, which means automated screenshots and video cannot prove persistence, native sharing, identity, or ranked endpoints.

An official harness that supplies a safe test bridge—or documented Playwright helpers for an authenticated playtest post—would make responsive, regression, and submission-video testing much more reliable without encouraging developers to mock platform authority.

### 2. Make judge-access readiness a first-class deployment checklist

The relationship between app listing visibility, private playtest subreddits, the Admin Helper path, public demo posts, and clean-session judge access is difficult to reason about near submission time.

A single CLI or developer-console readback that reports app version, installed subreddit, demo-post URL, visibility, judge-access method, and whether the exact version is still available would prevent many avoidable submission failures.

### 3. Expand native sharing guidance and capabilities

The native share sheet can share the current Reddit post, while a canvas-generated Route Passport must be downloaded separately because the share API has no image-attachment field.

Either an image attachment option or an official documented pattern for “share post + save branded result image” would help games create honest social loops without implying that an exported image was attached when it was not.

### 4. Add a canonical account-deletion lifecycle signal

Daily Dash supports explicit in-app deletion, inactivity cleanup, attribution anonymization, and route repair. The remaining ambiguity is detecting Reddit account deletion when no configured Devvit Web trigger is available.

A documented deletion event or supported lifecycle hook would let apps remove or anonymize installation-local data consistently and make app-review answers much clearer.

### 5. Publish a Devvit Web compatibility matrix

Devvit, `@devvit/web`, `@devvit/start`, Vite, Node, and TypeScript versions move independently. A small supported-version matrix plus upgrade notes would reduce time spent separating application bugs from toolchain mismatches.

### 6. Add a Phaser-specific Devvit Web guide

The most valuable examples would cover:

- lightweight splash versus expanded Phaser bundle;
- portrait/landscape resize handling and safe areas;
- scene shutdown and recreation across repeated runs;
- touch gestures inside the Reddit mobile webview;
- deterministic screenshot/video capture;
- DOM accessibility mirrors for canvas actions;
- keeping gameplay truth in shared code rather than Phaser scene state.

These are the areas where a Reddit-hosted Phaser game differs most from a normal browser game.

## Phaser-specific feedback

Phaser 4 was a strong fit for combining a direct-manipulation Builder with a responsive real-time Runner. Scene composition, Graphics, Containers, pointer events, keyboard input, tweens, camera shake, and explicit resize events all translated well to Devvit Web.

The main integration challenge was lifecycle discipline: cached display objects, text, tweens, and scene-owned maps must be recreated or cleared every time a scene restarts. A Devvit Phaser example that demonstrates repeated `Ride Again` transitions and mobile viewport changes would be more valuable than a one-scene starter alone.

## Concise answer if the form has one open-text field

Devvit Web made Phaser + Vite + Hono a productive stack for a substantial Reddit game, especially with installation-scoped Redis and server-derived identity. My highest-value request is an official authenticated capture/test harness for installed webviews: direct webview automation loses the Reddit parent bridge, so it can prove responsive client behavior but not persistence, native sharing, identity, or ranked flows. I would also value a single judge-access readiness readback, clearer app/version compatibility guidance, an account-deletion lifecycle signal, richer share-image support, and a Phaser-specific guide covering splash/expanded bundling, mobile resize, repeated scene teardown, touch gestures, deterministic capture, and DOM accessibility mirrors.
