# Proposal

## Why

The Quests PNG uses serif lettering for the page heading and Total Yield figure. A local system serif varies by platform. Ship the selected serif with the web build so the later restyle can use one face across demo machines.

## What Changes

- Register normal STIX Two Text at 700 through `next/font/google` for `/quests`.
- Apply the scoped font at 700 to the existing Quests heading. Reuse that display class on the Total Yield figure when the restyle has a defined value to show.
- Remove the explicit system-font fallback and store the type comparison and browser evidence in this change.

## Capabilities

### New Capabilities

- `quests-display-typography`: Expose a self-hosted serif display face for the two Quests elements ahead of the restyle.

### Modified Capabilities

None.

## Impact

This adds one route-specific font registration and a test in the web package. It requires no package, API, or database change.
