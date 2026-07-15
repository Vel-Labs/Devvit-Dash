# Redis Keyspace Contract

Redis is installation-scoped; therefore every key below belongs to exactly one subreddit installation even though the key name does not repeat the subreddit ID.

| Key                                   | Type       | Purpose                                                                    | Retention                 |
| ------------------------------------- | ---------- | -------------------------------------------------------------------------- | ------------------------- |
| `dd:v1:tiles`                         | hash       | `tileId -> CourseTile JSON`                                                | Until removal/maintenance |
| `dd:v1:routes`                        | hash       | `routeId -> RouteBundle JSON`                                              | Evergreen                 |
| `dd:v1:route-revisions:{routeId}`     | hash       | `revision -> immutable RouteBundle JSON`                                   | Route lifecycle           |
| `dd:v1:daily-routes`                  | hash       | `YYYY-MM-DD -> routeId`                                                    | Evergreen index           |
| `dd:v1:route-index`                   | sorted set | route IDs scored by publish timestamp                                      | Capped by maintenance     |
| `dd:v1:profiles`                      | hash       | `userId -> PlayerProfile JSON`, including Route Passport lifetime counters | Account/app lifecycle     |
| `dd:v1:user-activity`                 | sorted set | `userId -> last authenticated activity`                                    | 30-day sliding identity   |
| `dd:v1:submission-dates`              | sorted set | known daily-submission hash dates                                          | 35-day maintenance index  |
| `dd:v1:submissions:{date}`            | hash       | `userId -> tileId`                                                         | 35 days                   |
| `dd:v1:reports`                       | hash       | `reportId -> TileReport JSON`                                              | Moderation lifecycle      |
| `dd:v1:report-index`                  | sorted set | report IDs scored by created timestamp                                     | Capped by maintenance     |
| `dd:v1:leaderboard:{routeId}:rev:{n}` | sorted set | `userId -> best score for route revision`                                  | Route revision lifecycle  |
| `dd:v1:best-runs:{routeId}:rev:{n}`   | hash       | `userId -> RunResult JSON for revision`                                    | Route revision lifecycle  |
| `dd:v1:run-token:{uuid}`              | string     | One-use revision-bound run-start envelope                                  | 15 minutes                |
| `dd:v1:user-run-tokens:{userId}`      | hash       | active token UUID index for owner deletion                                 | 15 minutes                |
| `dd:v1:featured-counts`               | hash       | `tileId -> count`                                                          | Tile lifecycle            |
| `dd:v1:settings`                      | hash       | Stable installation settings and post IDs                                  | Installation lifecycle    |

## Invariants

1. Never rely on scanning every Redis key. Collection members live in known hashes or sorted sets.
2. Never mix standard and compressed Redis clients on one key.
3. Route revision fields are inserted with `HSETNX`. Rewriting gameplay geometry for an existing `routeId + revision` is an integrity error; repairs always create a new revision. The lifecycle service may redact identity-only fields or purge a revision to honor privacy deletion while preserving all retained gameplay cells.
4. Run tokens are claimed with a watched transaction only after route, revision, timing, and replay validation. Exactly one completion request may proceed to persistence.
5. Ranked run tokens bind the route revision issued at start. The server replays against the matching immutable snapshot, while leaderboards and best-run hashes are revision-scoped so repaired routes do not mix incompatible geometry.
6. A legacy current route may be backfilled into the immutable hash only when its embedded revision exactly matches the requested revision. If an older snapshot cannot be recovered after repair, completion fails closed.
7. Large route histories should be maintained in bounded scheduled batches.
8. World Tour data does not live in this keyspace. It requires a separate shared service and explicit publication contract.
9. Dynamic key families are maintained from known route and date indexes; maintenance never scans the installation keyspace.
10. Legacy profile reads initialize missing `failedDeliveries` and `distanceColumnsTraveled` fields to zero. Only accepted replay-derived runs after that migration advance them; the server does not fabricate historical totals.

See `contracts/data-lifecycle.md` for the identifying-field and deletion policy.
