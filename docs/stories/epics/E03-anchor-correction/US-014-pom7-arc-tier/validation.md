# Validation — US-014 POM 7 arc tier

## Proof Strategy

1. **Isolation** (inherited from US-013): arc commits must leave POM 9/10
   byte-identical — invariants B3 + zero drift on all pre-existing golden
   anchor values.
2. **Correctness**: arc-tier placements scored against the 2026-07-11 GT
   corpus must land within tight tolerance on the labeled cradle-weak demos.
3. **Contract**: every synthetic POM 7 case asserts drawability AND tier
   (`DRAWABLE@strong|guide|arc`), so weak evidence promoted to a trusted
   tier fails hard.

## Results (2026-07-11)

- `npm run build` + `npm run check` — passed.
- `npm run pom7-limitations` — 6/6 with tier assertions:
  solid `@strong`, absent-cup-outline `@arc`, decorative-short `@arc`,
  moderate-dashed `@strong`, sparse-dashed `@guide`, near-side `@strong`.
- `npm run detection-limitations` — 14 PASS cases across POM 6/7/14/viewrole.
- `npm run invariants` — 209/209, **B3 green** with arc tier live.
- `npm run contract` — 1064/1064 (30 MORE assertions than pre-arc: the C7
  rules now execute on the newly-seeded images and pass).
- `npm run golden` — arc tier fired on exactly 6 images (3597, amorafit,
  demo1, demo4, demo5, demo7); every diff was ONLY
  `anchors added: cradle-cup-bottom, cradle-cup-top` with maxDrift 0.0000 —
  nothing moved, nothing removed. Re-baselined 19/19 deliberately; PASS.
- `npm run accuracy` — cradle-cup-top mean 0.0078 / cradle-cup-bottom mean
  0.0103 (n=3: demo3 strong-seam + demo5/demo7 arc) — within tight (0.02).
  demo5 MISSING 3→1, demo7 MISSING 2→0. The remaining demo4/demo5
  cradle-cf-top MISSING is the correctly-gated POM 6 follow-up.
- `npm run smoke`, `npm run meaning-tests` — 0 failures.

Status: implemented, human-approved product change, verified.

## 2026-08-19 contract sync

The executable contract had drifted: `pipeline-tests` Test 10 still asserted
the PRE-arc-tier stance ("cup outlines but no POM 7 line ⇒ REVIEW_ONLY, no
anchors") while `pom7-limitations` asserted `DRAWABLE@arc` — 8 failures, red
since ADR 0022 landed. Closed per
`docs/notes/CONTRACT_REPAIR_CHECKLIST_2026-08-19.md` (harness intake #27):

- **Test 10 rewritten** to the ADR 0022 contract: structure-only fixture ⇒
  `cradleCupTier === 'arc'`, anchors seeded `source: seamArc` / low /
  `reviewRequired` with the arc-tier QA note, POM 7 `DRAWABLE` vertical from
  the traced arc to the band. Test 9 (no cradle/arc at all ⇒ `REVIEW_ONLY`,
  null geometry) unchanged.
- **Isolation hard guards added** (trust allowlist): `cupModel.bottomFromSeam`
  stays false, `cradle-cf-top` never `seamProjected` from an arc commit,
  `seamArc` appears only on `cradle-cup-top/bottom`, and (follow-up G1) the
  **cup-side picker** must resolve via apex/default — a seam-driven
  `sideReason` fails even while `bottomFromSeam` stays false.
- **Wording fixes**: `pom7-limitations` header + `TESTING.md` now state that
  only `strong`/`seam` are trusted tiers; `guide` (ADR 0021) and `arc`
  (ADR 0022) are review-grade and feed neither the cupModel nor the POM 6 CF
  projection.
- **Docs sync**: active docs now say 18 POMs (ADR 0032); no runtime, rule
  JSON, or version change (`core18-2026-07-18b` untouched).

Independent validation run (2026-08-19, reviewer Codex): `check` PASS;
`pipeline-tests` PASS (Test 10 `DRAWABLE@arc` + isolation); `pom7-limitations`
6/6; `detection-limitations` PASS; `contract` 883/883 (66 skipped);
`invariants` 187/187 (34 skipped); `golden` 13 fixtures maxDrift 0.0000 (no
re-baseline); `accuracy` gate PASS mean 0.0190, tight 81% / loose 88% (no
re-baseline); `smoke` 18 drafts + Manual reopen; `library-l0-tests` PASS
(1–18 active registry); `git diff --check` PASS.

Final Harness verification (2026-08-19 07:19:12 UTC):
`scripts/bin/harness-cli story verify US-014` PASS. Its full verify command
re-ran `pipeline-tests`, `pom7-limitations`, `detection-limitations`,
`contract`, `invariants`, `golden`, `accuracy`, and `smoke`. The G1
cup-side-picker isolation assertions passed; no baseline was updated.
Harness trace `#12` records the closure and links it to `US-014`.

The pipeline-tests ↔ pom7-limitations mismatch documented in
`pipeline-tests-test10-red-since-adr0022` is CLOSED.
