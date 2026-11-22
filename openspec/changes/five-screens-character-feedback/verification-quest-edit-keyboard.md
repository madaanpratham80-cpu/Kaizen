# Quest edit with four keys

Open on build 5a5dbf4. Headless Chrome, production Next.js and Express, one freshly migrated PostgreSQL database. Setup registered an account and created “Desk review” through the UI. The keyboard check began on a fresh navigation to /quests, after the Edit button rendered.

| Keystrokes | Observed focus or result |
| --- | --- |
| Tab ×13 | Today → Quests → Habits → Progress → Profile → Settings → Onboarding → Sign out → Category filter → Recurrence filter → Status filter → New quest → Edit Desk review |
| Enter | Edit form opened. Focus stayed on Edit Desk review. |
| Shift+Tab ×11 | Cancel → Save changes → Effective date (four stops) → Recurrence → Target → Difficulty → Category → Title |
| Space | Chrome had selected all 11 title characters. Space replaced them with a single space. |
| Tab ×9 | Category → Difficulty → Target → Recurrence → Effective date (four stops) → Save changes |
| Enter | Save changes activated. The alert read “Check title. Too small: expected string to have >=1 characters”. |
| Authenticated GET /api/v1/quests | HTTP 200. The only quest remained “Desk review”, version 1. |

The first blocking control was Title. The four permitted keys provided no letter to replace the selection with. Edit and Save were both keyboard-accessible. A successful title mutation under this restriction remains unverified. The run found no missing label or handler. The disposable services stopped and the database was removed.

Verification on this build: pnpm test passed (15 contracts, 107 web, 49 API). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack.
