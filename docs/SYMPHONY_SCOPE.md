# Harness Symphony Scope

This file records how the upstream repository-harness Symphony model should map
onto Bra Auto Measure when the local tooling is available. It is intentionally
project-scoped, not a copy of the upstream repository's internal Symphony
backlog.

## Purpose

Symphony should let this project run Harness stories with:

- a clear story contract,
- an isolated workspace for normal and high-risk work,
- required result artifacts,
- reviewable durable-state changes, and
- validation tied back to `docs/TEST_MATRIX.md` and `TESTING.md`.

## Non-Goals

- Do not import upstream repository-harness internal story packets into this
  product repo.
- Do not make Symphony responsible for detecting or drafting POMs.
- Do not bypass the project rule that `app.js` is generated from `src/*`.
- Do not run remote installer scripts or downloaded binaries inside a restricted
  sandbox without explicit human approval.

## Readiness Gates

Symphony is ready for use here only when all of these are true:

| Gate | Required state |
| --- | --- |
| Durable CLI | `scripts/bin/harness-cli` exists and `scripts/bin/harness-cli query matrix` runs. |
| Symphony binary | `target/debug/harness-symphony doctor` runs successfully, or an equivalent installed binary is documented. |
| Repository state | The root can be treated as a real Git worktree or the Symphony command supports the local non-git mode being used. |
| Story contract | The selected story under `docs/stories/` has lane, acceptance criteria, and proof command. |
| Validation | The suite named by the story exists in `package.json` or the story explains why proof is manual or blocked. |

## Bra Auto Measure Constraints

Every Symphony run must preserve the fixed project constraints:

- Runtime stays fully offline; no sketch or measurement data leaves the browser.
- The 16 POMs and anchor schema remain deliberate versioned contracts.
- Source edits go through `src/*` plus `npm run build`; `app.js` is generated
  output.
- Validation must use the relevant app suites: `npm run check`, `npm run smoke`,
  and the focused suite for the touched behavior.

## Expected Artifacts

A successful run should leave:

- a concise summary of the product or harness delta,
- validation evidence,
- a semantic changeset when durable Harness state changed,
- updated story status or evidence, and
- any friction captured in backlog or story notes.

Until Symphony is actually installed, this document is a readiness contract, not
an instruction to launch runs.
