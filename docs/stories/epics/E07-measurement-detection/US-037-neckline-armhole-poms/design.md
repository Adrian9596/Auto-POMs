# Design

## Domain Model

Two new POMs, each a two-endpoint measure on the front-outer view — the
same shape as the existing 14 straight POMs, so they slot into every
generic path without special-casing.

Confirmed geometry (2026-07-18, TD-corrected): **neckline = LENGTH** (curve,
center front → strap — matches the library's original "Neckline length"
reservation; a brief "width" detour was corrected back),
**armhole = curve length** (traced arc).

Anchor kinds use a **POM-indexed numeric scheme** (TD request 2026-07-18,
"cho dễ xác định"): `17` → `171`/`172`, `18` → `181`/`182`. The kind digits
name the POM, so a TD can tell at a glance which POM a pin belongs to. The
schema `hint` still carries the semantic description.

| POM | Name | View | Line type | Anchors | Measures |
| --- | --- | --- | --- | --- | --- |
| 17 | Neckline length | `front_outer` | **curved** | `171` (center front = cf-top), `172` (right strap junction = apex-right-inner) | arc length of the neckline edge from center front up to the strap on one side |
| 18 | Armhole curve length | `front_outer` | **curved** | `181` (underarm, bottom of arm opening), `182` (strap junction, top of arm opening) | arc length of the armhole opening, underarm → strap junction; TRACES the arm-opening edge when a clean contour exists, else bows outward toward the arm edge (TD 2026-07-18: the two anchors span the opening — an earlier build clustered both at the strap) |

The armhole is a curved annotation (`type:'curved'` + two control points),
following the POM 9/10 pattern. `lineLength` already returns the sampled
**arc length** for curved annotations, so the Value cell / tolerance chip /
on-canvas readout measure the true curve length with no new code.

New anchor kinds (added to `anchor-schema.json`, group names new):

| kind | name | group | hint |
| --- | --- | --- | --- |
| `171` | 171 | `neckline` | Left upper neckline corner, where the cup/gore top edge meets the strap base. |
| `172` | 172 | `neckline` | Right upper neckline corner (mirror of 171). |
| `181` | 181 | `armhole` | Underarm side point at the bottom of the arm opening. |
| `182` | 182 | `armhole` | Strap/shoulder junction at the top of the arm opening. |

All four are **primary** (no `derivation`), normalized `[0,1]` in
source-image pixel space, `placementViewRole: front_outer`.

**Geometry — RESOLVED 2026-07-18 (TD-corrected to LENGTH):** neckline =
length (curve, `171` center-front → `172` strap),
armhole = curve length (curved, `181`/`182`). Both `front_outer`.

## Application Flow

No new commands. The new POMs ride the existing pipeline:

1. **Detect → seed** (`runOfflineDetection` → `seedAnchorsFromDetection`):
   add `useNeckL/useNeckR/useArmT/useArmB` alongside the existing
   `useBandL`-style seeds in `src/auto/anchors/seed-anchors.js`, each
   preferring a detected coordinate and falling back to an `inView(...)`
   silhouette guess.
2. **Draft** (`generatePOMDraftsFromAnchors` →
   `buildPOMFixtureFromAnchors`): generic — once rows 17/18 declare their
   `requiredAnchors`, the fixture builder emits their lines with no code
   change. REVIEW_ONLY when `landmark-qa` flags the anchors low-confidence.
3. **Review / apply / Manual edit**: generic — spec rows, selection,
   nudge, readout all key off the template + annotations.
4. **Grade + export**: generic — `export-xlsx` already iterates
   `Object.keys(POM_TEMPLATE).concat(customPoms)`; 17/18 appear once they
   are in `POM_TEMPLATE`. Grading treats them flat until the TD grades.

## Interface Contract — file-by-file ripple

**Contract JSON (the versioned surface):**

- `auto_mode_rules/pom-template.json` — add rows `17`, `18`
  (`id`, `name`, `zh`, `view`, `refL:null`, `requiredAnchors`,
  `derivation:null`, `pairing:null`, `expected_confidence_tier`).
- `auto_mode_rules/anchor-schema.json` — add the 4 anchor kinds above.
- `auto_mode_rules/version.json` — bump the contract version.
- `library/pom-definitions/contract-reference.json` — `core_range.last`
  16 → 18, `next_assignable_number` 18 → 19; keep
  `never_reuse_retired_numbers: true` (see ADR 0032 for the `immutable`
  flip).

**Hard gates to loosen (16 → 18, ids `1..18`):**

- `scripts/check.mjs` (`rows.length !== 16`; id regex `^(?:[1-9]|1[0-6])$`).
- `src/auto/rules/load-rules.js` (same two checks).

**Detection & QA:**

- `src/auto-detection.js` / `src/auto/detect/*` — locate the neckline
  corners and armhole endpoints from the silhouette/ink (reuse the existing
  neckline-gap and armhole-edge helpers already present in comments around
  `auto-detection.js:4102`/`4333`).
- `src/auto/anchors/seed-anchors.js` — seeds + `inView` fallbacks.
- `src/auto/detect/landmark-qa.js` — add the 4 kinds to the tier map
  (`bottomBand`-style grouping), provenance (`ink` vs `silhouette`), and
  view-role map so REVIEW_ONLY demotion works.

**Runtime numbering (avoid collision with the new core rows):**

- `src/state.js` `nextCustomPomNumber()` — floor `max = 16` → `max = 18`
  so custom POMs start at 19, not 17.
- `src/render/export-xlsx.js` — comment "numbering starts at 17" → 19
  (behavior already correct via the template concat).

**Supporting data:**

- `auto_mode_rules/sizeL-suggestions.json` +
  `scripts/generate-sizeL-suggestions.mjs` — either add 17/18 (blank /
  "no library value") or confirm graceful absence; `suggestions-tests`
  asserts 16 today.
- `scripts/groundtruth/*.json` — optional GT for 17/18 on the demo set
  (accuracy only scores POMs that have GT, so absence ≠ failure), but
  `scripts/measurement-preparation-report.mjs` asserts exactly 16.

**Tests asserting "16" → "18":** `scripts/check.mjs`,
`src/auto/rules/load-rules.js`, `scripts/export-xlsx-tests.mjs:221`,
`scripts/export-hidden-tests.mjs:158`, `scripts/library-l0-tests.mjs:275`,
`scripts/measurement-preparation-report.mjs:99-100`,
`scripts/suggestions-tests.mjs`.

## Data Model

Anchors stay normalized `[0,1]` in source-image pixel space (invariant
preserved). No persistence migration: saved projects store drawn
annotations + `pomSpecs` keyed by label; older projects simply have no
17/18 lines and open unchanged. The numbering policy's
`never_reuse_retired_numbers` guarantees no historical spec-sheet meaning
shifts.

## UI / Platform Impact

Browser only. The spec panel already renders any template row; 17/18 appear
as two more rows. No toolbar, dialog, or layout change. The Generate button
copy "Generate 16 POM drafts" (`src/manual-tools.js:250`) → "18".

## Observability

Auto-mode telemetry already records per-anchor drag/nudge and draft
apply/discard events keyed by anchor kind; the 4 new kinds flow in
automatically. Learning buckets are keyed by `kind|view`, so
`171|front_outer` etc. get their own buckets with no schema
change (and are subject to the same pollution caveat noted in memory
`learning-pollution-from-synthetic-tests`).

## Alternatives Considered

1. **Custom POMs 17+ (Path C).** Zero contract change, but name-only: no
   anchors, no auto-draft, no QA. Rejected because the ask is explicitly
   auto-detected, first-class POMs.
2. **Renumber existing 11/12 (Path A).** Violates
   `never_reuse_retired_numbers` and silently corrupts saved spec sheets.
   Rejected.
3. **Curve-length geometry for both.** Higher-fidelity for sewn edges but a
   materially bigger detector lift (path tracing + control points) and
   breaks the uniform two-endpoint anchor model. Deferred to the geometry
   decision; default is the cheaper straight-measure model.
