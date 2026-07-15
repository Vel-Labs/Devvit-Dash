# Games with a Hook Submission Requirements Matrix

Status: source-backed preparation artifact; last reconciled 2026-07-15. This file does not authorize or claim app publication, a public post, Devpost submission, or subreddit visibility changes.

## Hard deadline

- Submission closes **2026-07-15 at 6:00 PM Pacific / 8:00 PM Central / 9:00 PM Eastern**.
- Devpost registration, required fields, links, and final submission must be complete before that time.
- Source: [Devpost overview](https://redditgameswithahook.devpost.com/) and [official rules](https://redditgameswithahook.devpost.com/rules).

## Required submission surfaces

| Requirement          | Official expectation                                                                                                                          | Repository surface                                              | Current truth                                      | Owner action                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Devpost registration | Join the hackathon and complete required submission fields during the submission period.                                                      | `SUBMISSION_CHECKLIST.md`                                       | **Human open**                                     | Join/log in and verify the project draft exists.                       |
| Devvit Web game      | Build a functioning Reddit game using the Developer Platform; existing projects must be significantly updated during the event.               | `README.md`, `REPO_PROFILE.json`, `DEVPOST_SUBMISSION_DRAFT.md` | **Locally evidenced; private playtest installed**  | Keep the “What changed” section and final version aligned.             |
| Text description     | Explain features and functionality.                                                                                                           | `DEVPOST_SUBMISSION_DRAFT.md`                                   | **Draft ready; final receipts needed**             | Paste and read back after final candidate freeze.                      |
| Unique app link      | Provide `developers.reddit.com/apps/{app-name}` created after upload.                                                                         | `JUDGE_ACCESS.md`, `APP_LISTING_DRAFT.md`                       | **Link known; final access/version readback open** | Verify `https://developers.reddit.com/apps/drawn-to-deliver`.          |
| Detailed root README | Explain the game, play instructions, configuration/deployment, and full feature set in plain language.                                        | `README.md`                                                     | **Present; final review required**                 | Reconcile exact final behavior/version.                                |
| Demo post            | Link to a subreddit and a post running the game. The subreddit must be public, or the admin-approve helper path must allow judges to join.    | `JUDGE_ACCESS.md`                                               | **Submission blocker**                             | Provide exact judge-accessible final post URL.                         |
| Judging access       | Working project must remain free and unrestricted through the judging period; rules recommend a public subreddit with fewer than 200 members. | `JUDGE_ACCESS.md`                                               | **Submission blocker**                             | Choose and prove the public-under-200 or admin-helper route.           |
| English materials    | Submission materials must be English or include English translations.                                                                         | All submission drafts                                           | **Pass locally**                                   | Preserve English final copy/captions.                                  |
| Rights and licenses  | Entrant must own or be authorized to use all project/demo materials and third-party integrations.                                             | `assets/kenney-manifest.json`, `docs/art/THIRD_PARTY_ASSETS.md` | **Documented locally**                             | Keep final screenshots/video limited to licensed/project-owned assets. |

## Optional surfaces

| Surface            | Rule                                                                                                                                                   | Prepared artifact                                               | Decision                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Demo video         | Optional; under one minute, real functioning footage, publicly visible on YouTube/Vimeo/Facebook Video/Youku. Judges need not watch beyond one minute. | `DEMO_VIDEO_SCRIPT.md`, `outputs/final-video-package-20260715/` | Both 58-second masters and exact source captures are ready; public upload URL remains human-owned. |
| Public repository  | Optional.                                                                                                                                              | README and source tree                                          | Do not expose unless intentionally approved.                                                       |
| Developer feedback | Optional; required for the feedback-prize lane.                                                                                                        | `DEVELOPER_FEEDBACK_DRAFT.md`                                   | Paste-ready actionable notes are prepared; one human-submitted form is allowed per entrant.        |

## Judging and category alignment

| Criterion/category             | Daily Dash proof surface                                                                                                       | Remaining proof                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Delightful UX                  | Mobile-first Builder, readable Runner, Roadbook, achievements, selected Route Passport visual identity.                        | Final Reddit screenshots and physical-phone readback on exact candidate. |
| Polish                         | Shared/server tests, responsive layouts, fixed-report moderation, privacy lifecycle, bounded QC packet.                        | Final full gate, public/judge access, multi-role mobile/web walkthrough. |
| Reddit-y                       | Subreddit-owned UGC becomes permanent route geometry; attribution, reporting, and Roadbook history are installation-local.     | Fresh second-account publish/reload and creator-consequence proof.       |
| Hook-y                         | Daily posts, one daily contribution, evolving routes, evergreen Roadbook, streaks, achievements, rankings, shareable identity. | Keep copy centered on the build-today/ride-forever flywheel.             |
| Best Use of Phaser             | Phaser powers responsive Builder and real-time lane Runner with semantic real-art roles.                                       | Final action footage from exact candidate.                               |
| Best Use of Retention          | Scheduled Daily Routes, replay history, progress, rankings, achievements, and creator return.                                  | Existing daily-post receipt plus final post/version alignment.           |
| Best Use of User Contributions | Constrained user-authored level tiles are certified and compiled into gameplay; moderation can repair routes.                  | Fresh non-owner publish/reload and later featured-tile consequence.      |

## Launch-readiness overlay

Reddit’s launch guide expects mobile and web testing, multiple roles/accounts, stable clear flows, responsive design, a custom first screen, no inline scrolling, a dedicated non-test subreddit, and immediate new-user comprehension. Daily Dash has local and private-playtest evidence for much of the product path, but the exact final candidate still needs:

1. developer/moderator/regular-user role matrix;
2. mobile and web readback;
3. fresh non-owner publish → reload → edit/start-fresh proof;
4. successful ranked finish and achievement/passport readback;
5. native share and saved-image destination confirmation in Reddit;
6. judge-accessible demo post/subreddit decision;
7. final screenshot/video/version/copy alignment.

Source: [Reddit launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide), [Devvit Rules](https://developers.reddit.com/docs/devvit_rules), and [community games guide](https://developers.reddit.com/docs/guides/best-practices/community_games).

## Fail-closed release boundary

- `npx devvit playtest` may install an accepted private candidate under the standing bounded approval.
- `npx devvit publish`, Devpost submission, public-post creation, subreddit visibility changes, pre-existing-content mutation, and account-data deletion remain outside this implementation task.
- No draft may replace `[REQUIRED]` fields with an inference, private test URL, local screenshot, or future intent.
