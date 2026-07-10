# US-004 Refresh Repository Harness Integration

## Status

in_progress

## Lane

normal

## Product Contract

Bra Auto Measure should have a coherent, project-specific Harness layer that
matches the current upstream repository-harness model without overwriting local
product instructions or importing upstream internal backlog.

## Relevant Product Docs

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/README.md`
- `docs/HARNESS.md`
- `docs/TEST_MATRIX.md`
- `docs/SYMPHONY_QUICKSTART.md`
- `docs/SYMPHONY_SCOPE.md`

## Acceptance Criteria

- Entrypoint docs tell agents what to do when `scripts/bin/harness-cli` is
  absent.
- The docs map no longer points at missing Symphony/demo files.
- Symphony is documented as not active until its binaries and repository
  readiness gates exist.
- No Bra Auto Measure runtime behavior changes.

## Design Notes

- Commands: upstream `curl | bash` installer was not executed in this sandbox;
  the environment rejected remote script execution.
- Queries: `scripts/bin/harness-cli query matrix` could not run because the
  binary is absent.
- Domain rules: preserve offline runtime, fixed 16-POM contract, and generated
  `app.js` workflow.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id <id> --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run check` if product source is touched; not required for docs-only Harness edits. |
| Integration | Not applicable; this is an offline single-page repo with no integration surface. |
| E2E | Not applicable unless product UI behavior changes. |
| Platform | Not applicable. |
| Release | Manual doc review plus fallback matrix check while CLI is absent. |

## Harness Delta

- Added local Symphony quick-start and scope pages.
- Added local demo notes for applying Harness to Bra Auto Measure work.
- Updated agent entrypoints to use `docs/TEST_MATRIX.md` when the CLI is
  absent.
- Documented that the project `grill-with-docs` workflow is adapted from Matt
  Pocock's upstream skill while keeping this repo's Harness doc paths and
  generated-`app.js` rule.
- Left CLI installation as blocked by sandbox safety unless the user explicitly
  approves running the upstream installer outside the restricted environment.

## Evidence

- 2026-07-09: New doc targets exist:
  `docs/SYMPHONY_QUICKSTART.md`, `docs/SYMPHONY_SCOPE.md`,
  `docs/demo/README.md`.
- 2026-07-09: Reference scan passed for `SYMPHONY_QUICKSTART`,
  `SYMPHONY_SCOPE`, `docs/TEST_MATRIX.md`, and `US-004` links in the touched
  docs.
- 2026-07-09: `scripts/bin/harness-cli query matrix`: blocked, binary absent.
- 2026-07-09: `git status --short`: blocked, this folder is not recognized as
  a Git worktree.
- Upstream repository-harness was inspected via GitHub README and file manifest.
- Upstream Matt Pocock `grill-with-docs` was inspected via GitHub raw
  `SKILL.md`; its core contract is already present in the local hidden skill
  copies, and the upstream base is now recorded in `AGENTS.md`.
- 2026-07-09: `.codex/skills/grill-with-docs/SKILL.md` and
  `.agents/skills/grill-with-docs/SKILL.md` match each other. Direct edits to
  those hidden skill folders were not permitted in this session.
