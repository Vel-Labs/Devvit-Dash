# Daily Dash App Listing Draft

Status: paste-ready draft; do not claim applied or published until final developer-console readback.

## Identity

- Product name: **Daily Dash**
- Devvit app slug: `drawn-to-deliver`
- Tagline: **Build today. Ride forever.**
- App link: `https://developers.reddit.com/apps/drawn-to-deliver`

## Short description

Build a fair three-lane course tile, ride today’s community-made route, and return to see how your contribution shaped the Roadbook.

## Full description

Daily Dash is a community-built delivery game inside Reddit. Each day, members can paint one small three-lane course tile from a fixed set of road, gap, obstacle, boost, and parcel tools. Before a tile can be published, the same deterministic rules used by the server must prove that every starting lane can reach a zero-damage path.

Certified tiles become candidates for finite Daily Routes. Players steer an automatically moving courier with Up/Down, W/S, swipe, or tap while protecting three package-integrity pips. Completed routes remain in an evergreen Roadbook with version-safe leaderboards, community attribution, structured reporting, and route repair when a tile is removed.

Players and creators can open a personal Route Passport at any time. Four readable stamps show server-backed lifetime distance traveled, featured tiles, clean deliveries, and failed deliveries. It supports Reddit’s native current-post share action, a separate square image export, and a direct action into today’s Daily Route.

Daily Dash is built with Devvit Web, Phaser, Hono, TypeScript, and installation-scoped Devvit Redis. World Tour is intentionally disabled; each subreddit owns its own routes, profiles, and leaderboards.

## How to play

1. Open a Daily Dash post and enter expanded play.
2. Build and certify a tile, or choose today’s route.
3. In a ride, move one lane at a time and preserve your three integrity pips.
4. Open Roadbook to replay saved routes and compare scores.
5. Open Route Passport to share your combined player-and-creator progress and jump back into today’s route.

## Permissions and data summary

- Redis stores installation-local routes, tiles, profiles, rankings, and structured reports.
- Server context supplies subreddit and user identity; the client cannot choose either.
- No free-text UGC, uploads, arbitrary drawings, payments, or cross-subreddit shared Redis.
- Authenticated identity has a sliding 30-day activity window. In-app owner deletion removes authored tile content and personal progress and may rebuild affected routes.

## Support/readback fields

Verified submission references:

- Final app version: `0.0.1.43`
- Demo subreddit: `https://www.reddit.com/r/drawn_to_deliver_dev/` with Devvit Admin Helper access
- Demo post: `https://www.reddit.com/r/drawn_to_deliver_dev/comments/1uvsr1g/daily_dash_20260714_build_today_ride_forever/`
- Support repository: `https://github.com/Vel-Labs/Devvit-Dash/issues`
- Privacy-policy field: point to the approved public lifecycle/privacy document only if the listing requires a URL; do not invent one.
