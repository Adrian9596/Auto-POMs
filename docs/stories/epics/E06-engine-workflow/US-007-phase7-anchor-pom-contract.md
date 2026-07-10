# US-007 Engineering Workflow Phase 7 — Stabilize the anchor→POM contract

## Status

done (2026-07-10)

## Lane

normal

Intake: change request against the accepted `Engineering Workflow.md` plan
(Phase 7). Risk flags: existing behavior (1 flag → normal). Items 1–3 of the
phase are audits of already-enforced invariants (anchors normalized `[0,1]`,
rule JSON as source of truth, deliberate versioning); item 4 — better review
notes when a POM cannot be drawn — is the net-new behavior. Harness friction:
`scripts/bin/harness-cli` binary still absent; story file is the durable
record, `docs/TEST_MATRIX.md` is the fallback matrix.

## Product Contract

When a POM cannot be auto-drawn, the review row tells the TD exactly what is
missing and why, in TD language:

- A REVIEW_ONLY fixture row demoted by the missing-anchor guard carries
  `missingAnchors` (the exact anchor kinds that were not seeded).
- REVIEW_ONLY rows carry `reviewNotes`: the Phase 6 landmark QA notes for the
  anchors that are missing or flagged, e.g. "missing seam: bottom-cup cradle
  seam not found — POM 7 demotes to REVIEW_ONLY."
- The generic uncertainty line is kept (test compatibility) and extended with
  the specific missing anchor names.
- The spec panel shows the review notes on review-only rows.
- The validator audits the boundary: `missingAnchors` entries must be declared
  `requiredAnchors` of that POM in `auto_mode_rules/pom-template.json`.
- Anchors stay normalized `[0,1]`; fixture rows keep carrying
  `templateVersion` / `ruleVersion` matching `auto_mode_rules/version.json`.
- Additive only: drawability, confidence, geometry, and golden output are
  unchanged.

## Relevant Product Docs

- `Engineering Workflow.md` (Phase 7)
- `POMS_CONTRACT.md`
- `auto_mode_rules/pom-template.json`, `auto_mode_rules/version.json`

## Acceptance Criteria

- Every REVIEW_ONLY draft has a non-empty `uncertainty`; guard-demoted rows
  list their `missingAnchors`, and each listed kind is (a) genuinely unseeded
  and (b) a declared required anchor of that POM.
- When the landmark QA layer has notes for a missing anchor, the row's
  `reviewNotes` is non-empty.
- Draft rows carry `templateVersion` / `ruleVersion` equal to
  `auto_mode_rules/version.json`.
- All captured anchors sit inside `[0,1]`.
- Golden zero-drift; contract / invariants / smoke green.

## Design Notes

- `src/auto/drafts/generate-pom-fixture.js` — missing-anchor guard records
  `missingAnchors` + `reviewNotes` (from `detection.landmarkQa`), final
  REVIEW_ONLY pass backfills notes for non-guard demotions (e.g. hidden-cup
  POM 9/10).
- `src/auto/drafts/build-draft-annotation.js` — pass the two fields through to
  drafts.
- `src/auto/drafts/validate-fixture.js` — coherence error when
  `missingAnchors` ⊄ template `requiredAnchors`.
- `src/ui/spec-panel.js` — show reviewNotes on review-only rows.
- New `P7.*` assertions in `scripts/pom-contract-tests.mjs`.
- No rule JSON change (versions untouched — item 3 satisfied by auditing, not
  editing).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | — |
| Integration | `npm run contract` (new P7.* assertions), `npm run invariants` |
| E2E | `npm run smoke`, `npm run golden` (no drift) |
| Platform | — |
| Release | `npm run check` |

## Harness Delta

- `scripts/bin/harness-cli` absent (friction recorded; fallback matrix used).

## Evidence

All run 2026-07-10 on this change:

- `npm run build` — 55 parts; `npm run check` — pass.
- `npm run contract` — PASS 1032/1032 (includes the five new `P7.*`
  assertions on all 12 fixtures: anchors-normalized, rule-versions-stamped,
  review-only-explains, missing-anchors-accurate, review-notes-from-qa).
  Non-vacuous: demo1 seeds 23/25 anchors, so the guard-demotion path with
  `missingAnchors` + `reviewNotes` was genuinely exercised.
- `npm run invariants` — PASS 209/209.
- `npm run smoke` — status pass.
- `npm run golden` — PASS, maxDrift 0.0000 on all 9 fixtures.
- `npm run pipeline-tests` — pass (POM 6/7 uncertainty-text consumers
  unaffected by the appended missing-anchor sentence).
