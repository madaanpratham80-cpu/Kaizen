# Graph Report - Kaizen  (2026-11-13)

## Corpus Check
- Corpus is ~33,011 words - fits in a single context window. You may not need a graph.

## Summary
- 43 nodes · 40 edges · 11 communities (7 shown, 4 thin omitted)
- Extraction: 48% EXTRACTED · 52% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Gamification Patterns
- Core System Architecture
- OpenSpec Change Workflows
- Continuity and Habits
- Recovery-Oriented Product Loop
- Editorial UI System
- Engineering Constraints
- OpenSpec Finalization
- Local-First Quest Model
- AI Task Scoring
- Role-Based Productivity

## God Nodes (most connected - your core abstractions)
1. `Atomic Completion Service` - 6 edges
2. `Atomic Completion` - 6 edges
3. `Editorial Brutalist Dossier Design System` - 5 edges
4. `KAIZEN System Architecture` - 5 edges
5. `Continuity and Recovery Engine` - 3 edges
6. `Recovery-Oriented Core Loop` - 3 edges
7. `OpenSpec Apply Change Workflow` - 2 edges
8. `OpenSpec Propose Workflow` - 2 edges
9. `KAIZEN Product Overview` - 2 edges
10. `Today Screen Prototype` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Duolingo Streak Adaptation Analysis` --rationale_for--> `Atomic Completion Service`  [EXTRACTED]
  Competitors/Duolingo/Duolingo_KAIZEN_Relevant_Analysis.pdf → README.md
- `Focus Session Finalization` --semantically_similar_to--> `Atomic Completion`  [INFERRED] [semantically similar]
  Competitors/Focumon/Focumon_System_Architecture_and_Design.pdf → KAIZEN_System_Architecture.pdf
- `Server-Side Gamification` --semantically_similar_to--> `Atomic Completion`  [INFERRED] [semantically similar]
  Competitors/Habitica/Habitica_System_Architecture_and_Design.pdf → KAIZEN_System_Architecture.pdf
- `Today Ledger Screen` --conceptually_related_to--> `Atomic Completion`  [INFERRED]
  UI, v4/kaizen.01_today_poster_editorial_edition/screen.png → KAIZEN_System_Architecture.pdf
- `Today Screen Prototype` --conceptually_related_to--> `Atomic Completion Service`  [INFERRED]
  UI, v4/kaizen.01_today_poster_editorial_edition/code.html → README.md

## Hyperedges (group relationships)
- **Core KAIZEN Screen Prototypes** — ui_v4_kaizen_01_today_poster_editorial_edition_code_today_screen, ui_v4_kaizen_02_quests_poster_editorial_edition_code_quests_screen, ui_v4_kaizen_03_habits_poster_editorial_edition_code_habits_screen, ui_v4_kaizen_04_progress_12_month_block_heatmap_code_progress_screen, ui_v4_kaizen_05_profile_character_dossier_poster_edition_code_profile_screen [EXTRACTED 1.00]
- **Completion Consistency Pattern** — competitors_focumon_focumon_system_architecture_and_design_focus_session_finalization, competitors_habitica_habitica_system_architecture_and_design_server_side_gamification, kaizen_system_architecture_atomic_completion, kaizen_system_design_mvp_completion_service [INFERRED 0.85]

## Communities (11 total, 4 thin omitted)

### Community 0 - "Gamification Patterns"
Cohesion: 0.25
Nodes (8): Focumon, Focus Session Finalization, Habitica, Server-Side Gamification, Matiks, Optional Daily Challenge, Atomic Completion, Today Ledger Screen

### Community 1 - "Core System Architecture"
Cohesion: 0.25
Nodes (8): Calendar Lifecycle, KAIZEN System Architecture, Modular Monolith, Progression Ledger, KAIZEN System Design, MVP Completion Service, Habits Protocol Screen, Progress Ledger Screen

### Community 2 - "OpenSpec Change Workflows"
Cohesion: 0.50
Nodes (4): OpenSpec Apply Change Workflow, OpenSpec Explore Workflow, OpenSpec Propose Workflow, OpenSpec Update Change Workflow

### Community 3 - "Continuity and Habits"
Cohesion: 0.50
Nodes (4): Duolingo Streak Adaptation Analysis, KAIZEN Product Overview, Continuity and Recovery Engine, Habits Screen Prototype

### Community 4 - "Recovery-Oriented Product Loop"
Cohesion: 0.50
Nodes (4): KAIZEN Feature List, Recovery-Oriented Core Loop, Quests Dispatch Screen, Profile Dossier Screen

### Community 5 - "Editorial UI System"
Cohesion: 0.50
Nodes (4): Editorial Brutalist Dossier Design System, Today Screen Prototype, Quests Screen Prototype, Profile Screen Prototype

### Community 6 - "Engineering Constraints"
Cohesion: 0.67
Nodes (3): Kaizen Engineering Constraints, Atomic Completion Service, Progress Screen Prototype

## Knowledge Gaps
- **22 isolated node(s):** `OpenSpec Archive Change Workflow`, `OpenSpec Explore Workflow`, `OpenSpec Sync Specs Workflow`, `OpenSpec Update Change Workflow`, `Kaizen Engineering Constraints` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 22 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Atomic Completion` connect `Gamification Patterns` to `Core System Architecture`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Atomic Completion Service` (e.g. with `Kaizen Engineering Constraints` and `Today Screen Prototype`) actually correct?**
  _`Atomic Completion Service` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `OpenSpec Archive Change Workflow`, `OpenSpec Explore Workflow`, `OpenSpec Sync Specs Workflow` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `KAIZEN System Architecture` connect `Core System Architecture` to `Gamification Patterns`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Atomic Completion` (e.g. with `Focus Session Finalization` and `Server-Side Gamification`) actually correct?**
  _`Atomic Completion` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Why does `Atomic Completion Service` connect `Engineering Constraints` to `Continuity and Habits`, `Editorial UI System`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Editorial Brutalist Dossier Design System` (e.g. with `Today Screen Prototype` and `Quests Screen Prototype`) actually correct?**
  _`Editorial Brutalist Dossier Design System` has 5 INFERRED edges - model-reasoned connections that need verification._