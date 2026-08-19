# Exec Plan — US-037 Neckline & Armhole as POM 17 / 18

## Goal

Promote **neckline** and **armhole** from "not measured" to first-class,
auto-detected POMs numbered **17** and **18** — drafted from the sketch,
placed on their anchors, editable in Manual Mode, graded, and exported,
exactly like the current 16. This requires deliberately **extending the
versioned POM contract from 16 to 18 core POMs** (a hard gate), so it runs
in the high-risk lane.

## Scope

In scope:

- Extend the POM contract to 18 core rows (`pom-template.json`,
  `anchor-schema.json`, `version.json`, numbering policy).
- Loosen the two "exactly 16 / ids 1..16" hard gates to "1..18".
- Add anchor kinds for neckline & armhole and detect + seed them.
- Wire the two POMs through the existing generic paths (draft fixture,
  spec panel, grading, Excel export) and update every "16" assertion.
- Keep custom POMs working by moving their floor from 17 to 19.

Out of scope:

- Changing any of POMs 1–16 (numbers, anchors, geometry) — untouched.
- Back-view neckline/armhole variants (this story is front-view only).
- Library Size-L corpus values for the new POMs beyond graceful
  "no library value" (a corpus regen is a follow-up, not a blocker).
- Retiring or renumbering anything — `never_reuse_retired_numbers` holds.

## Risk Classification

Risk flags (from `docs/FEATURE_INTAKE.md`):

- **Public contracts** — the 16-POM template + anchor schema are the
  versioned client-visible contract; Excel export row set changes.
- **Existing behavior** — the "exactly 16" gates and every suite that
  asserts 16 are test-covered behavior being changed.
- **Data model** — anchor schema (the normalized `[0,1]` anchor kinds) and
  the immutable numbering policy.
- **Weak proof** — no ground truth exists yet for neckline/armhole.
- **Multi-domain** — rules JSON, detection, UI, export, grading, tests.

Hard gates tripped → **high-risk lane**:

- Public/versioned contract change (POM template + anchor schema + policy).
- Loosening a validation requirement (the 16-row gate).

## Work Phases

1. **Discovery — done.** Integration points enumerated (see `design.md`
   §Interface Contract). All are known files; no unknowns block the plan.
2. **Design decision — OPEN (see Stop Conditions).** Confirm the
   measurement geometry of each POM; that fixes the anchor set. Default in
   this packet: two-endpoint straight measures, `front_outer`.
3. **Decision record — ADR 0032** flips `numbering_policy.core_range.last`
   16 → 18 and `next_assignable_number` 18 → 19, keeping
   `never_reuse_retired_numbers`. Accept before code.
4. **Contract edit** — `pom-template.json` (+rows 17/18),
   `anchor-schema.json` (+anchor kinds), `version.json` bump, policy file,
   and loosen the two hard gates. Rebuild; `npm run check` + `contract`
   green with 18 rows.
5. **Detection** — seed the new anchors from real ink (`auto-detection.js`,
   `seed-anchors.js`), add `landmark-qa.js` tiers/provenance/view-role.
   Aim for real placement on the demo set; REVIEW_ONLY where evidence is
   thin (honest, not hidden).
6. **Wire-through & tests** — bump every "16" assertion to 18, confirm the
   generic draft/spec/grade/export paths pick up 17/18 with no structural
   change, move custom-POM floor to 19.
7. **Verification** — full suite (see `validation.md`), with `golden`
   staying deterministic and `smoke` showing 18 drafts.
8. **Harness update** — `POMS_CONTRACT.md`, `docs/product` POM list,
   `harness-cli story/decision`.

## Stop Conditions

Pause for human confirmation if:

- **Measurement geometry is unconfirmed (ACTIVE).** The default here is
  neckline = width between the two upper neckline corners
  (`neckline-left`/`neckline-right`), armhole = straight strap→underarm
  length (`armhole-top`/`armhole-bottom`), both `front_outer`. If either
  should instead be a *curve length* (traced arc, like POM 14) or a
  vertical *drop/depth*, the anchor set and detector in `design.md` change
  before implementation. **Confirm before Phase 4.**
- The numbering policy's `immutable: true` should not be flipped (kills
  the whole approach — fall back to custom POMs 17+).
- Detection cannot place an anchor better than a fixed silhouette guess on
  any demo (then that POM ships REVIEW_ONLY, documented, not forced).
- Any change to POMs 1–16 becomes necessary (it should not).
