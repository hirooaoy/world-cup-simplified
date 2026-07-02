# Codex Operating Manual

This manual defines how Codex should work in this repository. Use it to keep
feature work, CI repair, stabilization, and shipping disciplined.

## Core Principles

- Product trust comes first. Scores, match states, archive data, localization,
  player cards, and release notes must be honest and verifiable.
- Preserve local work. Never discard, reset, or mix unrelated edits without
  explicit approval.
- No blind pushes. Inspect the exact diff, current branch, remote state, and
  relevant workflow before publishing.
- Keep commits clean. Separate product changes, test-harness changes, generated
  data snapshots, and release-note updates unless they are inseparable.
- Before editing, classify the issue, explain the likely root cause, explain why,
  propose the strategy, and wait for approval unless the fix is obvious and low
  risk.

## Operating Modes

### Decision Mode

Use when the path is unclear or risky. Do not edit yet.

- Read the relevant code, data, workflow, or CI logs.
- Classify the issue: product bug, data drift, test fragility, workflow failure,
  release hygiene, or deployment concern.
- State the likely root cause and proposed strategy.

### Feature Mode

Use for normal product work.

- Inspect existing patterns before implementing.
- Keep scope tight and preserve unrelated local edits.
- Update `data/release-notes.json` for user-facing changes.
- Run focused checks first, then the relevant full gate before shipping.

### CI Mode

Use when GitHub Actions, Data Quality, or sync automation is red.

- Start from the real run, job log, SHA, and workflow steps.
- Reproduce the same command chain in a clean worktree when practical.
- Do not infer from the email summary alone.
- Separate data drift, product bugs, and test fragility before patching.
- Push only after the local workflow-equivalent gate passes.
- Watch the replacement GitHub run to completion.

### Stabilization Mode

Use when failures form a pattern.

- Stop one-line fixes.
- Audit the whole affected subsystem.
- Replace brittle timing, hover, pointer, animation, and network-order checks
  with deterministic user-visible assertions.
- Summarize the test strategy change before committing.

### Emergency Mode

Use for live correctness or production-risk issues.

- Prioritize the smallest safe fix.
- Preserve rollback options.
- Verify production directly, especially cache-busted `/api/live-data`.
- Document what was skipped and what must be revisited.

## CI Ownership Rules

- One Codex thread owns CI while stabilization is active.
- No feature pushes during CI stabilization.
- Unrelated local edits stay unstaged.
- `main` only moves for the stabilization fix or a required data snapshot.
- Feature work resumes only after the replacement `main` CI run is green.

## Stop Conditions

- First failure: investigate the exact run and classify the issue.
- Second related CI-only failure with local pass: stop patching and audit the
  subsystem.
- Any third patch in the same file requires explicit user approval.
- If `origin/main` moves during CI work, rebase or integrate it and rerun the
  important checks before pushing.

## Testing Philosophy

- Smoke tests assert user-visible contracts: visible DOM, roles, labels, URLs,
  focus behavior, stable geometry, and no unwanted navigation.
- Avoid raw hover, arbitrary timeout, exact network-order, and animation-state
  assertions unless that behavior is the product contract.
- Desktop-only checks must opt into desktop media in the Playwright test context.
- Touch checks must stay isolated in explicit touch contexts.
- Use structural selectors and data attributes over brittle rendered text when
  localization or live data can drift.
- If CI runs sync steps before smoke, reproduce the synced workflow state before
  deciding an assertion is wrong.

## Prompt Library

Feature work:

> Build this feature end to end. First inspect existing conventions and local
> dirty work. Keep unrelated edits out. Update release notes for user-facing
> behavior. Verify with focused checks first, then the relevant full gate before
> pushing.

CI failure:

> Treat this as CI triage. Inspect the exact GitHub run, job log, SHA, and
> workflow steps first. Reproduce the same command chain in a clean worktree.
> Classify whether this is data drift, product bug, test fragility, or workflow
> failure before editing.

Stabilization:

> Stop one-line fixes. Audit the whole affected subsystem for brittle
> assumptions. Replace timing, hover, pointer, animation, and network-order
> assertions with deterministic user-visible contracts. Summarize the strategy
> before committing, then run the full gate cleanly.

Shipping:

> Before pushing, summarize the exact diff, product versus test-only changes,
> release-note impact, local verification, and remote state. Push once, then
> watch GitHub Actions to completion.
