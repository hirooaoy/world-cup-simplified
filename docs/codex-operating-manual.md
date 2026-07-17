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
- Prefer frequent, narrow micro-releases over release ceremony. Do not add a
  PR-heavy workflow for routine solo development.

## Parallel Work and Ownership

- Keep independent World Cup tasks narrow and single-purpose.
- Use isolated Git worktrees or short-lived branches when parallel threads may
  overlap in the same files. Small sequential fixes may use the main checkout
  when no other World Cup task is actively modifying it.
- One designated integration/publishing thread normally owns the combined
  commit, push to `main`, exact-SHA release gate, and production verification.
- Feature threads should hand off:
  - ready to ship: yes or no;
  - branch, worktree, commit, or settled diff;
  - concise scope and completed tests;
  - whether the change is user-visible;
  - whether public release notes are needed;
  - remaining risk or uncertainty.
- Coordinate only with tasks editing this repository. Never wait for, inspect,
  or poll unrelated Codex or ChatGPT tasks.
- When the user names a specific World Cup thread, wait only for that thread. If
  the shipment reference is genuinely ambiguous, ask once.

## Publishing Commands

### `push latest`

Include all completed and settled World Cup work available when final release
validation begins. Preserve completed parallel work, exclude unfinished
experiments and obvious temporary build debris, and do not start optional new
feature work during publishing.

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

## Micro-Release Cutoff

The completed and settled tree at the start of final release validation is the
current micro-release. Work that settles later belongs to the next frequent
push unless it fixes a confirmed blocker in the current candidate. Do not keep
restarting a valid release merely to remain continuously latest.

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

1. Inspect branch, dirty state, settled diffs, unfinished artifacts, and whether
   a specifically named World Cup thread still owns relevant edits.
2. Set the micro-release cutoff and classify the batch by risk.
3. Short-circuit a no-change `again` before release-note edits or broad tests.
4. Assess release-note need and run the selected focused or complete local path.
5. Integrate without losing work. If `origin/main` moved, use a safe rebase or
   merge appropriate to the current tree, then rerun checks affected by the
   integration.
6. Commit and push the settled batch once through the designated publishing
   thread.
7. Treat exact-SHA GitHub CI as the comprehensive remote gate.
8. Let the repository's Vercel Git integration deploy pushes to production from
   `main`; do not also run `vercel --prod` during a normal release.
9. Verify production serves the intended exact commit and that relevant assets
   and APIs are healthy.
10. Once the exact release is verified, stop changing files.

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
- confirmation that the working tree, local `main`, `origin/main`, and
  production are aligned.
