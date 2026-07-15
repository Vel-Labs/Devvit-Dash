# Achievements and Retention Roadmap

## Principle

Achievements should recognize behavior that improves the game: fair building, route mastery, community impact, consistent return, and exploration. They must not reward spam, deliberately lethal tiles, or low-effort submission volume.

Achievements are app-local records. Optional subreddit flair may mirror major milestones only after permission and moderation behavior are verified; do not imply they are Reddit account-level achievements.

## Launch catalog

| ID                     | Name             | Trigger                           | Purpose                     |
| ---------------------- | ---------------- | --------------------------------- | --------------------------- |
| `first-certified-tile` | Roadmaker        | 1 certified tile                  | complete Builder onboarding |
| `featured-builder`     | Made the Map     | 1 selected tile                   | delayed return consequence  |
| `clean-delivery`       | Handle With Care | 1 zero-damage finish              | runner mastery              |
| `roadbook-regular`     | Roadbook Regular | 10 unique routes                  | evergreen breadth           |
| `seven-day-route`      | Seven Stops      | 7-day best streak                 | return habit                |
| `well-travelled`       | Well Travelled   | 1,000 crossings on authored tiles | persistent social impact    |
| `balanced-designer`    | Fork in the Road | 1 balanced featured tile          | meaningful route choice     |
| `world-tourist`        | World Tourist    | 5 source communities              | optional exploration        |

World Tourist remains hidden while World Tour is disabled.

## Progress events

The profile service receives authoritative events:

- `tile.certified`
- `tile.featured`
- `route.completed`
- `route.completed_clean`
- `route.unique_completed`
- `streak.updated`
- `tile.crossed`
- `tile.balance_qualified`
- `world_tour.community_completed`

Each event updates a small numeric stat and then runs the same pure unlock evaluator. Unlock writes must be idempotent.

`Made the Map` also reconciles from unique authored tile IDs present in durable tenant routes whenever an authenticated profile loads. This repairs older routes that predate profile tracking without counting the same tile again across route revisions or repeated bootstrap calls. Removed tiles are excluded. Ranked completion effects advance only after the server accepts the run; a local practice fallback does not retroactively credit an unpersisted run.

Route Passport distance and failed-delivery counters follow that same accepted-run boundary but are not new achievements. They are descriptive lifetime metrics: a failed run can add honest traveled distance and one failure, but never progress completion- or clean-run achievements.

## Streak semantics

- Dates are UTC in the scaffold for determinism.
- One completed run or one certified tile counts as daily activity.
- Repeated activity on the same date does not increment streak.
- Consecutive date increments; any larger gap resets current streak to one.
- Best streak never decreases.

Post-hackathon, tenant-configurable rollover may replace UTC. Do not mix time zones within a stored streak version.

## Presentation

### Contextual unlock

Show an achievement after the action that unlocked it:

- certification stamp after publish;
- medal/result postcard after a run;
- creator outcome card after feature/crossing threshold. First-pass Creator postcard is available from the main menu and shows featured tile crossings plus top/middle/bottom path-choice splits from current route best-run data.

### Achievement postcard

The full screen shows eight compact cards, current/target progress, category, and unlocked date. Locked World Tour entries are omitted while unavailable rather than teasing a disabled feature.

### Reddit-native recognition

Good uses:

- optional user flair for Made the Map or Well Travelled;
- weekly comment/post summary of route builders;
- creator attribution inside routes.

Bad uses:

- automatically posting every unlock;
- claiming karma or native achievement status;
- using an achievement as permission to spam comments.

## Anti-grind rules

- Republishing the same daily tile does not increment certified count.
- Crossing counts deduplicate authors per route run.
- Unique route completions use route IDs.
- Removed or invalidated runs do not count.
- Failed ranked saves and local practice fallbacks do not count.
- A player cannot gain their own crossing impact from repeated local preview runs.
- “Balanced designer” requires a minimum sample size before path splits are evaluated.

## Future achievement families

### Skill

Gold medals, clean route streaks, all-parcel routes, no-boost challenges.

### Creation quality

Balanced choices, high clean-clear rate, several distinct featured tiles, recovery tile recognition.

### Community

Contribute to a fully human-authored route, weekly chapter completion, crossings milestones.

### Exploration

Biomes, tenant routes, seasonal chapters—only when they exist in the product.

## Acceptance criteria

- Unlock evaluation is pure, deterministic, and tested.
- The same milestone cannot unlock twice.
- Featured-tile reconciliation is idempotent across repeated profile loads and route revisions.
- A user sees why an achievement unlocked.
- No launch achievement rewards failure rate or raw repeated submissions.
- Hidden/disabled mechanics do not appear as impossible requirements.
