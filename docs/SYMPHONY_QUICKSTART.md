# Harness Symphony Quick Start

Harness Symphony is the upstream repository-harness runner for executing Harness
stories through isolated agent workspaces. This project has adopted the
Symphony documentation surface so future work can use it when the required
binaries and repository setup are present.

## Local Status

Symphony is not active in this checkout yet.

- `scripts/bin/harness-cli` is absent.
- `target/debug/harness-symphony` is absent.
- This folder is not currently recognized by `git status` as a Git worktree,
  which means Symphony's normal isolated-worktree flow is not ready here.

Until those are restored, use the normal Harness loop:

1. Read `AGENTS.md`, `CLAUDE.md`, and the lane-specific docs.
2. Classify the work with `docs/FEATURE_INTAKE.md`.
3. Use `docs/TEST_MATRIX.md` as the proof fallback when `query matrix` cannot
   run.
4. Keep story packets under `docs/stories/`.
5. Report the missing CLI/Symphony state as harness friction when it affects the
   task.

## Intended Flow After Setup

When Symphony is equipped, the upstream flow is:

```text
Harness story
  -> isolated run workspace
  -> explicit run contract for the assigned agent
  -> SUMMARY.md and RESULT.json
  -> semantic changeset for durable Harness state
  -> human review and sync
```

Tiny stories may run in the current checkout. Normal and high-risk stories use
an isolated workspace so the root durable state is not mutated directly during
agent execution.

## First Commands After Restoration

Run these from the repository root after the CLI and Symphony binary are
installed:

```sh
scripts/bin/harness-cli init
scripts/bin/harness-cli query matrix
target/debug/harness-symphony doctor
target/debug/harness-symphony work list
```

Do not use Symphony for Bra Auto Measure source changes until `doctor` passes
and the selected story has a clear verification command.
