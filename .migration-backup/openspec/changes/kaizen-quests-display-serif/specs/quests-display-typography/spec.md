# Spec Delta

## Purpose

Provide a consistent, locally served display serif for the Quests restyle.

## ADDED Requirements

### Requirement: Scope the display serif to Quests

The web build SHALL serve normal STIX Two Text 700 from the app through `--font-quests-display` on the Quests screen, without a configured system-font fallback. The class SHALL apply to the Quests heading and to the yield figure when present in the restyled screen. The shared font registrations and other Quests text SHALL keep their existing families.

#### Scenario: The Quests restyle uses the display serif

- **WHEN** the heading or Total Yield number opts into the Quests font variable at weight 700
- **THEN** the browser can use the app-served bold face without requesting it from an external host
