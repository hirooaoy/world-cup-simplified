# Codex Operating Manual

This manual defines the World Cup Simplified operating model for fast, safe
continuous delivery by a solo developer using multiple Codex threads.

## Core Principles

- Product trust comes first. Football facts, scores, match states, archives,
  forecasts, lineups, and provenance must be honest and source-backed. Never
  change a user-facing fact merely to satisfy a test.
- Preserve all local work. Never discard, overwrite, reset, clean, revert,
  force-push, or remove tracked or untracked work without explicit permission.
- Keep implementation maintainable and scoped. Follow existing patterns, avoid
  opportunistic refactors, and separate unrelated concerns.
- Treat localization as product behavior. Keep supported languages structurally
  complete and review translated meaning, not only key coverage.
- Review user-visible work at the actual affected desktop and mobile surfaces.
  Visual or interactive changes require a relevant browser check.
- Optimize for shipping frequency: safe, small releases should be easy enough
  to make throughout the day. Release ceremony is the exception, not the
  default.

## Parallel Work

- Develop in parallel and keep independent World Cup tasks narrow.
- When a task is finished, leave its settled changes alone and briefly record
  what changed and what was tested.
- One publishing task waits for relevant World Cup tasks to become idle, then
  ships the settled repository batch. Do not keep restarting a valid push for
  work that finishes after validation begins; that work goes in the next push.
- Coordinate only with tasks editing this repository. Never wait for, inspect,
  or poll unrelated Codex or ChatGPT tasks.
- When the user names a specific World Cup thread, wait only for that thread. If
  the shipment reference is genuinely ambiguous, ask once.
- Worktrees and short-lived branches are rescue tools for overlapping edits,
  mixed partial releases, or other unusual integration problems. They are not
  required for a routine `push latest`.

## Publishing Commands

### `push latest`

This is the normal fast path:

1. Wait for relevant World Cup tasks to become idle.
2. Inspect the settled diff and exclude unfinished experiments, unrelated
   projects, and obvious temporary debris.
3. Run the checks appropriate to the changed areas.
4. Commit and push the settled batch.
5. Let Git-triggered Vercel deploy it, verify the exact release, and stop.

Do not require a release manifest, hash inventory, temporary worktree, staged
diff approval, or patch extraction for an ordinary settled batch.

### `ship everything`

Include all completed intended project work. Existing files are not enough to
make unfinished or unreviewed experiments part of the release.

### `again`

1. Run `pnpm release:status` to check the working tree, live `origin/main`,
   exact-SHA Data Quality run, GitHub-reported Vercel deployment, and production
   reachability without changing repository or deployment state.
2. If a new settled World Cup batch exists, ship it.
3. If nothing new exists and production already matches the current commit,
   report that everything is current and stop.

The no-change path must not create an empty commit, rewrite release notes, rerun
the full local suite, or create another deployment.

### `redeploy`

Redeploy the existing exact commit without editing product files or creating a
commit. Do not rerun the complete local suite unless the commit or deployment is
unhealthy.

### `after the other thread`

Wait only for the specific World Cup repository thread identified by the user.

## Release Cutoff

After relevant World Cup tasks are idle, the settled tree at the start of final
validation is the release. Work that arrives later belongs to the next frequent
push unless it fixes a confirmed blocker in the current candidate.

## Careful Release Mode

Use a more explicit review only when the batch includes unusually high-risk or
hard-to-separate work, such as forecast or lineup methodology, localization or
application architecture, CI restructuring, a broad refactor, conflicting
parallel edits, or a requested partial release from a mixed checkout.

In careful mode, use only the extra safeguards the situation needs: a scoped
manifest, clean worktree, patch extraction, hash comparison, staged-diff review,
or separate approvals. These are recovery and review tools, not the everyday
publishing workflow.

## Risk-Based Testing

Use the smallest path that gives appropriate confidence.

### No source changes

- Confirm local and remote commit state.
- Confirm the exact commit has acceptable checks.
- Verify production only when needed.
- Do not run the complete local suite.

### Small isolated changes

Examples: copy, CSS polish, one localized string, a narrow test correction, or a
small Ball Boy behavior fix.

- Run focused local checks for the changed area.
- Run the relevant browser check for visual or interactive behavior.
- Use the exact-SHA GitHub workflow as the authoritative comprehensive gate.
- Do not automatically duplicate the complete suite locally.

### Factual or generated-data changes

- Verify the source of truth and the site's existing methodology.
- Run the relevant data, integrity, forecast, lineup, or historical checks.
- Review generated diffs for factual and provenance accuracy.

### Large or cross-cutting changes

Examples: localization architecture, broad responsive work, lineup generation,
data synchronization, or forecast methodology.

- Run focused checks during implementation.
- Run `pnpm test` once against the final settled tree.
- Run exact-SHA CI and verify production.

Do not rerun the complete local suite unless files materially change after the
previous complete run. For a narrow late change, rerun only affected checks.

## Release Notes

- Update `data/release-notes.json` only for meaningful user-visible behavior or
  content changes.
- Do not add or rewrite a public entry for test-harness corrections, CI
  stabilization, invisible refactors, workflow-only improvements, deployment
  retries, or redeploying an unchanged commit.
- When a release note is required, inspect the file directly and ensure its top
  entry matches the user-visible release scope.
- Combine related visual-polish changes into one concise entry instead of
  repeatedly rewriting it during the same micro-release.
- `pnpm release-notes:check` is a guard, not a substitute for judgment. Test,
  CI, documentation, and workflow files are intentionally not release-note
  eligible on their own.
- For a pending local batch, use
  `pnpm release-notes:check -- --include-working-tree`; it checks only pending
  changes unless an explicit `--base=<ref>` is supplied. CI continues to check
  the GitHub event's exact commit range.

## Integration and Publishing Path

1. Wait for relevant World Cup tasks to become idle and inspect the settled
   repository diff.
2. If nothing changed, report current status and stop.
3. Choose routine or careful mode from the actual risk, update release notes
   only when user-visible behavior or content changed, and run appropriate
   checks.
4. Commit and push the settled batch without losing unfinished or unrelated
   work. If `origin/main` moved, integrate it safely and rerun affected checks.
5. Treat exact-SHA GitHub CI as the comprehensive remote gate.
6. Let the repository's Vercel Git integration deploy `main`; do not also run
   `vercel --prod` for the same release.
7. Verify the exact production commit and relevant assets or APIs, then stop.

Use a manual Vercel deployment only for an explicitly requested redeploy, a
failed Git-triggered deployment, promotion of a specific verified deployment,
or recovery/rollback.

## CI and Release Boundaries

- Classify a publishing failure as release-candidate code, pre-existing code,
  parallel work, stale data, CI infrastructure, or a third party before editing.
- Clearly identify problems outside the original release scope.
- Fix only genuine release blockers in the publishing thread. Defer optional
  improvements to another thread or the next micro-release.
- For CI failures, inspect the exact run, job log, SHA, and workflow steps. Do
  not infer the cause from an email summary alone.
- When reproducing CI, use a clean worktree when practical and preserve all
  unrelated local edits.
- After integration or a blocker fix, rerun the checks materially affected by
  that change; rerun the full local suite only when the risk category requires
  it.

## Test Design

- Smoke tests assert user-visible contracts: visible DOM, roles, labels, URLs,
  focus behavior, stable geometry, and absence of unwanted navigation.
- Avoid raw hover, arbitrary timeouts, exact network order, and transient
  animation-state assertions unless that behavior is the product contract.
- Isolate desktop pointer and touch contexts explicitly.
- Prefer structural selectors and data attributes over text that can drift with
  localization or live data.
- If CI syncs data before smoke tests, reproduce that workflow state before
  deciding an assertion is wrong.

## Communication and Final Record

Give progress updates for meaningful discoveries, scope or methodology
decisions, blockers, review milestones, major test results, deployment status,
and completion. Do not narrate every command, poll, retry, or minor edge case.

The final release record should contain:

- final commit SHA and GitHub CI status;
- Vercel deployment and production verification;
- included scope and excluded temporary artifacts;
- blocker fixes added during publishing;
- remaining non-blocking warnings;
- an honest report of the staged and remaining local state, plus whether local
  `main`, `origin/main`, and production are aligned. Never call a checkout clean
  when unfinished work remains.
