# Hackathon Rules Compliance

Source status: live Devpost overview and official rules rechecked on 2026-07-13; current Devvit Rules and platform configuration were also rechecked during the refinement audit. This is an engineering checklist, not legal advice. If this document conflicts with the official rules, Devpost, Reddit Developer Platform terms, Devvit Rules, or Reddit policies, the official source controls.

## Source Links

- Official rules: https://redditgameswithahook.devpost.com/rules
- Hackathon page: https://redditgameswithahook.devpost.com/
- Required platform direction: https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview
- Devvit Rules: https://developers.reddit.com/docs/devvit_rules
- Community games guide: https://developers.reddit.com/docs/guides/best-practices/community_games

## Calendar Gates

- Submission period: June 17, 2026 at 12:00 pm PT through July 15, 2026 at 6:00 pm PT.
- Feedback period: same window as the submission period.
- Judging period: July 16, 2026 at 12:00 am PT through July 27, 2026 at 6:00 pm PT.
- Winners expected around July 29, 2026 at 3:00 pm PT.
- Freeze rule: after the submission deadline, do not assume Devpost submission materials can be materially changed except for organizer-approved fixes such as rights, privacy, or inappropriate-material corrections.

## Eligibility and Entry Gates

- Entrant must satisfy the official eligibility rules and appoint a representative if entering as a team or organization.
- Register on the Devpost hackathon page before submission.
- Sign up for Reddit Developer Platform access at `developers.reddit.com`.
- Submit through Devpost during the submission period.
- Keep the project free to test, evaluate, and use through the judging period.
- Do not rely on any financial, commercial, or preferential support from Reddit/Sponsor that would create a real or apparent conflict under the official rules.

## Required Project Shape

- Build a game for Reddit communities using Reddit's Developer Platform.
- Daily Dash must remain a Devvit Web app: client webview plus Devvit server/runtime configuration in `devvit.json`.
- Daily Dash should stay in the community game lane: shared play, collaboration, competition, community-authored outcomes, and recurring reasons to return.
- The app must run consistently on its intended platform and match the submitted text/video description.
- If the project existed before the submission period, the submission must explain the significant updates made during the submission period.
- The submitted app must not be a prior Reddit hackathon winner.
- Submission copy should identify the significant post-June-17 work: responsive mobile layouts, constrained UGC repair UX, creator share card, immutable ranked route replay, owner data deletion/retention, and submission-focused QA.

## Submission Package Checklist

- Devpost text description explaining features and functionality.
- Unique app listing link in the form `https://developers.reddit.com/apps/{app-name}`.
- Detailed root `README.md` describing the game and how to play.
- Demo post link containing both the test subreddit and a Reddit post running the game.
- Public demo subreddit with fewer than 200 members, or a valid admin-access path if using Reddit's documented admin-approve app.
- Optional public repository URL.
- Optional demo video under one minute, publicly visible on an approved video host, showing the app functioning on its target device.
- Optional Developer Platform feedback survey if pursuing the feedback prize.
- English-language submission materials, or English translations for all submitted materials.
- Keep the public demo free and available without restriction through the end of judging on July 27, 2026.

## Rights, Assets, and Privacy

- Use only code, art, audio, video, text, and other materials the entrant owns or is licensed/authorized to use.
- Record third-party asset provenance and license terms before importing assets.
- Do not import unreviewed asset archives into the client bundle.
- Do not include third-party marks, personal information, or inappropriate material in submission assets or demo media.
- Keep free-text, uploads, and arbitrary user drawings out of Builder scope unless a moderation redesign and rule review happen first.
- Do not add payments, premium features, or external services without separate Devvit Rules review and explicit scope approval.

## Devvit Rules and Platform Gates

- Review Devvit Rules before public submission and before any publish/app-review attempt.
- Expect Reddit app review before public app directory availability.
- Playtest thoroughly before review.
- Keep client, server, and shared boundaries intact:
  - `src/client`: webview/Phaser UI only.
  - `src/server`: Devvit server context, Reddit APIs, Redis, Hono endpoints.
  - `src/shared`: pure deterministic gameplay logic.
- Server must not trust client-provided identity, tenant, status, score, metrics, or publication identity.
- Server must rerun tile certification for published tiles.
- Keep Redis tenant-local per subreddit installation; do not fake cross-subreddit global storage through shared Redis keys.
- Do not use legacy Blocks or `@devvit/public-api` patterns in this Devvit Web app.

## Judging Alignment

- Baseline viability: Daily Dash must fit the hackathon theme and use the required Reddit Developer Platform APIs/SDKs.
- Delightful UX: first-time players should discover Builder and Runner without external docs.
- Polish: submitted demo posts should be close to launch quality and compliant with Devvit Rules.
- Reddity: emphasize subreddit community authorship, creator impact, and recurring community routes.
- Hook: daily certified tiles, scheduled route compilation, evergreen Roadbook, leaderboards, streaks, and creator crossings should create return reasons.
- Phaser category: use Phaser meaningfully for the Builder, Runner, route visualization, input, animation, and polish.
- Retention category: daily routes, Roadbook history, streaks, leaderboards, achievements, and visible creator outcomes are the relevant mechanics.
- User contribution category: certified community-authored tiles are the core user-generated gameplay surface.
- Avoid the organizer's explicit polish failure modes: viewport overflow, generic/unfitted presentation, obvious agent-generated roughness, and Reddit theming that substitutes for community mechanics.

## Local Stop Rules

- Do not submit or claim live readiness until a public test subreddit and post running the game are verified.
- Do not claim Devvit app listing readiness until a unique app slug exists and upload creates the app link.
- Do not claim asset readiness until third-party licenses are recorded.
- Do not claim public moderation readiness until report/removal and route repair behavior are verified or explicitly disclosed as a limitation.
- Do not add World Tour, payments, external shared services, jumping, free-text Builder input, uploads, or arbitrary drawing as hackathon MVP dependencies.
- If Devvit Rules, Developer Platform docs, or official hackathon rules change, update this document and the submission checklist before continuing implementation.
