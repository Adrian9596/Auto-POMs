# US-023 Five-Layer Fast Lane

## Status

implemented

## Lane

normal

## Product Contract

Make the isolated workbench prove each measurement through five automatic
layers while reducing TD work to quick confirmations and exception review.

## Relevant Product Docs

- `POMS_CONTRACT.md`
- `test/TEST.md`
- `docs/decisions/0026-auditable-view-local-measurement-evidence.md`
- `docs/decisions/0028-evidence-gated-size-l-workbench.md`
- `docs/decisions/0029-five-layer-fast-lane-proof.md`

## Acceptance Criteria

- Every POM exposes Visual, Landmarks, Scale, Library, and Decision proof.
- Missing numeric value renders measurement confidence as `—`.
- Synthetic peers never satisfy the Auto library gate.
- TD can confirm detected views and construction without opening advanced
  controls.
- TD can confirm 3-inch or 3.75-inch H&E height (POM 12 Back Center Length) as
  back-view calibration only.
- Quick confirmations reset on new sketch input.
- Pilot metrics expose analysis time, TD action count, overrides, review rows,
  and time to final lock.
- The lab remains offline and deterministic tests cover the new proof rules.

## Design Notes

- Scope remains isolated under `test/`; production generated `app.js` is not
  edited.
- The five layers are evidence gates, not separate UI stages.
- Existing detailed evidence payload remains available for audit.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Five-layer statuses, approved-peer Auto gate, confidence blanking. |
| Integration | Quick confirmation changes only intended evidence/view scale. |
| E2E | Static DOM contract in the current environment. |
| Platform | Offline/no-network resource audit. |

## Evidence

- `npm run construction-measurement-test` passes 32/32 deterministic checks.
- `npm run check` passes.
- Static DOM/resource checks cover the fast-lane controls, five-layer payload,
  confidence blanking, and offline boundary.
- Browser smoke was updated for the v4 payload but was not executed in this
  environment; live file/browser control remains outside this proof claim.
