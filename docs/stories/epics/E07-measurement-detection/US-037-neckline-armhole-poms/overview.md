# Overview

## Current Behavior

The tool auto-drafts exactly **16** POMs. The count is a hard invariant:
`scripts/check.mjs` and `src/auto/rules/load-rules.js` both reject a
`pom-template.json` that is not exactly 16 rows with ids `1..16`, and
`library/pom-definitions/contract-reference.json` declares the numbering
policy `immutable: true`, `core_range 1–16`, `next_assignable_number: 18`.
Neckline and armhole are **not measured** — they exist only as incidental
edges in detection comments. A TD who wants them today can add them as
custom POMs (17+), but custom POMs are name-only: no anchors, no
auto-drafting, no library suggestion.

## Target Behavior

The tool auto-drafts **18** POMs. Neckline (POM 17) and armhole (POM 18)
are first-class:

- Seeded from detected anchors, drafted onto the sketch on their view,
  review-flagged when evidence is weak (same QA path as the 16).
- Editable in Manual Mode (drag, arrow-nudge, on-canvas readout — the
  US-027–US-036 surface) like any other line.
- Graded (flat until the TD grades them) and included in the Excel export.
- Numbered 17/18 permanently; custom POMs now start at 19.

The 16 existing POMs are byte-for-byte unchanged.

## Affected Users

- **Technical designer (TD)** — gains two more auto-measured POMs to verify
  instead of hand-drawing.
- **Downstream spec consumers** — the Excel export gains two rows.

## Affected Product Docs

- `POMS_CONTRACT.md` (the 16 → 18 POM list)
- `library/pom-definitions/contract-reference.json` (numbering policy)
- `auto_mode_rules/version.json` (contract version)
- `docs/decisions/0032-extend-pom-core-range-to-18.md` (this change)

## Status

Implemented 2026-07-18 (see `validation.md` Acceptance Evidence and
ADR 0032). Anchor kinds: `171`/`172` (POM 17), `181`/`182` (POM 18).

## Non-Goals

- Re-numbering or altering POMs 1–16.
- Back-view neckline/armhole.
- A library corpus Size-L value for 17/18 in this story (graceful
  "no library value" is acceptable; corpus regen is a follow-up).
