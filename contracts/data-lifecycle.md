# Tenant Data Lifecycle Contract

Daily Dash stores data only in Devvit Redis, which is scoped to one subreddit installation. World Tour is disabled and no key is treated as cross-community storage.

## Identity window

Authenticated activity updates `dd:v1:user-activity`. Identifying fields are retained while the redditor has interacted with the app within 30 days. Weekly maintenance processes at most ten inactive identities per run. Existing identities discovered without an activity timestamp receive a new 30-day grace period instead of being deleted immediately.

The first maintenance run also checks the previous 90 deterministic date keys once and indexes any pre-lifecycle submission hashes. This bounded migration covers the existing hackathon installation without scanning Redis.

After 30 days of inactivity:

- profile and best-run records are deleted;
- leaderboard membership and daily-submission ownership are deleted;
- tile, route-snapshot, and moderation attribution is replaced with the shared non-identifying label `Deleted player` / `deleted-user`;
- deterministic tile geometry and still-open moderation facts remain;
- the activity index entry is deleted.

Anonymization is irreversible. A returning redditor begins a new profile and cannot reclaim an anonymized tile.

## Explicit owner deletion

`DELETE /api/profile` derives the user and tenant from Devvit context; it accepts no client-supplied user or tenant identifier. The Achievements screen requires a separate second confirmation before invoking it.

Before the second press, the app states that deletion cannot be undone and names published tile content, progress, rankings, active runs, and possible current-route rebuilding.

Explicit deletion:

1. recompiles every affected current route without any tile authored by the requester;
2. deletes the requester’s tile records and featured-count fields;
3. deletes historical route revisions containing that user-created tile content, including their revision-scoped runs and leaderboard;
4. deletes the requester’s remaining best runs, leaderboard memberships, submissions, profile, and activity entry;
5. deletes still-active 15-minute run-token envelopes through the per-user token index;
6. removes author, reporter, and moderator-action identity from retained structured moderation records.

Current repaired routes stay playable. A purged historical revision is intentionally unavailable for replay or ranking because deletion takes priority over historical continuity.

## Moderation retention

Reports contain only a predefined reason and identifiers; no free text or upload is stored. Open reports remain until actioned so moderators can resolve them. User identity is still anonymized on inactivity or explicit deletion. Actioned reports are deleted after 180 days in batches of at most 100.

## Other retention

| Data family                | Retention and action                                              |
| -------------------------- | ----------------------------------------------------------------- |
| run token                  | atomic 15-minute expiration; deleted on claim or user cleanup     |
| submission date hash       | deleted after 35 days using the known date index                  |
| daily post setting         | deleted after 90 days; Reddit post itself is not deleted          |
| tile/route geometry        | evergreen until owner deletion or moderation removal              |
| route attribution          | active identity for 30 days, then irreversible anonymization      |
| profile and best run       | active identity for 30 days, then deletion                        |
| open report                | until actioned; identities remain subject to 30-day anonymization |
| actioned report            | 180 days after action, then deletion                              |
| settings without user data | installation lifecycle unless a narrower policy applies           |

## Platform limitation

The current Devvit Web configuration surface does not expose an account-deletion trigger. Daily Dash does not claim automatic knowledge of a Reddit account deletion. It instead minimizes the exposure window to 30 days, provides in-app owner deletion, and requires confirmation with Reddit during app review about any additional account-deletion integration.

This contract follows the current [Devvit Rules deletion requirements](https://developers.reddit.com/docs/devvit_rules) and must be rechecked before public submission because platform policy can change.
