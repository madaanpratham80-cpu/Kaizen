# KAIZEN (改善)
### Gamified Real-Life Achievement Platform

> *"Continuity with recovery: a missed day should provide a path back into the routine, not punitive failure."*

---

## Overview

**KAIZEN** is a gamified personal progression system that translates daily, real-world commitments into tangible character evolution, skill mastery, and an uncompromised, long-term ledger of achievement.

Most gamified habit trackers fail when real life intervenes: streaks snap, penalties accumulate, and users abandon the tool out of fatigue or guilt. KAIZEN shifts the paradigm from punitive friction to **disciplined continuity with structured recovery**. By decoupling lifetime effort from short-term stability, KAIZEN ensures users always have a clear, manageable path back into their routine.

---

## Core Loop

The daily interaction follows an unambiguous, 5-step operational loop:

```
[ Choose Commitment ] ───> [ Complete Real-World Action ] ───> [ Record Completion ]
                                                                       │
[ Continue or Recover ] <─── [ Character State Responds ] <───────────┘
```

1. **Choose a Commitment:** Select your daily priority quest from your routine to secure your streak.
2. **Complete the Action:** Execute the real-world task (academic, physical, craft, or productivity).
3. **Record Completion:** Confirm completion via Today or Habits with one unified transaction.
4. **See the Character Respond:** Character health stabilizes, XP accrues, posture and expression evolve.
5. **Continue or Recover:** Keep your momentum, or activate targeted recovery after an interrupted cadence.

---

## Reward Separation Architecture

KAIZEN isolates metrics into four distinct dimensions so every number on screen is transparent, explainable, and psychologically sound:

| Dimension | Metric | Purpose & Behavior |
| :--- | :--- | :--- |
| **Lifetime Effort** | **XP (Experience Points)** | Permanent, non-depleting lifetime score. XP unlocks player levels, milestones, and rank titles. It can never be lost or penalized. |
| **Routine Stability** | **Character Health (0–100%)** | Reflects short-term consistency over recent days. Adjusts within controlled daily boundaries. Does not wipe lifetime progress. |
| **Continuity** | **Streak** | Tracks consecutive scheduled days fulfilled. Features **planned rest days** which preserve continuity without faking activity. |
| **Fulfillment Rate** | **Completion Rate (%)** | Ratio of planned commitments executed within a specified weekly or monthly time window. |

---

## Core Product Screens

KAIZEN structures user interaction into five primary modular views, indexed according to the technical dossier taxonomy:

### `.01 TODAY` — Daily Command Hub & Next Action
The primary operational cockpit:
- Real-time character status, health meter, and active streak counter.
- Prominent **Daily Priority Quest** that secures the daily routine.
- Remaining scheduled quests with difficulty tiering and XP rewards.
- Instant completion feedback and automated **Recovery Guidance** if a previous day was missed.

![Today Screen](UI%2C%20v4/kaizen.01_today_poster_editorial_edition/screen.png)

---

### `.02 QUESTS` — Commitment Builder & Task Engine
Organize and deploy personal challenges:
- **Quest Classification:** Academic, Physical, Productivity, and Language / Learning.
- **Difficulty Tiers:** Easy, Medium, and Hard with transparent, fixed XP values.
- **Quick Quests:** Ad-hoc tasks logged via the same unified reward engine.
- Multi-dimensional filtering by schedule, category, status, and XP yield.

![Quests Screen](UI%2C%20v4/kaizen.02_quests_poster_editorial_edition/screen.png)

---

### `.03 HABITS` — Cadence & Recurring Rhythms
Visualize recurring weekly and monthly cycles:
- Abutting weekly status matrix: `Completed`, `Missed`, and `Planned Rest`.
- Per-habit streak metrics and historical adherence rates.
- Strict anti-duplication rule: completing a habit from Today or Habits updates the exact same occurrence record.

![Habits Screen](UI%2C%20v4/kaizen.03_habits_poster_editorial_edition/screen.png)

---

### `.04 PROGRESS` — 365-Day Ledger & Insight
Transform daily logs into actionable reflection:
- High-density **365-Day Block Heatmap** documenting operational density.
- **Skill Pillar Growth:** Visualizing balanced development across Cognitive, Physical, and Craft domains.
- Immutable event audit log detailing every timestamped XP and health delta.
- Weekly reflection summaries for reviewing volume and habit consistency.

![Progress Heatmap](UI%2C%20v4/kaizen.04_progress_12_month_block_heatmap/screen.png)

---

### `.05 PROFILE` — Character Dossier & Archive
The living chronicle of personal development:
- **Character Evolution:** Dynamic visual representation responding to recent stability and lifetime achievements.
- Level milestones, rank titles, and active personal goals.
- **Seals of Mastery:** Archival milestone badges (e.g., *Seven-Day Warrior*, *Iron Will*, *Hundred Gates Conqueror*) with timestamp, unlock trigger, and optional user reflection.
- Exportable, resume-style summary artifact.

![Profile Dossier](UI%2C%20v4/kaizen.05_profile_character_dossier_poster_edition/screen.png)

---

## Gamification & Systems Design

### 1. The Three Skill Pillars
All tasks and habits feed into three foundational pillars:
- **Cognitive:** Academic study, reading, problem solving, analysis.
- **Physical:** Workouts, mobility, conditioning, nutrition, restorative sleep.
- **Craft:** Coding, writing, language acquisition, creative output, deliberate practice.

### 2. Milestone Seals & Achievements
Achievements are not trivial cosmetic handouts—they are permanent operational seals:
- Seals unlock automatically upon condition verification (no tedious manual claim buttons).
- Each seal stores its unlock timestamp, the exact qualifying activity history, and optional user notes.
- Key seals include:
  - **Seven-Day Warrior:** 7 consecutive active days without an unexcused lapse.
  - **Iron Will:** Successfully navigating recovery after an interrupted cadence.
  - **Hundred Gates Conqueror:** 100 verified quest completions.

### 3. Continuity & Recovery Engine
- **Planned Rest:** Days scheduled for recovery or off-days do not break streaks.
- **Recovery Quests:** When a day is missed, KAIZEN offers an immediate, lowered-friction calibration quest to resume the rhythm immediately instead of demoralizing the user.

---

## Design System: Editorial Brutalist Dossier

The user interface synthesizes **Swiss International Typographic Style**, **technical dossiers**, and **architectural neo-brutalism**. It rejects SaaS homogenization (floating drop-shadows, blurred gradients, rounded pill buttons) in favor of high-contrast, physical broadsheet authority.

- **Zero-Radius:** `border-radius: 0px` across all cards, buttons, badges, and avatars.
- **Abutting Grids:** Cards share `1px` to `2px` hairline boundaries (`0px` gutters) creating a monolithic, structural ledger facade.
- **Palette:**
  - `Canvas Dark`: `#121110` (Off-black foundation)
  - `Canvas Inverted`: `#F5F0E6` (Warm cream broadsheet fill)
  - `Signal Red`: `#E63827` (Imperatives, active state markers, primary actions)
  - `Flat Olive`: `#8C9942` (Verified completions, positive streaks, fulfilled habits)
- **Typography:**
  - **Display:** *Space Grotesk* (tight negative tracking, architectural density)
  - **Body:** *DM Sans* (neutral, highly legible reading copy)
  - **System / Technical:** *Space Mono* (timestamps, indexes, coordinates, metrics)

---

## Architecture & Implementation Principles

The implementation blueprint is [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md), with the feature inventory in [docs/architecture/feature-list.md](docs/architecture/feature-list.md). The earlier system design is preserved in [docs/archive/system-design.md](docs/archive/system-design.md).

- **Atomic Single-Transaction Completion Service:**
  Completing any commitment runs through a single backend transaction that updates task state, calculates XP, evaluates health deltas, updates streak status, and checks milestone seal eligibility simultaneously.
- **Immutable Event Sourcing:**
  XP and health changes are stored as append-only event logs. Progress views compute metrics from deterministic, timestamped history.
- **Strict Deduplication:**
  Shared occurrence records ensure tasks marked from any screen (Today, Habits, or Quests) cannot trigger duplicate payouts or state corruption.

---

## Competitive Benchmarking

The architecture and design of KAIZEN was engineered after deep-dive structural evaluations of existing solutions:
- **Habitica:** Solved RPG mechanics but suffers from gamified punishment fatigue and cluttered UI.
- **Duolingo:** Mastered streak psychology, but over-relies on artificial streak freezes and dark-pattern retention hooks.
- **Focumon, Levelyss, HabitQuest, Matiks, Productivitism:** Evaluated for quest pipelines, pomodoro integration, and minimal dossier interfaces.

Detailed technical teardowns are available in the [`Competitors/`](./Competitors) directory.

---

## Release Roadmap

| Phase | Milestone | Scope |
| :--- | :--- | :--- |
| **MVP** | *Core Stability* | Onboarding & Starter Routine, Quest CRUD, Recurring Habits, Quick Quests, Daily Priority, Character Health & XP Engine, Schedule-Aware Streaks, 5 Core Screens, Recovery Engine, Milestone Seals. |
| **Next** | *Deeper Cadence* | Weekly Review Engine, In-app & Browser Notifications, Resume-style Exportable Progress Summary, Extended Character Visual States, Earned Absence Protection Tokens. |
| **Later** | *Network & Guilds* | Peer Accountability, Shared Quests, Guilds & Community Challenges, Competitive Leagues, Advanced Profile Customizations. |

---

## Repository Structure

### Local scaffold setup

Install the Node.js version in `.nvmrc` and pnpm 11. Run `pnpm install` and `pnpm --filter @kaizen/contracts build` from the repository root. Copy `apps/web/.env.example` to `apps/web/.env.local` and `apps/api/.env.example` to `apps/api/.env`. Start the processes with `pnpm --filter @kaizen/web dev` and `pnpm --filter @kaizen/api dev`. The web app runs on port 3000 and the API defaults to port 4000.

Root verification commands are `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`. `test:db` currently reports that database tests are pending. API liveness is `GET http://localhost:4000/health/live`; readiness is `GET http://localhost:4000/health/ready` and returns HTTP 503 until a database check is implemented.

To verify the registration service, export `DATABASE_URL` for a fresh, disposable PostgreSQL database whose name contains `test`, then run:

```sh
pnpm --filter @kaizen/contracts build
bash apps/api/tests/db/auth-migration-empty-db.sh
pnpm --filter @kaizen/api exec vitest run --config vitest.db.config.ts auth-register-postgres
```

The API registration service reads `AUTH_BCRYPT_COST` from its environment and defaults to 12.

Set `APP_ORIGIN` to the exact browser origin allowed to make API mutations, and provide `AUTH_CSRF_SECRET` through the API environment for authenticated mutations. Leave `TRUSTED_PROXY_IPS` empty for direct connections. Behind an ingress, list only the exact IP addresses of proxies you control and configure the ingress to discard client-supplied forwarding headers.

The workspace contains `apps/web` (Next.js App Router), `apps/api` (Express and Prisma), and `packages/contracts` (shared Zod contracts).

```
.
├── .gitignore
├── KAIZEN_Feature_List.pdf           # Official product scope and specification
├── README.md                         # Project documentation and architectural overview
├── Competitors/                      # Comprehensive competitor tear-downs & architectures
│   ├── Duolingo/
│   ├── Focumon/
│   ├── HabitQuest/
│   ├── Habitica/
│   ├── Levelyss/
│   ├── Matiks/
│   └── Productivitism/
└── UI, v4/                           # Editorial Brutalist design system & interactive mockups
    ├── editorial_brutalist_dossier/  # Design token spec (DESIGN.md)
    ├── kaizen.01_today_poster_editorial_edition/
    ├── kaizen.02_quests_poster_editorial_edition/
    ├── kaizen.03_habits_poster_editorial_edition/
    ├── kaizen.04_progress_12_month_block_heatmap/
    └── kaizen.05_profile_character_dossier_poster_edition/
```

---

## License

Built for disciplined continuous improvement. All rights reserved.

