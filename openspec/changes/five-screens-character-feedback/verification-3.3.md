# Task 3.3 committed-code browser verification

Chrome verified commit 33f801ce229a4d502ef6f0eb71795faff2e827c5 on 2026-11-19, Asia/Kolkata. Tracked application files matched that commit during the run.

Command executed from the repository root was bash /private/tmp/kaizen-33-committed/browser.sh. The driver used headless Chrome, built Next.js, Express, and an empty disposable PostgreSQL database. It applied all six migrations. The database and processes were removed after the check.

The driver registered an account and created a quest through the application. Fixture-only psql updates backdated the account by 32 days and made the schedule effective yesterday. Normal calendar sync produced the close events. Today completed the planned occurrence through the API. Recovery earned the Iron Will seal, producing 35 lifetime XP and 34 ledger events. The initial driver still expected the earlier fixture’s 10 XP; that expectation was corrected before the successful run below.

Reduced motion was enabled with Chrome Emulation.setEmulatedMedia before completion and remained enabled during ledger pagination and reload. The driver compared the habit row against the live Habits API response. It intercepted the pagination fetch URL and asserted a nonempty cursor and limit=25.

Each result line below comes from the successful committed-code browser log.

```text
/habits anonymous: 307 /login
/progress anonymous: 307 /login
/habits authenticated: 200
/progress authenticated: 200
Habits API and rendered row agree: current 1, best 1, completion rate 0% over elapsed scheduled dates.
Progress ledger: 25 initial rows and 9 remaining rows; the next request used the returned cursor with limit=25.
Progress: 35 lifetime XP, Cognitive 10 XP, 365 labelled cells; reduced motion was on during pagination and after reload.
```

The additional pre-commit pnpm test:db run passed 76 tests on fresh PostgreSQL without a retry. Previous root checks passed 117 tests, lint and the webpack build. The ApiError caller search found two calls, both with all three arguments. auth/client.js was unchanged.
