# Canonical Gameplay Rules

This document is normative. Code, UI text, tests, and roadmap decisions must not silently redefine these rules.

## Tile geometry

- A tile has exactly three lanes and eighteen time columns.
- The first three and last three columns are neutral connector zones: road terrain, no feature, all lanes.
- The editable region is columns 3 through 14 inclusive.
- The player may remain in a lane or move by one adjacent lane. A lane change consumes one logical cooldown column.
- A certified tile must expose at least one zero-damage path reachable from every entrance lane.
- Boosts are optional advantages and must never be required for completion.
- Gaps and obstacles each cost one package-integrity pip in the runner.
- The third hit ends the delivery. A gap uses recovery damage rather than permanent instant death in version 1.

## Builder economy

- Gap cell: 1 budget.
- Obstacle: 2 budget.
- Boost: 2 budget.
- Parcel: 1 budget.
- Maximum total budget: 24.
- Maximum obstacles: 9; gaps: 14; boosts: 5; parcels: 7.
- One active certified submission per authenticated player per UTC day; republishing updates that submission.

## Route construction

- A standard route uses eight certified tiles.
- Founding tiles are legal fallbacks and obey the same validator as community tiles.
- Routes follow an easy-to-hard-to-recovery difficulty curve rather than a random uniform shuffle.
- Adjacent repetition by the same author and repeated tile IDs are penalized by the selector.
- The complete concatenated route must pass the same zero-damage solver before publication.
- A removed tile is never rendered from a cached immutable image. Referencing routes are recompiled and revisioned.

## Runner scoring

- Completion: 7,500 points.
- Time bonus: up to 5,000 points.
- Parcel: 350 points each.
- Boost triggered: 75 points each, capped at 20.
- Damage: minus 1,250 points per pip.
- A failed delivery scores zero.
- Ranked submissions include bounded lane-change events. The server derives damage, parcel count, boost count, completion, score, and distance traveled by replaying those events against stored route geometry.
- Distance is the count of logical road columns traversed, including the terminal failure column and capped at the stored route length. It has no scoring effect.
- Results convert that authoritative count to a game-world distance at exactly ten meters per route column and display kilometers to two decimal places. The conversion is presentation only; the server-derived column count remains canonical.
- A result may claim ranked persistence only after the completion endpoint accepts and stores it. Any local fallback remains playable but must be labeled practice and must not advance leaderboards or achievements.

## Route Passport lifetime metrics

- The Route Passport contains exactly four lifetime counters: authoritative distance traveled, unique featured tiles, clean deliveries, and failed deliveries.
- Every accepted ranked run adds its replay-derived `distanceColumns` to the authenticated profile, including the partial distance of a failed delivery.
- A clean delivery is an accepted completed run with zero replay-derived damage. A failed delivery is an accepted run whose replay-derived result did not reach the finish. Practice/local fallback runs advance neither counter.
- Featured tiles reconcile from unique, non-removed authored tile IDs in durable routes and never count repeat appearances or revisions of the same tile twice.
- Profiles created before these lifetime run fields existed initialize distance and failed deliveries to zero. Daily Dash does not infer incomplete historical totals from best-run snapshots.
- The card displays cumulative distance in kilometers using the same ten-meters-per-column presentation conversion. This does not change replay, scoring, or server authority.
