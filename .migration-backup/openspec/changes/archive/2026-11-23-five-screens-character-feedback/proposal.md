# Proposal

## Why

The five screens need owned read models and account settings before they can present consistent history and character feedback.

## What Changes

- Add bounded Habits, Progress and Profile read routes.
- Add validated settings changes and transactional account deletion.
- Add shared Tailwind tokens and accessible progression components.
- Connect Today, Quests, Habits, Progress and Profile to owned API data.
- Add GSAP character feedback for health band changes, committed XP and health updates, and seal reveals.

## Capabilities

### New Capabilities

- `progress-read-models`: Owned Habits, Progress and Profile responses.
- `account-settings`: Owned settings and reauthenticated account deletion.
- `progression-screens`: Shared progression UI and the five signed-in screens.

### Modified Capabilities

None.

## Impact

Step 1 depends on Slice 2 calendar data and Slice 3 progression records and passing concurrency tests. Step 2 supplies the shared UI used by Step 3. Screen commits are grouped by workflow. Step 4 adds character feedback in a separate commit and uses committed progression values.
