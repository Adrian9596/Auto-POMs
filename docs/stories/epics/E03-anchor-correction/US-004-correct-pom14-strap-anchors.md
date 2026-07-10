# US-004 Correct POM 14 Strap Anchors

## Status

implemented

## Lane

normal

_Intake (2026-07-10): change request correcting an accepted POM measurement
contract after TD image review. The Harness CLI is absent, so this file records
the intake and story evidence._

## Product Contract

POM 14 measures the curved shoulder-strap path from the front strap's upper
joining seam to the back strap/panel join. It does not start at the cup apex.

## Relevant Product Docs

- `POMS_CONTRACT.md`
- `auto_mode_rules/pom-template.json`
- `auto_mode_rules/anchor-schema.json`
- `docs/decisions/0015-pom14-front-strap-upper-join.md`

## Acceptance Criteria

- POM 14 requires `strap-top` and `strap-bottom`.
- `strap-top` belongs to `front_outer`; `strap-bottom` belongs to `back`.
- The front endpoint prefers real horizontal seam ink and remains low
  confidence/review-required.
- A front-only sketch remains `REVIEW_ONLY` because the back endpoint is absent.
- POM 16 continues to use `apex-left` and `apex-right` unchanged.

## Design Notes

- `src/auto-detection.js` detects the highest supported horizontal seam above
  the left cup/strap join.
- `src/auto/anchors/seed-anchors.js` maps that seam to `strap-top` and provides
  a low-confidence geometric fallback above the apex.
- `src/auto/drafts/generate-pom-fixture.js` generates POM 14 from the two strap
  anchors.

## Validation

| Layer | Expected proof |
| --- | --- |
| Contract | `npm run contract`, `npm run pom14-limitations` |
| Integration | `npm run build`, `npm run check`, `npm run invariants` |
| Determinism | `npm run golden` |
| E2E | `npm run smoke` |

## Harness Delta

- `scripts/bin/harness-cli` is absent; durable intake and trace rows could not
  be recorded through the CLI.

## Evidence

- `npm run build` / `npm run check`: pass.
- `npm run contract`: 782/782 assertions pass.
- `npm run pom14-limitations`: both front+back and front-only guards pass.
- `npm run smoke`: pass; POM 14 generated and applied on `demo1.jpg`.
- `npm run demo`: 18/18 images captured; POM 14 drawable on 16 and
  `REVIEW_ONLY` on the two sketches without a back endpoint.
- `npm run golden`: pass after intentional `strap-top` baseline refresh.
- `npm run library-l0-tests`: pass after contract version/fingerprint sync.
- `npm run accuracy`: detector plumbing passes; no TD-labeled fixtures exist.
- `npm run invariants`: 197/198; one unrelated existing POM 10 side-seam
  clearance assertion fails on `demo/Correct output 3.png`.
