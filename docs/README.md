# Documentation Map

This directory holds the Harness operating layer for Bra Auto Measure plus the
project-specific story packets, decisions, proof matrix, and product notes that
future agents should inherit.

## Main Files

- `HARNESS.md`: how humans and agents collaborate.
- `FEATURE_INTAKE.md`: how prompts become tiny, normal, or high-risk work.
- `ARCHITECTURE.md`: architecture discovery and boundary rules.
- `TEST_MATRIX.md`: legacy proof map; current proof status is queried with
  `scripts/bin/harness-cli query matrix`.
- `HARNESS_BACKLOG.md`: legacy improvement list; current improvement records
  are stored with `scripts/bin/harness-cli backlog`.
- `FRONTEND.md`: front-end background, fixed UI contracts, and the known
  UX-gap backlog.
- `GLOSSARY.md`: shared terms.
- `SYMPHONY_QUICKSTART.md`: beginner-facing instructions for running Harness
  stories through Symphony.
- `SYMPHONY_SCOPE.md`: detailed scope for the Harness-native agent workbench
  and orchestration layer.

## Folders

- `product/`: current product truth, empty until a spec is derived.
- `stories/`: feature packets and backlog.
- `decisions/`: durable decisions and tradeoffs.
- `demo/`: concrete walkthroughs that show how the harness transforms input
  into agent-ready work.
- `templates/`: reusable spec-intake, story, plan, decision, and validation
  formats.

## Current State

Bra Auto Measure is an implemented offline browser app. Harness is used here as
the agent-facing operating layer: classify work before edits, preserve the
16-POM/offline/determinism contracts, update stories and decisions when behavior
changes, and prove changes with the suites in `TESTING.md`.

The local Rust Harness CLI binary is currently absent in this checkout. Until it
is restored, use `docs/TEST_MATRIX.md` as the checked-in proof fallback and
record missing durable rows as harness friction.
