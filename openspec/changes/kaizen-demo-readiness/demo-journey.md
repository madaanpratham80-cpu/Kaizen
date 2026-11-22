# Demo journey

One Chrome session on 23 November 2026, Asia/Kolkata. The clean verification worktree was at 2b4bea4. The handoff commit adds this record to the tested application tree. Each time below is when the browser observed the result.

| Step | Time (IST) | Result | Browser observation |
| --- | --- | --- | --- |
| Register | 03:54:27.881 | Pass | The account page showed “Motion browser fixture”. |
| Prepare today's planned quest | 03:54:28.055 | Setup | The browser created “Demo planned quest”. On the disposable database a transaction removed one empty open plan and moved one schedule's effective date to today. |
| Complete on Today | 03:54:28.142 | Pass | Completion returned HTTP 200. Today showed Healthy, Health 75%, Level 1 and 10 XP. |
| Open Habits | 03:54:28.188 | Pass | The quest row showed Completed, Current 1 and Best 1. |
| Open Progress | 03:54:28.235 | Pass | The quest ledger entry showed +10 XP, +5 health and Event 1. |
| Open Profile | 03:54:28.281 | Pass | Motion browser fixture, Level 1, Initiate, 10 XP. |
| Open Settings | 03:54:28.326 | Pass | The display name field showed Motion browser fixture. |
| Save display name | 03:54:28.370 | Pass | Settings confirmed the save and displayed “Demo updated name”. |
| Sign out | 03:54:28.413 | Pass | The shell signed out and opened the login form at /login. |
| Sign back in | 03:54:28.672 | Pass | The same account signed back in and showed “Demo updated name”. |

The journey used the production webpack build, local ingress on 3492, Express on 3491 and Next on 3493. PostgreSQL started empty on 55435, all migrations applied, and the temporary cluster was stopped and removed. SQL was used only to prepare today's scheduled occurrence. The browser performed the completion and all account actions.

## Gap record

| Gap | Status | Evidence and commit | pnpm test | pnpm test:db | pnpm lint | pnpm build |
| --- | --- | --- | ---: | ---: | --- | --- |
| 0 · Quests STIX | Clean-machine rendering open. The available Mac has STIX installed. | [Font selection and fixture](../kaizen-quests-display-serif/verification.md), 5a5dbf4 (existing commit results) | 171 passed | 85 passed | Passed | Passed |
| 1 · Four-key rename | Four-key trial reached whitespace validation. Follow-up with letter keys saved a two-word title at version 2. | [Keystrokes and persisted value](../five-screens-character-feedback/verification-quest-edit-keyboard.md), 4fbd4e2 | 171 passed | 85 passed | Passed | Passed |
| 2 · +450 | Documented mockup-only figure | [Quests Total Yield](../kaizen-ui-v4-design-tokens/limitations.md#quests-total-yield), a7b51e7 | 171 passed | 85 passed | Passed | Passed |
| 3 · Health bands | Closed. Fading 38% to Tired 40%. | [Sampled browser frames](../five-screens-character-feedback/verification-reduced-motion-bands.md), 281fb93 | 171 passed | 85 passed | Passed | Passed |
| 4 · Settings errors | Closed. Real HTTP 400 and accessible per-input messages. | [Settings PATCH](../five-screens-character-feedback/verification-settings-field-errors.md), c0352db and e898a9b | 172 passed | 85 passed | Passed | Passed |
| 5 · Cross-tab saves | Documented limitation. Later save wins. | [Two-tab reproduction](../kaizen-ui-v4-design-tokens/limitations.md#two-settings-tabs-can-overwrite-the-same-field), c7f676d | 172 passed | 85 passed | Passed | Passed |
| 6 · Quests restyle | Documented deferral. HTTP 200 and live STIX heading verified. | [Current Quests layout](../kaizen-ui-v4-design-tokens/limitations.md#quests-restyle), 2b4bea4 | 172 passed | 85 passed | Passed | Passed |

Final verification on the journey build: pnpm test passed (15 contracts, 108 web, 49 API). pnpm test:db passed (85 tests after seven migrations on a separate fresh database). pnpm lint passed all three packages. pnpm build passed with webpack and generated 12/12 static pages.

## Main checkout rerun

On 23 November 2026, 03:57:20–03:57:21 IST, the production app built and served from the local main checkout completed the same journey on a fresh database. The browser registered, completed the fixture-prepared planned quest, saw its Completed cell in Habits and its +10 XP / +5 health event in Progress, read 10 XP on Profile, saved “Demo updated name” in Settings, signed out to /login and signed back in with the saved name. The services stopped and the temporary database was removed.

Separate keyboard verification saved “panel review” with one PATCH. The main-checkout gates passed: 172 regular tests, 85 fresh database tests, lint in three packages and webpack build with 12/12 static pages. The standalone Quests suite also passed 4/4. Clean-machine STIX rendering remains open.
