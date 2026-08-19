# 0032 Extend the POM core range from 16 to 18

Date: 2026-07-18

## Status

Accepted

## Context

The POM contract has been a fixed 16 since inception: `pom-template.json`
holds exactly 16 rows, `scripts/check.mjs` and
`src/auto/rules/load-rules.js` reject any other count, and
`library/pom-definitions/contract-reference.json` declares the numbering
policy `immutable: true` with `core_range 1–16` and
`next_assignable_number: 18`. US-037 needs **neckline** and **armhole** as
first-class, auto-detected POMs numbered **17** and **18** — which is
impossible without changing that "immutable" contract. Custom POMs (17+)
were considered and rejected: they are name-only (no anchors, no
auto-drafting), and they collide with the numbers 17/18.

## Decision

Extend the core POM range to **18**:

- `contract-reference.json`: `core_range.last` 16 → **18**,
  `next_assignable_number` 18 → **19**. `immutable: true` is changed to
  reflect that the core range is now 1–18; the *policy* (never reuse
  retired numbers, joins use `concept_id`) stays in force.
- Keep `never_reuse_retired_numbers: true` — no existing number's meaning
  changes; 17 and 18 were never assigned to a retired POM.
- Loosen the two hard gates to accept 18 rows / ids `1..18` (still
  rejecting 19+, duplicates, and non-contiguous ids).
- Custom POMs now start at **19** (`nextCustomPomNumber` floor 16 → 18).

This is a **widening**, not a mutation: POMs 1–16 keep their numbers,
anchors, geometry, views, and grading unchanged.

## Alternatives Considered

1. **Custom POMs 17+ (no contract change).** Name-only; no anchors, no
   auto-draft, no QA. Fails the "first-class, auto-detected" requirement.
2. **Renumber existing POM 11/12 to neckline/armhole.** Violates
   `never_reuse_retired_numbers` and silently reinterprets values in saved
   spec sheets. Rejected as data-corrupting.
3. **Keep 16 immutable forever; never add POMs.** Rejected — the tool must
   be able to grow its measurement set as the house standard evolves; the
   policy already anticipated growth via `next_assignable_number`.

## Consequences

Positive:

- The contract can grow deliberately; the mechanism (bump `core_range`,
  loosen gates, add rows + anchors) is now proven for any future POM.
- Neckline/armhole flow through the existing generic draft / spec / grade /
  export paths with no per-POM special-casing.

Tradeoffs:

- Every suite that asserted "exactly 16" must move to 18 in lockstep;
  a missed one is a build failure (acceptable — loud, not silent).
- The Excel export gains two rows — a client-visible change downstream
  consumers must expect (versioned via `version.json`).
- Ground truth for 17/18 does not exist yet, so the accuracy gate cannot
  score them until a corpus/GT pass follows.

## Amendments (2026-07-18, accepted with US-037 implementation)

- **Geometry confirmed:** POM 17 = neckline **width** (straight); POM 18 =
  armhole **curve length** (curved annotation, arc length measured).
- **Reserved concept promoted.** The library had reserved POM 17 as
  `neckline_length` ("Neckline length", `reserved_pending_definition`, no
  definition). It is promoted to an **active** concept — see the correction
  below for the final name. POM 18 is added as `armhole_curve_length`
  ("Armhole curve length" / 袖窿弧长). The library's "do not invent the
  neckline definition" guard was intentionally lifted: the TD has now
  defined it. `library-l0-tests`' reserved-slot assertions were updated to
  assert both are `active_contract`.
- **Name + geometry corrected (TD 2026-07-18).** POM 17 was briefly shipped
  as `neckline_width` ("Neckline width", a symmetric straight span). The TD
  corrected it back to the library's original reservation: **`neckline_length`
  / "Neckline length" / 领口长** — the length of the neckline edge from
  **center front (anchor `171` = cf-top)** to the **strap junction on one
  side (anchor `172` = apex-right-inner)**, drawn as a **curve** (arc length,
  like POM 18). The house library's original name was right all along; the
  "width" detour is the lesson (don't override a deliberate reservation
  without confirmation).
- **Anchor naming (TD request):** the four anchors use a POM-indexed numeric
  scheme instead of semantic names — POM 17 → `171`/`172`, POM 18 →
  `181`/`182` — so a TD reading the board can see which POM a pin serves.
- **Armhole anchors corrected (TD 2026-07-18).** The initial build clustered
  `181`/`182` up at the strap (the "bottom" anchor used the chest row for its
  y, so both landed near the strap junction). The TD supplied the correct
  positions: the two anchors must SPAN the arm opening — **`182` = TOP =
  strap/shoulder junction at the chest line** (`apexRightOuter` /
  `frontStrapStart`); **`181` = BOTTOM = underarm/side point**, well below the
  chest row on the outer side edge (detected `sideTopRightInk`, else a point on
  the right side column ~45 % of the way down toward `cradleY`). The two anchor
  hints in `anchor-schema.json` were swapped to match; `anchor_version` bumped
  to `anchors-2026-07-18-neckline-armhole-b` with the library fingerprints
  resynced. POM 18 now TRACES the arm-opening edge (like POM 17) when a clean
  contour exists, else bows outward toward the arm edge.
- **Armhole refined for molded cups (TD 2026-07-18, demo5).** On a molded
  princess-seam cup the armhole first landed near the gore because the detected
  side-seam column sits barely right of the axis. `181` now prefers
  `chest-right` (the outer-silhouette point at bust height, where the armhole
  meets the side) when it is more outer than the side column, so the anchor
  reaches the arm edge. POM 18's contour trace gained a control-sanity guard:
  a long armhole arc can make the cubic fit throw a control far outside [0,1]
  which, once clamped, wiggles; the guard rejects such traces and falls back to
  the outward bow. The guard is scoped to POM 18 — POM 17's short, TD-confirmed
  neckline arc keeps the unguarded trace.

## Follow-Up

- Add corpus Size-L suggestions and ground truth for 17/18 (separate
  story) so the library layer and accuracy gate score them (currently
  emitted as "no data", drafted review-flagged).
- Improve armhole detection: it currently seeds from the strap join +
  underarm and bows the curve by a fixed factor (review-flagged). A traced
  arm-edge would raise it above the 'low' tier.
- Update `POMS_CONTRACT.md` with the two new rows.
