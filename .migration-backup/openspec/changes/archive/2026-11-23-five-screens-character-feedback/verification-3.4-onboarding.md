# Onboarding committed-code browser verification

Verified commit `360f18b` on November 22, 2026, using the Codex in-app browser, the production webpack build and a local same-origin proxy. The setup script `bash /private/tmp/kaizen-settings-committed/setup.sh` created a disposable PostgreSQL database and an account through the API. Its existing fixture also creates and completes a separate quest; this is test setup, not an Onboarding path.

- Anonymous `GET /onboarding`: HTTP 307 to `/login` (also observed in the browser).
- Authenticated: the browser rendered the Onboarding form with an empty start date and the required timezone explanation.
- The browser submitted a display name and starter quest with a user-entered start date. The screen displayed the server-saved display name and `Starter quest created: Browser starter quest.`
- The component tests cover a lost response, identical retry bodies and client ID reuse; that failure was not simulated in this browser run.

The broader seven-route, account-switching, keyboard and reduced-motion sweep remains under task 3.5.
