# Proposal

## Why

The Stitch exports already share a visual vocabulary across five signed-in screens and Login, with a small 404-specific palette. A single token and font layer gives later restyles a stable reference and keeps their visual changes reviewable.

## What Changes

- Establish the complete Kaizen UI v4 colour, type, spacing, square radius, and font-weight contract in the Tailwind v4 theme. Preserve the 404 palette in an explicit 404 scope.
- Register Space Grotesk, DM Sans, and Space Mono through `next/font/google` using build-time self-hosting. Expose the approved family weights for later restyles. Keep the built-in Tailwind `font-black` utility unchanged so each screen can select its own treatment.
- Add one regression test for token names, zero radii, the three `next/font` weight registrations, and the 404 scope. Keep the existing root verification commands.
- Use the [token and font tables](design.md) as the implementation contract. The Stitch HTML supplies token definitions and markup, and the matching PNG controls visual interpretation.

## Inventory

Checked the seven readable `code.html` and seven readable `screen.png` files under `"Kaizen/UI, v4"`. Sizes are bytes. No expected files are missing.

| Screen                      | Export directory under `UI, v4`                      |   HTML |     PNG |
| --------------------------- | ---------------------------------------------------- | -----: | ------: |
| Today                       | `kaizen.01_today_poster_editorial_edition`           | 36,929 | 525,282 |
| Quests                      | `kaizen.02_quests_poster_editorial_edition`          | 31,315 | 542,619 |
| Habits                      | `kaizen.03_habits_poster_editorial_edition`          | 47,846 | 540,791 |
| Progress                    | `kaizen.04_progress_12_month_block_heatmap`          | 60,670 | 640,323 |
| Profile                     | `kaizen.05_profile_character_dossier_poster_edition` | 41,342 | 487,487 |
| Login                       | `kaizen login`                                       | 13,413 |  79,449 |
| KAIZEN — 404 Archival Fault | `kaizen 404`                                         | 15,312 | 241,649 |

The six shared configs agree on all 47 colours, all 13 family and type-scale entries, and all 10 spacing steps. The four divergent 404 colours keep their approved scoped values, with a fifth scoped colour for muted text. The exported nonzero radii are deliberately overridden to zero. The PNG review approved the Progress and Profile 900 → 700 substitution. The two Quests elements are pending restyle. The [platform-dependent serif comparison](design.md#quests-display-type) records the provisional stack. Select and self-host a serif in a separate change before the Quests restyle and v4 demo.

## Capabilities

### New Capabilities

- `web-design-tokens` establishes the shared theme contract, scoped 404 palette, square radii, and self-hosted typography for later web restyles.

### Modified Capabilities

None.

## Impact

Future apply touches the web root layout, `apps/web/src/app/globals.css`, and one JavaScript ESM token test. API routes, contracts, dependencies, and existing screen selectors remain as they are. SVG icon adoption is deferred to the relevant screen restyle.

## Deferred Scope

| Deferred item                    | Reason                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All screen restyles              | Separate visual reviews will validate hierarchy, structure, and keyboard access against each PNG.                                                                  |
| Login and 404 API/routing wiring | The tokens do not change authentication behaviour, navigation destinations, or the framework's not-found handling.                                                 |
| Sidebar navigation               | Layout, navigation, active states, and keyboard order are a separate shell change.                                                                                 |
| Character art                    | The Stitch avatar dossier asks for artwork and data distinct from the existing health feedback. It requires approved assets and an explicit presentation contract. |
| Seal claim button                | Existing seal rewards are committed automatically. An explicit claim action would change reward semantics.                                                         |
| Pillar mastery levels            | Existing pillar totals are not a mastery-level read model.                                                                                                         |
| Export dossier                   | No dossier export workflow is scoped or needed for the token layer.                                                                                                |
| Recalibrate protocol             | Its product behaviour and mutation contract need a separate decision.                                                                                              |
| Transfer recovery seals          | Transfer rules and ownership semantics need a separate decision.                                                                                                   |
| Quick Quest                      | The API already supports quick-quest creation. The Stitch shortcut and its UI flow are separate work.                                                              |
| Weekly review                    | A review surface and its data requirements need their own scope.                                                                                                   |
