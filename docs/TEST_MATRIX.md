# Test Matrix

Maps product behavior to proof. Rows below are the **pre-harness baseline** —
shipped behaviors that already have a test suite. New work should get a story id
and be tracked with `scripts/bin/harness-cli story add|update`; the live proof
panel is `scripts/bin/harness-cli query matrix` when the CLI binary is present.
If `scripts/bin/harness-cli` is absent in a checkout, this file is the checked-in
fallback matrix until the durable layer is restored. Suite details:
[`../TESTING.md`](../TESTING.md).

Do not mark a row `implemented` until its suite has actually been run and passes.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract (behavior) | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | Build & wiring: every `src/` part parses; `app.js` regenerates | yes | no | no | no | implemented | `npm run check` |
| — | End-to-end Auto Mode run completes on a demo sketch | no | no | yes | no | implemented | `npm run smoke` |
| — | Offline detection: bbox, symmetry axis, view classification | yes | no | yes | no | implemented | `npm run pipeline-tests`, `npm run invariants` |
| — | Junction / endpoint / corner detection on known topologies | yes | no | no | no | implemented | `npm run junction-tests` |
| — | Anchor seeding lands near TD ground truth (tight ≈0.02 / loose ≈0.04) | no | no | yes | no | planned | `npm run accuracy` (needs corpus, charter M3) |
| — | 16 POMs generated on correct views; structural invariants hold | no | no | yes | no | implemented | `npm run invariants` |
| — | Fragile front POMs 6/7/8/9/10/16 semantically correct | no | no | yes | no | implemented | `npm run contract`, `npm run pom6-limitations`, `npm run pom7-limitations` |
| — | POM 14 shoulder strap is a curved front cup/strap join → back strap end measurement, low confidence, always-verify; front-only sketches demote to `REVIEW_ONLY` | no | no | yes | no | implemented | `npm run contract`, `npm run pom14-limitations` |
| — | Determinism: same sketch → same lines (no drift vs baseline) | no | no | yes | no | implemented | `npm run golden` |
| — | Auto-first mode: fresh load boots Auto; Apply hands off to Manual; projects with applied lines reopen in Manual | no | no | yes | no | implemented | `npm run smoke`, `npm run meaning-tests` |
| — | Learning loop: bias activates, off-blocks, dup/large-residual reject, reset | no | no | yes | no | implemented | `npm run learning-tests` |
| — | Meaning-aware learning scoped per (style, POM); Manual handoff/unlock does not break meaning tools | no | no | yes | no | implemented | `npm run meaning-tests` |
| — | Style-evidence capture: add/list/forget, candidate commit, confirmed-absent | no | no | yes | no | implemented | `npm run evidence-tests` |
| — | Autosave / restore-on-reload recovers work | no | no | yes | no | implemented | `npm run autosave-check` |
| — | Export Excel writes the measurement spec workbook with deterministic OOXML, graded sizes, held POMs, suggestions/TD values, and embedded PNG | no | no | yes | no | implemented | `npm run export-xlsx` |
| — | Hidden POMs are excluded from exported workbook rows and shared export image surfaces (PDF / Copy Image / Excel embedded PNG) | yes | no | no | no | implemented | `npm run export-hidden` |
| — | Tier-0 library-value suggestions load, regenerate, badge, skip no-data POMs, and allow TD override/revert | yes | no | yes | no | implemented | `npm run suggestions-tests` |
| — | Detection limitation matrices guard POM 6, POM 7, POM 14, and view-role hard cases while reporting known weak spots as non-fatal limitations | yes | no | no | no | implemented | `npm run detection-limitations` |

## Evidence Rules

- **Unit** proof covers pure pipeline/domain logic runnable without a browser
  (`pipeline-tests`, `junction-tests`, `check`).
- **E2E** proof covers headless-Chrome flows over the real app (`smoke`,
  `golden`, `accuracy`, `invariants`, `contract`, `learning-tests`,
  `meaning-tests`, `evidence-tests`, `autosave-check`, `export-xlsx`,
  `suggestions-tests`).
- **Synthetic** proof covers detector hard cases in Node (`detection-limitations`
  and its component suites).
- **Integration** and **Platform** are `no` across the board: the tool is a
  single offline page with no backend, provider, or deployment surface.
- A story may be `implemented` without every proof column if its packet says why.
- `accuracy` is the only suite that proves **correctness** (vs human ground
  truth); `golden` only proves **stability** (no drift). Never re-baseline
  `golden` to hide a regression you haven't checked with `accuracy`.
