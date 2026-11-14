# Proposal

## Why

The five screens need owned read models and account settings before they can present consistent history and character feedback.

## What Changes

- Add bounded Habits, Progress and Profile read routes.
- Add validated settings changes and transactional account deletion.

## Capabilities

### New Capabilities

- `progress-read-models`: Owned Habits, Progress and Profile responses.
- `account-settings`: Owned settings and reauthenticated account deletion.

### Modified Capabilities

None.

## Impact

Step 1 depends on Slice 2 calendar data and Slice 3 progression records and passing concurrency tests. Screen implementation and character feedback will be planned in later steps.
