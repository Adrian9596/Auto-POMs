# Overview — US-014 POM 7 arc tier

## Current Behavior (pre-story)

Sketches with no drawn POM 7 line and no flat cradle seam (curved underwire
styles demo5/demo7, seamless demo4, ring-strap demo1, plus 3597/amorafit)
demote POM 7 to hard REVIEW_ONLY, even though the detector already traces the
cup-bottom arc reliably (the cupModel trusts it for POM 9's bottom, and the
traced y matched the 2026-07-11 TD-draft ground truth within 0.002 on
demo5/demo7).

## Target Behavior

When no seam/guide tier commits, POM 7 drafts on the traced cup-bottom arc
(right cup preferred), from the arc's deepest column down to the band edge —
`confidence: low`, `source: seamArc`, `reviewRequired: true`, with a QA note.
POM 9/10 remain byte-identical (trusted-tier allowlist in the cupModel for
both the cup bottom and the side picker). The POM 6 CF projection never fires
from arc/guide seams.

## Product decision

Confirmed by the user on 2026-07-11 (AskUserQuestion): POM 7 may draft from
garment structure without a drawn measurement line, provided it is always
low-confidence and review-flagged. The synthetic matrix now asserts
drawability AND tier per case (`DRAWABLE@arc` etc.) — the anti-spoofing
intent of the old "must stay REVIEW_ONLY" guard survives as "must never be
accepted at a trusted tier".

## Affected Users

TD reviewing Auto Mode drafts: six more sketches present a reviewable POM 7
line (placed within tight tolerance of TD-draft GT on the labeled demos)
instead of a hard REVIEW_ONLY row.

## Affected Product Docs

- `POMS_CONTRACT.md` POM 7 (arc tier note).
- `docs/decisions/0022-pom7-arc-tier-structure-draft.md`.
- `scripts/pom7-limitations.mjs` (tier-suffixed assertions).
