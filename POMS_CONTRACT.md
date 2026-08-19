# POMs Contract

The tool measures **18 Points of Measure (POMs)** on a bra sketch. This is
the human-readable contract describing what each POM represents, which
sketch view it lives on, and which anchor pair drives the measurement.

The machine-readable source of truth is
[`auto_mode_rules/pom-template.json`](auto_mode_rules/pom-template.json).
If the two ever disagree, the JSON wins — this file is documentation.

---

## Views

Every POM has exactly one row placement view for review/apply behavior:

- **front outer** — the outside of the front, cups closed
- **front inner** — the inside of the front, cup interior visible
- **back** — the back panel and back straps

POM 14 is the one measurement-path exception: its rule JSON uses
`view: "front_to_back"` because the strap length starts on the front
cup/strap join and ends at the back strap end. Its `placementViewRole` remains
`back` so review filters and row validation still have one concrete bucket.

## Confidence tiers

Each POM has an expected auto-detection confidence tier. Use it as the
review priority signal when clicking through POMs one at a time:

- **high** — anchors are large, high-contrast, and stable. Detection
  usually gets these right on the first pass.
- **medium** — anchors depend on softer edges (cradle, cup lines, back
  panel). Worth eyeballing.
- **low** — POM 14 (shoulder strap) and POM 18 (armhole curve). Straps and
  the armhole arc are the hardest to detect and should always be verified
  by hand.

## Paired POMs

**POMs 1 + 2** and **3 + 4** share one anchor pair but capture two states
of the same measurement (relax vs extend / measure-straight vs extend).
The Measurements panel renders each pair as one row with two value inputs.

---

## The 18 POMs

### POM 1 — 1/2 Bottom Band, Relax
- **View:** front outer
- **Anchors:** `band-left` ↔ `band-right`
- **Pair:** primary of pair with POM 2 (group "1/2 Bottom band")
- **Expected confidence:** high
- Half-perimeter of the bottom band at rest.

### POM 2 — 1/2 Bottom Band, Extend
- **View:** front outer
- **Anchors:** `band-left` ↔ `band-right`
- **Pair:** secondary; partner is POM 1
- **Expected confidence:** high
- Same band, measured with the band stretched to its extended state.

### POM 3 — 1/2 Chest, Measure Straight
- **View:** front outer
- **Anchors:** `chest-left` ↔ `chest-right`
- **Pair:** primary of pair with POM 4 (group "1/2 Chest")
- **Expected confidence:** high
- Half-perimeter of the chest line, straight across.

### POM 4 — 1/2 Chest, Extend
- **View:** front outer
- **Anchors:** `chest-left` ↔ `chest-right`
- **Pair:** secondary; partner is POM 3
- **Expected confidence:** high
- Same chest line, extended state.

### POM 5 — Center Front Height
- **View:** front outer
- **Anchors:** `cf-top` ↔ `cf-bottom`
- **Expected confidence:** medium
- Vertical drop between the top and bottom of the center-front seam.

### POM 6 — Cradle Height at Center Front
- **View:** front outer
- **Anchors:** `cradle-cf-top` ↔ `cf-bottom`
- **Expected confidence:** medium
- Cradle portion of the center-front, from the cradle top down to the
  band bottom.
- On styles with a raised center-front cradle edge, `cradle-cf-top` is the
  upper traced crest where that cup-bottom/cradle seam approaches the CF axis;
  a denser horizontal lace row below it is not the landmark.
- **Junction tier (`seamJunction`, ADR 0023):** on front-closure styles the
  cradle/band seam is interrupted at the CF by the placket. A row-agnostic
  scan finds the row where long seam runs approach the axis from both sides
  across an EMPTY, centered CF gap bounded by vertical closure-edge ink, and
  seeds `cradle-cf-top` at the axis on that row — low confidence,
  `reviewRequired`.
- **Crest tier (`seamCrest`, ADR 0023):** on plunge gores the boundary is the
  gore-top crest, not a seam row. The contour crest finder seeds the topmost
  symmetric crest BELOW cf-top — low confidence, `reviewRequired`. POM 8 can
  be a legitimately tiny span on these styles.
- **CF-seam fallback (`cradleCfFromCupSeam`):** when the direct CF-seam
  detector misses `cradle-cf-top` but the bottom-cup cradle seam
  (`cradleCupTop`, the POM 7 top) *was* detected, `cradle-cf-top` is seeded by
  projecting that seam onto the CF axis (`x = axis`, `y = cradleCupTop.y`). It
  is tagged `source: 'seamProjected'`, **low** confidence, `reviewRequired`,
  so the TD verifies an approximate starting line instead of getting a hard
  `REVIEW_ONLY`. When `cradleCupTop` is also absent, POM 6 still demotes to
  `REVIEW_ONLY`. This is a seed-layer geometry fallback only — no rule-JSON
  change. Contract `C6.seam-source` accepts `seamProjected` **only** when the
  anchor is flagged for review. Also rescues POM 8 (its end shares
  `cradle-cf-top`).

### POM 7 — Cradle Height at Bottom Cup
- **View:** front outer
- **Anchors:** `cradle-cup-top` ↔ `cradle-cup-bottom`
- **Expected confidence:** medium
- Cradle height measured at the base of the cup (not on the center-front
  seam).
- **Guide tier (ADR 0021):** a sparse dashed vertical guide (every segment
  inked but continuous ratio below the strong-guide floor) commits at
  `source: seamGuide` — low confidence, `reviewRequired`, considered only
  when both regular acceptance paths fail. Guide-tier seams are drawn for TD
  verification and are NEVER used for POM 9/10 cup geometry (`cupModel`).
  Contract `C7.seam-source` accepts `seamGuide` only when review-flagged.
- **Arc tier (ADR 0022):** when no seam and no guide commit, POM 7 drafts on
  the traced cup-bottom/underwire arc itself (right cup preferred, validated
  apex required) — `source: seamArc`, low confidence, `reviewRequired`.
  Like the guide tier it never feeds the `cupModel` (neither the cup bottom
  nor the side picker), and the POM 6 CF projection never fires from it.
  This is a deliberate product decision (2026-07-11): a review-flagged
  approximate line on structure-only sketches beats a hard REVIEW_ONLY row.

### POM 8 — Cup Height at Center Front
- **View:** front outer
- **Anchors:** `cf-top` ↔ `cradle-cf-top`
- **Expected confidence:** medium
- Cup-only portion of the center-front, top of cup down to the cradle
  top.

### POM 9 — Cup Height
- **View:** **front outer**
- **Anchors:** `inner-cup-top` ↔ `inner-cup-bottom`
- **Expected confidence:** medium
- Vertical height of the cup, read on the front (outer) view. No separate
  inner-cup cutaway view is required (ADR 0011). *(Anchor kinds keep their legacy
  `inner-cup-*` names.)*

### POM 10 — Cup Width
- **View:** **front outer**
- **Anchors:** `inner-cup-left` ↔ `inner-cup-right`
- **Expected confidence:** medium
- Width of the cup across its mid-section, read on the front (outer) view: from
  the **gore contact** (`inner-cup-left`) to the **wire / side-seam end**
  (`inner-cup-right`). Each endpoint sits at **its own height** — the gore contact
  is normally lower than the side-seam end — so the two do **not** share a row
  (ADR 0036, TD convention). The pair's mean height stays on the detected cup
  width row, and the slant is bounded (invariant A3). No separate inner-cup
  cutaway view is required (ADR 0011). *(Anchor kinds keep their legacy
  `inner-cup-*` names.)*

### POM 11 — Side Seam Length
- **View:** back
- **Anchors:** `side-top` ↔ `side-bottom`
- **Expected confidence:** medium
- Length of the side seam where the front meets the back panel.

### POM 12 — Back Center Length
- **View:** back
- **Anchors:** `back-top` ↔ `back-bottom`
- **Expected confidence:** medium
- Height of the back at the center-back line.

### POM 13 — Back Panel Height
- **View:** back
- **Anchors:** `back-top` ↔ `back-bottom` (optional: `back-panel-top`,
  `back-panel-bottom`)
- **Expected confidence:** medium
- Height of the back panel itself. Optional anchors let the user pin the
  panel edges when they don't align with the back-top / back-bottom.

### POM 14 — Shoulder Strap Length
- **View:** front outer → back (curved strap path; rule JSON
  `view: "front_to_back"`, `placementViewRole: "back"`)
- **Anchors:** `strap-top` ("Front strap join": the strap join of the right
  shoulder strap — the strap adjacent to the back view — on the front view;
  the top seam of the stitched strap section, or where a plain strap attaches
  to the cup/neckline, never the strap's top cut edge; ADRs 0016/0017) ↔
  `strap-bottom` ("Back strap join": shoulder strap/back-panel join)
- **Expected confidence:** **low**
- Length of the shoulder strap, measured as the curved path from the front
  strap join over the shoulder to the back strap end. The only POM with a
  low confidence tier — straps are the hardest to detect; always verify
  manually. A front-only sketch with no back strap end leaves POM 14 in
  REVIEW_ONLY.

### POM 15 — Back Strap Distances
- **View:** back
- **Anchors:** `back-strap-left` ↔ `back-strap-right`
- **Expected confidence:** medium
- Horizontal distance between the two back strap attachment points.

### POM 16 — Front Apex Distance
- **View:** front outer
- **Anchors:** `apex-left` ↔ `apex-right`
- **Expected confidence:** medium
- Horizontal distance between the two cup apexes on the front.

### POM 17 — Neckline Length
- **View:** front outer
- **Anchors:** `171` (center-front neckline point = cf-top) ↔ `172` (right
  cup↔strap junction); numeric anchor names encode the POM — 17→171/172
- **Expected confidence:** medium — curved line
- Length of the neckline edge from center front to the strap on one side,
  traced as a curve (arc length). (US-037 / ADR 0032; TD-corrected
  2026-07-18 from "width" to "length")

### POM 18 — Armhole Curve Length
- **View:** front outer
- **Anchors:** `181` ↔ `182` (strap junction ↔ underarm; 18→181/182)
- **Expected confidence:** low — curved line, always `reviewRequired`
- Arc length of the armhole opening, traced from the strap junction to the
  underarm and bowed outward toward the arm edge. Measured as the sampled
  bezier arc length, not a straight chord. (US-037 / ADR 0032)

---

## Review workflow

The panel's per-POM `×` toggle hides one line at a time so you can verify
the detection evidence for each measurement in isolation. Suggested order
for spot-checking:

1. **POM 14** first — it's the only low-confidence POM and crosses from the
   front strap join to the back strap end.
2. Any medium-confidence POM on the **back** view (POMs 11, 12, 13, 15) — those
   depend on view detection being correct in addition to anchor placement.
3. Paired POMs 1/2 and 3/4 — sanity-check that both halves land on the
   same anchor pair.
4. Remaining front-outer medium-confidence POMs (5, 6, 7, 8, 9, 10, 16).

Use **Show all POMs** in the panel header to reset visibility once
you're done isolating.

**Hidden POMs are excluded from the Excel export.** A line hidden with `×` is
omitted from the exported measurement spec entirely — its whole row, not just its
values — and paired POMs (1/2, 3/4) drop together because they share one line.
Visibility is session-only (it is not saved with the project), so **Show all
POMs** or reopening the project restores every row. Covered by
`npm run export-hidden`; see
[ADR 0010](docs/decisions/0010-hidden-poms-excluded-from-export.md).

## Custom POMs (19+) — extension, not mutation

The 18-POM set above is fixed and versioned. Styles that need MORE
measurements get **custom POMs** (US-011,
[ADR 0018](docs/decisions/0018-custom-poms-extend-contract.md)):

- Added from the spec panel (**+ Add POM**); numbering continues 19, 20, …
  per project (`nextCustomPomNumber` floors at 18 — ADR 0018 originally said
  17, renumbered when
  [ADR 0032](docs/decisions/0032-extend-pom-core-range-to-18.md) claimed 17 and
  18 for neckline and armhole). Names (EN / 中文) live in the project's
  `customPoms` registry, never in `auto_mode_rules/pom-template.json`.
- A custom POM is a **Manual-mode** measurement: the TD draws a line and
  labels it with the number. The auto pipeline still detects, seeds, and
  generates exactly POMs 1–18.
- Full parity everywhere else: spec-panel row (Value / Size L / L2 / TOL),
  Grading dialog (flat by default until the TD grades it), and the Excel
  export (same live-formula treatment, rows after POM 18).
- Styles that need FEWER measurements keep using the hidden-POM `×` toggle —
  hidden rows stay out of the export (ADR 0010); template rows are never
  deleted.
