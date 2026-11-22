# Settings committed-code browser verification

Verified commit `6f941c8566fbc48b1e0ffd27099cb8b4bcc235c1` on November 22, 2026, Asia/Kolkata. The working tree was clean. The screen uses the shared response schema from Settings contract commit `8c72ec2`. The committed webpack build passed.

The Codex in-app browser used the production build, local Express API and a same-origin proxy. The setup command, `bash /private/tmp/kaizen-settings-committed/setup.sh`, applied all six migrations to an isolated disposable PostgreSQL database. The fixture registered a disposable account and materialized its current plan before the browser save.

```text
GET /settings anonymous: 307 -> /login
GET /settings authenticated: 200
From Display name, Tab reached Timezone. Enter submitted PATCH /api/v1/settings: 200.
The form showed “Settings saved.” and “Pending timezone: Asia/Kolkata on 2026-11-24.”
The active timezone remained UTC. The full DayPlan row matched before and after the save.
```

The pending date came from the PATCH response. PostgreSQL also showed the transition from UTC to Asia/Kolkata with a null applied timestamp. The disposable services were stopped after verification.

The full unit suite passed 142 tests, including 8 Settings tests and 5 Settings response contract tests. The database suite passed 78 tests against fresh PostgreSQL, and lint passed.

## Known limitations

- An ambiguous API rejection of multiple fields returns `Invalid request input.` at form level. Returning structured validation paths and wiring them to the form is a separate API follow-up.
- Same-field saves and retries across tabs are last-write-wins because the endpoint has no version check. The Settings form submits only changed fields.
