# US-022 Evidence-First Size L Workbench

## Status

implemented

## Lane

normal

## Product Contract

Reshape the isolated offline lab into a three-part workbench that keeps
construction evidence, the analyzed sketch, and all 16 Size L decisions visible
together while preserving the project's POM contract and audit evidence.

## Relevant Product Docs

- `POMS_CONTRACT.md`
- `test/TEST.md`
- `docs/decisions/0026-auditable-view-local-measurement-evidence.md`
- `docs/decisions/0027-td-owned-size-l-finalization.md`
- `docs/decisions/0028-evidence-gated-size-l-workbench.md`

## Acceptance Criteria

- The UI follows the supplied three-panel visual hierarchy without replacing
  POM 1–16 names or numbering.
- Construction chips expose Detected, Uncertain, and Not detected states.
- Evidence Health and front/back Scale Hypothesis values are derived from the
  active analysis.
- Each Size L row shows value, numeric confidence, and Auto, Review,
  Insufficient, or TD Confirmed status.
- Auto requires score >=85 plus all mandatory evidence gates and is accepted
  provisionally without another click.
- Review requires TD acceptance or override; Insufficient has no generated
  value and requires a TD value or No Data.
- Editing a value keeps the original suggestion in the locked audit payload.
- The workbench remains fully offline and deterministic engine tests cover the
  new status gates.

## Design Notes

- Scope is limited to `test/`; production generated `app.js` is untouched.
- Existing evidence traces remain inspectable from the compact Size L rows.
- Synthetic cohort data remains visibly labelled as test-only.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Confidence score and Auto/Review/Insufficient gates. |
| Integration | Analysis produces workbench rows and editable TD decisions. |
| E2E | Static DOM contract only in this environment. |
| Platform | Offline/no-network resource audit. |

## Evidence

- `npm run construction-measurement-test` passes 27/27 deterministic checks,
  including back hook-and-eye classification, POM 11 back-view placement,
  numeric workbench gates, Evidence Health, view-local scales, and locked audit
  payload behavior.
- `npm run check` passes.
- `node --check test/app.js` and `node --check test/engine.js` pass.
- Static resource audit confirms the lab has no HTTP(S) runtime dependency.
- Direct browser E2E remains unavailable for the current `file://` page in this
  environment; the story does not claim browser-interaction proof.
