---
name: Kaizen migration verification
description: How to tell whether account flows are working in the migrated app.
---

Verify account flows on the HTTPS preview with a fresh browser context and check that registration and session reads succeed on the actual API. Also reload a protected deep link and confirm saved data remains visible.

**Why:** Guest mode is intentionally usable without the API, and the imported login flow can fall back to it. A dashboard alone does not prove that the database or cookie-backed session works. Reload also lets the shell and page verify the same session in parallel, a timing case that request mocks can miss.

**How to apply:** Use a disposable account for browser testing. Verify guest behavior separately in a fresh context.
