---
description: Verify, fix, commit, and push the latest working-tree changes
---

The other chat just updated files in this repo. Pick up the latest working-tree changes and ship them:

0. **Before touching anything, sync with the other chat sessions:**
   - `git fetch origin` and check if local `main` is behind. If so, fast-forward first.
   - List `.claude/worktrees/` (if it exists). For each worktree, `cd` in and run `git status`. If any worktree has uncommitted changes or sits on a branch ahead of main, those are unshipped edits from a sibling chat — surface them in the report and reconcile BEFORE editing. When the worktree's branch is far behind main, copy the changed files into main rather than merging the branch (a stale merge will overwrite recent fixes).
   - After copying worktree files in, re-verify any recent fixes you made to the same files in main are still present; if not, re-apply them.
1. Run `git status` and `git diff` to see what changed.
2. From `next/`, run `npx tsc --noEmit` — this is the same check Vercel runs during build.
3. If there are TS errors, fix them. After each fix, sweep the codebase with Grep for the same pattern and fix every other occurrence too (one bug usually has siblings — e.g. missing `as never` on Supabase `.update/.insert/.upsert`, missing `<Database>` generic on `createClient`, untyped union returns from helpers).
4. Re-run `npx tsc --noEmit` until it's clean.
5. From `next/`, run `npm run lint` and fix any errors it surfaces.
6. Stage only the files that actually changed — never use `git add -A` or `git add .` (that would pull in `.claude/`, scratch dirs, secrets). Add files by name.
7. Commit with a message describing what was fixed (use the project's commit style — short imperative subject, optional body), and push to `main`.
8. Report back in 3-5 lines: the commit SHA, what was fixed, and whether the deploy is safe to expect green.

Rules:
- Don't ask the user to confirm individual fixes — just do them. The user has already authorized the ship.
- Only stop and ask if you find a change that looks intentionally wrong or destructive (a deleted feature, a config change you don't understand, secrets being committed).
- **Before any destructive action — deleting tracked files, dropping DB columns, archiving Stripe products/prices, removing env vars, `git worktree remove` — verify nothing in the repo references it (grep + check live deploys). If anything looks load-bearing, surface it and ask first.** Never auto-remove `.claude/worktrees/*` even if the branch looks stale.
- Never use `--no-verify` or skip hooks. Fix the underlying issue.
- Never amend or force-push to `main`. Always create a new commit.
- If `npx tsc --noEmit` is silent, that means clean — proceed.
