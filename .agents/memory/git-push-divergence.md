---
name: Git push divergence
description: Why pushing local main to GitHub origin/main is rejected and how to handle it
---
Local `main` uses the migrated `artifacts/kaizen` layout; GitHub `origin/main` still has the original `apps/web` layout with different history. `git push origin main` is rejected as non-fast-forward.

**Why:** the workspace was migrated/grafted, so histories are unrelated.
**How to apply:** git writes need `DANGEROUSLY_ALLOW_GIT=1`. Never force-push without explicit user consent; offer a separate branch instead.
