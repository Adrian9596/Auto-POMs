# US-026 Direct Construction Evidence and Anchor-Only Overlay

## Status

implemented

## Lane

normal

## Product Contract

Do not claim lace or back hook-and-eye from generic detail, and do not draw
ratio-seeded POM endpoints as detected measurement lines.

## Relevant Product Docs

- `test/TEST.md`
- `docs/GLOSSARY.md`
- `docs/decisions/0031-direct-construction-evidence-anchor-overlay.md`

## Acceptance Criteria

- Generic front detail without distributed lace-pattern evidence returns Lace
  `not detected`.
- Back rails/repeats without a regular three-to-six-row sequence return Back
  H&E `not detected` and cannot select that construction class.
- A paired center-back closure panel without visible rows returns a capped Back
  H&E `candidate` percentage for TD review, without automatic class selection.
- Three regular back H&E rows still select the class and preserve the POM 12 =
  3.00-inch reference.
- Construction chips show evidence states and a visible detector-support
  percentage, with an explicit warning that the percentage is not accuracy.
- The sketch canvas renders labelled A/B anchor hypotheses with no connecting
  POM lines.
- The audit receipt identifies pixel distance as being between hypotheses.
- Offline deterministic and real-browser checks pass.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | False-positive regressions and direct row/pattern gates. |
| Integration | Anchor hypotheses remain available to measurement evidence without inferred line rendering. |
| E2E | Real offline page shows state chips and anchor-only overlay across bundled sketches. |
| Platform | No remote resource dependency. |

## Evidence

- `npm run construction-measurement-test` passes 39/39 checks, including the
  53%-generic-detail and zero-row false-positive regressions.
- `npm run construction-measurement-browser-test` passes on the real offline
  page: construction chips contain visible detector-support percentages, the legend says
  `Anchor hypotheses · no inferred lines`, and all 16 rows render.
- After OpenCV initializes on `demo3.jpg`, three regular back closure rows
  produce Back H&E `detected` and POM 12 = 3.00 inches.
- All three bundled sketches complete the browser audit with numeric review
  proposals where library evidence is available.
- `npm run check` passes.
