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
- Waiting is passive and read-only. The publishing task may list relevant
  threads, read their status, and wait or poll for completion. It must not send
  messages, delegation prompts, follow-ups, interruptions, freeze notices,
  `wrap it up` requests, ownership transfers, or handoff instructions to those
  threads unless the user explicitly asks for that exact cross-thread action.
- A shared dirty checkout is normal during parallel work. Do not treat the
  presence of changes as evidence that they are unfinished; task activity and
  the settled diff determine whether the batch is ready.
- Coordinate only with tasks editing this repository. Never wait for, inspect,
  or poll unrelated Codex or ChatGPT tasks.
- When the user names a specific World Cup thread, wait only for that thread. If
  the shipment reference is genuinely ambiguous, ask once.
- Worktrees and short-lived branches are rescue tools for overlapping edits,
  mixed partial releases, or other unusual integration problems. They are not
  required for a routine `push latest`.

## Publishing Commands

### `push latest`

This is the default workflow for fast, frequent solo development across
multiple World Cup Codex threads. A shared dirty checkout is normal while
relevant threads are working.

1. Wait quietly until all relevant World Cup repository tasks are idle.
   - Use read-only thread listing, status reads, or passive waiting only.
   - Do not call thread messaging, follow-up, interruption, delegation,
     ownership-transfer, or handoff tools as part of the wait.
   - If a relevant thread needs user input, report that blocker in the
     publishing thread and continue waiting; do not answer or steer it from
     another thread.
   - A bare `push latest` or `push to GitHub and Vercel` does not cancel an
     existing wait. Only an explicit user instruction such as `do it now`
     overrides it, and that override still does not authorize steering sibling
     threads.
2. Ignore unrelated ChatGPT or Codex tasks.
3. Inspect the settled combined World Cup diff.
4. Include all completed and approved work unless something is explicitly
   unfinished, experimental, conflicting, or excluded.
5. Run tests according to risk.
6. Update release notes only for meaningful user-visible changes.
7. Commit the settled batch.
8. Push without force.
9. Rely on the existing Git-triggered Vercel deployment.
10. Verify CI, production, commit alignment, and remaining local state.
11. Stop.

Do not repeatedly ask what to include when `push latest` or `push all` is clear.
Do not use temporary worktrees, hash inventories, partial patch extraction,
release manifests, or staged-hunk approval as the default. Reserve those tools
for partial releases, unfinished conflicts, mixed experimental work, or
explicit review.

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

## Exceptional Release Tools

Settled forecast or lineup methodology, localization, application architecture,
CI, and broad-refactor work still uses the normal publishing path. Increase the
testing depth to match the risk without automatically adding release ceremony.

Use a scoped manifest, clean worktree, patch extraction, hash comparison,
staged-diff review, or separate approval only when work is unfinished or
conflicting, the user requests a partial release from a mixed checkout, or the
user explicitly asks for that review. These are recovery and separation tools,
not the everyday publishing workflow.

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
3. Update release notes only when user-visible behavior or content changed and
   run checks appropriate to the actual risk. Use exceptional release tools
   only for unfinished conflicts, requested partial releases, or explicit
   review.
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
- The publishing thread may fix a regression when it is directly caused by, or
  clearly part of, the settled release batch.
- Publishing recovery is limited to one root cause. Investigate, repair, and
  revalidate that cause until it is resolved or genuinely blocked. Do not
  expand the publishing pass to unrelated failures. If validation reveals a
  different root cause, stop and move it to a separate implementation task. Do
  not continue feature development inside the publishing task.
- If validation discovers an unrelated issue, optional improvement, new
  methodology decision, or broad refactor, stop and report it for a separate
  implementation task.
- Fix direct release regressions. Do not turn publishing into open-ended
  feature development.
- For CI failures, inspect the exact run, job log, SHA, and workflow steps. Do
  not infer the cause from an email summary alone.
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

While waiting for relevant threads, do not repeatedly narrate polling or task
details. Use concise updates only when relevant work is still active, final
validation begins, a blocker is found, the release is pushed, or production and
CI are verified.

Cross-thread silence is part of this communication rule. Routine publishing
must never insert synthetic user messages into another chat. Observing that a
thread is active is not permission to tell it to stop, finish, summarize,
freeze, or hand off its work.

The final release record should contain:

- final commit SHA and GitHub CI status;
- Vercel deployment and production verification;
- included scope and excluded temporary artifacts;
- blocker fixes added during publishing;
- remaining non-blocking warnings;
- an honest report of the staged and remaining local state, plus whether local
  `main`, `origin/main`, and production are aligned. Never call a checkout clean
  when unfinished work remains.
