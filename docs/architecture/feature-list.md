# KAIZEN Feature List

Source: `KAIZEN_Feature_List.pdf`. Text transcribed from the PDF; page breaks are preserved below. Diagrams and visual layout remain in the source PDF.

## Page 1

KAIZEN | Feature specification
1
 KAIZEN
 Feature List and Product Scope
A gamified real-life achievement platform that turns meaningful routines into quests,
 visible character growth and a durable record of progress.
Working product definition
KAIZEN helps users choose realistic commitments, complete them in everyday life, and see those actions
change a virtual character. Its central promise is continuity with recovery: a missed day should provide a
path back into the routine.
Scope status
The list below combines features already designed for KAIZEN with decisions proposed for a complete
college-project release. Items marked later are intentionally deferred until the core loop is reliable.

## Page 2

KAIZEN | Feature specification
2
1. Core loop
The daily experience should move through one clear sequence.
Choose a commitment → complete the real-world action → record the completion → see
the character respond → continue or recover.
The daily priority is a user-selected quest drawn from the user's routine. It secures the personal streak.
Additional planned activities improve completion rate, health and skill progress.
Core mechanics
 Character health from 0-100% reflects recent consistency and changes within controlled daily limits.
 Daily quests provide a small set of planned activities across categories such as Academic, Physical,
Productivity and Language or Learning.
 XP accumulates toward levels and remains permanent as lifetime progress.
 Streaks count consecutive planned days fulfilled. Planned rest preserves continuity and appears
separately from active days.
 Recovery offers a manageable next action after a missed day and allows the user to revise an unrealistic
plan.
Reward separation
XP represents lifetime effort. Health represents recent routine stability. Streak represents continuity.
Completion rate represents planned work completed during a chosen period. Keeping these measures
separate makes every screen easier to explain and test.

## Page 3

KAIZEN | Feature specification
3
2. Product screens
Screen
Purpose
Key contents
Today
Daily hub and next
action
Character state, health bar, streak, daily priority, remaining
quests, completion feedback and recovery guidance
Quests
Build and organize
commitments
Personal quests, scheduled quests, optional challenges,
filters for schedule, category and status, difficulty and XP
Habits
Understand recurring
rhythm
Weekly grid, completed / missed / rest states, per-habit
streaks and completion rate
Progress
Turn history into insight
Lifetime statistics, 365-day heatmap, pillar growth, seals,
recent activity ledger and weekly review
Profile
Express the identity
built over time
Character evolution, level, rank, selected goals, skill pillars
and achievement archive
Shared interaction rule
Every completion uses one underlying occurrence record. Completing a habit from Today or Habits
updates the same history, awards XP once, changes health consistently and can unlock a seal without
duplicate rewards.

## Page 4

KAIZEN | Feature specification
4
3. Gamification layer
The visual system should celebrate progress while keeping the user's routine understandable.
Achievements and seals
 Milestone seals such as Seven-Day Warrior, Iron Will and Hundred Gates Conqueror.
 Each seal records the accomplishment, unlock date, supporting activity and optional reflection.
 Unlock rewards automatically. Use a reveal animation for celebration without requiring a separate claim
action.
Difficulty and rewards
 Easy, Medium and Hard for the first release, with transparent XP values.
 Difficulty affects XP payout, while health impact depends on the user's planned commitment and recent
consistency.
 Optional challenges can be accepted, skipped or replaced with an equivalent alternative.
Rank and character evolution
 Rank titles change at level milestones and use KAIZEN's own terminology and visual language.
 Cognitive, Physical and Craft pillars use a fixed, published category mapping initially.
 Character expression responds to recent consistency and long-term milestones through posture,
expression, color and animation states.
4. Supporting features
 Onboarding asks for goals, categories, timezone, active days and a starter routine.
 Quick Quest adds an ad-hoc task through the same completion system as planned quests.
 One user-selected reminder time supports the daily priority, with an in-app reminder first and opt-in
browser notifications later.
 Settings cover theme, reminders, timezone, account basics and data export.
 A downloadable progress summary can become a resume-style artifact without requiring a public profile.

## Page 5

KAIZEN | Feature specification
5
5. Deferred features
These ideas can extend KAIZEN after the individual loop has been validated.
 Friend accountability with a shared weekly target and mutual encouragement.
 Protection tokens earned through progress and used for an unexpected absence.
 Guilds, public rankings and competitive leagues, which require stronger social, moderation and fairness
rules.
 Extensive avatar customization and multiple themes, after the health-state animation system is working.
 External email and push reminders, after timezone and scheduling behavior are reliable.
6. Release priorities
Release
Scope
MVP
Onboarding, quest CRUD, recurring habits, Quick Quest, daily priority, XP, health,
schedule-aware streaks, Today / Quests / Habits / Progress / Profile, seals and
recovery.
Next
Weekly review, reminders, downloadable progress summary, richer character states,
rest-day planning and earned protection tokens.
Later
Friend accountability, shared goals, guilds, rankings, public profiles, advanced
customization and external notifications.
7. Authenticity principles
 KAIZEN's character health, archival visual language and real-life achievement framing remain its core
identity.
 Borrowed patterns are translated into user-owned commitments, goal-aware challenges and a
recovery-oriented routine.
 All reward, streak and health changes should be explainable from dated activity history.
 The first release optimizes for a meaningful return to the routine, rather than maximum feature count.
Implementation note
Use one completion service to update quest state, XP, health, streaks and eligible seals in a single
database transaction. Store immutable reward and health events so Progress can explain how every total
was formed.
Prepared for KAIZEN project planning | 12 November 2026
