# Graph Report - Kaizen  (2026-11-14)

## Corpus Check
- 83 files · ~59,292 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .example 2, .toml 1)

## Summary
- 648 nodes · 850 edges · 46 communities (34 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `554f2124`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Atomic Completion
- ADDED Requirements
- OpenSpec Change Workflows
- KAIZEN System Design (Earlier)
- Recovery-Oriented Product Loop
- web/package.json
- client.ts
- OpenSpec Finalization
- Local-First Quest Model
- AI Task Scoring
- Role-Based Productivity
- ADDED Requirements
- contracts/package.json
- compilerOptions
- Requirements
- package.json
- compilerOptions
- Decisions
- compilerOptions
- Proposal
- allowBuilds
- app.ts
- sessions.ts
- Proposal
- .prettierrc.json
- auth-migration-empty-db.sh
- postcss.config.mjs
- ADDED Requirements
- api/package.json
- AGENTS.md
- Tasks
- Design
- Requirement: Open deterministic day plans
- Tasks
- Requirement: Manage owned quests
- ADDED Requirements
- Proposal
- Proposal
- Design
- Requirement: Register an account
- Tasks
- Design
- Tasks

## God Nodes (most connected - your core abstractions)
1. `KAIZEN System Architecture` - 19 edges
2. `createApp()` - 18 edges
3. `compilerOptions` - 16 edges
4. `HttpError` - 13 edges
5. `createAuthRoutes()` - 10 edges
6. `compilerOptions` - 10 edges
7. `@prisma/client` - 10 edges
8. `AuthForm()` - 9 edges
9. `ADDED Requirements` - 9 edges
10. `Requirements` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Focus Session Finalization` --semantically_similar_to--> `Atomic Completion`  [INFERRED] [semantically similar]
  Competitors/Focumon/Focumon_System_Architecture_and_Design.pdf → KAIZEN_System_Architecture.pdf
- `Server-Side Gamification` --semantically_similar_to--> `Atomic Completion`  [INFERRED] [semantically similar]
  Competitors/Habitica/Habitica_System_Architecture_and_Design.pdf → KAIZEN_System_Architecture.pdf
- `Today Ledger Screen` --conceptually_related_to--> `Atomic Completion`  [INFERRED]
  UI, v4/kaizen.01_today_poster_editorial_edition/screen.png → KAIZEN_System_Architecture.pdf
- `Habits Protocol Screen` --conceptually_related_to--> `Calendar Lifecycle`  [INFERRED]
  UI, v4/kaizen.03_habits_poster_editorial_edition/screen.png → KAIZEN_System_Architecture.pdf
- `Progress Ledger Screen` --conceptually_related_to--> `Progression Ledger`  [INFERRED]
  UI, v4/kaizen.04_progress_12_month_block_heatmap/screen.png → KAIZEN_System_Architecture.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core KAIZEN Screen Prototypes** — ui_v4_kaizen_01_today_poster_editorial_edition_code_today_screen, ui_v4_kaizen_02_quests_poster_editorial_edition_code_quests_screen, ui_v4_kaizen_03_habits_poster_editorial_edition_code_habits_screen, ui_v4_kaizen_04_progress_12_month_block_heatmap_code_progress_screen, ui_v4_kaizen_05_profile_character_dossier_poster_edition_code_profile_screen [EXTRACTED 1.00]
- **Completion Consistency Pattern** — competitors_focumon_focumon_system_architecture_and_design_focus_session_finalization, competitors_habitica_habitica_system_architecture_and_design_server_side_gamification, kaizen_system_architecture_atomic_completion, kaizen_system_design_mvp_completion_service [INFERRED 0.85]

## Communities (46 total, 12 thin omitted)

### Community 0 - "Atomic Completion"
Cohesion: 0.13
Nodes (16): Focumon, Focus Session Finalization, Habitica, Server-Side Gamification, Matiks, Optional Daily Challenge, Atomic Completion, Calendar Lifecycle (+8 more)

### Community 1 - "ADDED Requirements"
Cohesion: 0.10
Nodes (19): ADDED Requirements, Purpose, Requirement: Calculate progression from eligible completions, Requirement: Commit completion exactly once, Requirement: Enforce progression identity and ownership, Requirement: Preserve awards and counters across storage changes, Requirement: Submit owned completion through the API, Scenario: Concurrent or failed completion (+11 more)

### Community 2 - "OpenSpec Change Workflows"
Cohesion: 0.50
Nodes (4): OpenSpec Apply Change Workflow, OpenSpec Explore Workflow, OpenSpec Propose Workflow, OpenSpec Update Change Workflow

### Community 3 - "KAIZEN System Design (Earlier)"
Cohesion: 0.05
Nodes (44): Kaizen Engineering Constraints, Duolingo Streak Adaptation Analysis, KAIZEN Feature List, Page 1, Page 2, Page 3, Page 4, Page 5 (+36 more)

### Community 4 - "Recovery-Oriented Product Loop"
Cohesion: 0.50
Nodes (4): KAIZEN Feature List, Recovery-Oriented Core Loop, Quests Dispatch Screen, Profile Dossier Screen

### Community 5 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, @kaizen/contracts@workspace:*, next@^16.0.0, react@^19.0.0, react-dom@^19.0.0, devDependencies, eslint@^9.0.0, eslint-config-next@^16.0.0 (+34 more)

### Community 6 - "client.ts"
Cohesion: 0.11
Nodes (11): LoginPage(), RegisterPage(), AuthForm(), mutate(), submit(), user, ApiError, auth (+3 more)

### Community 11 - "ADDED Requirements"
Cohesion: 0.08
Nodes (24): ADDED Requirements, Purpose, Requirement: Keep account access owner-scoped, Requirement: Limit authentication abuse, Requirement: Log out, Requirement: Protect session credentials, Requirement: Read the current session, Requirement: Register an account (+16 more)

### Community 12 - "contracts/package.json"
Cohesion: 0.10
Nodes (24): dependencies, zod@^4.0.0, devDependencies, eslint@^9.0.0, @eslint/js@^9.0.0, typescript@^5.9.0, typescript-eslint@^8.0.0, vitest@^4.0.0 (+16 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 14 - "Requirements"
Cohesion: 0.08
Nodes (24): Purpose, Requirement: Keep account access owner-scoped, Requirement: Limit authentication abuse, Requirement: Log out, Requirement: Protect session credentials, Requirement: Read the current session, Requirement: Register an account, Requirement: Reject cross-site mutations (+16 more)

### Community 15 - "package.json"
Cohesion: 0.17
Nodes (12): devDependencies, prettier@^3.6.0, name, packageManager, private, scripts, build, lint (+4 more)

### Community 16 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck, strict (+3 more)

### Community 17 - "Decisions"
Cohesion: 0.17
Nodes (11): Context, CSRF and rate limits, Data model and migration, Decisions, Design, Goals / Non-Goals, HTTP boundary, Migration Plan (+3 more)

### Community 18 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, skipLibCheck, strict (+2 more)

### Community 19 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 20 - "allowBuilds"
Cohesion: 0.25
Nodes (7): allowBuilds, bcrypt, esbuild, prisma, @prisma/client, @prisma/engines, packages

### Community 21 - "app.ts"
Cohesion: 0.09
Nodes (38): pino@^10.0.0, app, AppOptions, createApp(), postOnly(), prisma, proxyTrust(), createAuthRoutes() (+30 more)

### Community 22 - "sessions.ts"
Cohesion: 0.06
Nodes (50): bcrypt@6.0.0, cookieOptions, SESSION_COOKIE, Express, Request, bcryptComparisonCosts(), bcryptCost(), bcryptCostSchema (+42 more)

### Community 23 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 30 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Purpose, Requirement: Read an owned habit week, Requirement: Read owned progress, Requirement: Read the authenticated profile, Scenario: Foreign account supplied, Scenario: Paginate tied timestamps, Scenario: Zero scheduled occurrences (+1 more)

### Community 31 - "api/package.json"
Cohesion: 0.05
Nodes (53): dependencies, cors@2.8.6, express@^5.0.0, express-rate-limit@^8.0.0, helmet@^8.0.0, @kaizen/contracts@workspace:*, @prisma/client@6.19.3, zod@^4.0.0 (+45 more)

### Community 33 - "Tasks"
Cohesion: 0.33
Nodes (5): 1. Persistence and contracts, 2. Account and session services, 3. HTTP protection and endpoints, 4. Minimal web entry and integration, Tasks

### Community 34 - "Design"
Cohesion: 0.29
Nodes (6): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 35 - "Requirement: Open deterministic day plans"
Cohesion: 0.10
Nodes (19): ADDED Requirements, Purpose, Requirement: Apply pending timezone transitions, Requirement: Create a Quick Quest without awarding progression, Requirement: Open deterministic day plans, Requirement: Preserve planned rest history, Requirement: Select unlocked priority, Requirement: Sync calendar and read Today (+11 more)

### Community 36 - "Tasks"
Cohesion: 0.29
Nodes (6): 1. Schema additions, 2. Progression domain, 3. Completion service, 4. PostgreSQL concurrency tests, 5. Completion route, Tasks

### Community 37 - "Requirement: Manage owned quests"
Cohesion: 0.15
Nodes (12): ADDED Requirements, Purpose, Requirement: Manage owned quests, Requirement: Preserve effective-dated schedules, Scenario: Concurrent edits, Scenario: Edit a future rule, Scenario: Effective archive, Scenario: Foreign quest (+4 more)

### Community 38 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Purpose, Requirement: Delete the reauthenticated account, Requirement: Update owned settings, Scenario: Delete succeeds, Scenario: Deletion fails, Scenario: Timezone change, Spec Delta

### Community 39 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 40 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 41 - "Design"
Cohesion: 0.29
Nodes (6): Context, Decisions, Design, Goals / Non-Goals, Migration Plan, Risks / Trade-offs

### Community 42 - "Requirement: Register an account"
Cohesion: 0.33
Nodes (5): MODIFIED Requirements, Requirement: Register an account, Scenario: Duplicate or invalid registration, Scenario: Valid registration, Spec Delta

### Community 43 - "Tasks"
Cohesion: 0.33
Nodes (5): 1. Schema and migration, 2. Quest catalog service, 3. Calendar service, 4. Routes, Tasks

### Community 44 - "Design"
Cohesion: 0.33
Nodes (5): Context, Decisions, Design, Goals / Non-Goals, Risks / Trade-offs

## Knowledge Gaps
- **22 isolated node(s):** `Modular Monolith`, `Today Ledger Screen`, `Habits Protocol Screen`, `Progress Ledger Screen`, `Focumon` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 339 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `sessions.ts` to `app.ts`, `api/package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `createApp()` (e.g. with `postOnly()` and `assignRequestId()`) actually correct?**
  _`createApp()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Modular Monolith`, `Today Ledger Screen`, `Habits Protocol Screen` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Atomic Completion` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `next` connect `web/package.json` to `client.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `ADDED Requirements` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `@testing-library/react` connect `web/package.json` to `client.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._