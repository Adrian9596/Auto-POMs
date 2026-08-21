# 0053 Curved lines grow extra anchor points on demand

Date: 2026-08-20

## Status

Accepted — 2026-08-20.

## Context

A curved Board annotation is today exactly one cubic Bézier — `start`, `end`,
`control1`, `control2` — edited pen-tool style with two always-visible,
always-grabbable handles (`src/curves.js`, `hitTestSelectedHandles` in
`src/render/hit-testing.js`). That model replaced an earlier one (2026-07-18,
not itself recorded as a formal ADR) where a curve could carry a `midPoint`
plus two more handles on each side of it — up to seven handles on one line.
The TD asked for that removed outright: "rối tay cầm, khó bẻ" (handles too
crowded, hard to bend). `ensureCurveControls()` still collapses any legacy
midpoint curve down to the single cubic on load.

The two-handle model is not in question for **measurement** — the TD confirmed
it is adequate for drawing POM 14/17/18. The gap is a different use of the same
curved-line tool: illustrative / stitch-style curves (e.g. tracing a cup seam)
that need several different bends along their length, which one cubic Bézier
cannot represent (a single cubic has at most one directional inflection). The
constraint carried over from 2026-07-18 is that whatever is added here must not
reintroduce the handle-clutter problem that got the old model removed.

## Decision

**A curved annotation's two-handle cubic becomes the floor, not the ceiling.**
Any curved line may grow extra interior anchor points, each with its own pair
of handles — but only when the TD deliberately asks for one, never as a
structural default.

1. **Insertion is a dedicated, persistent mode ("Add point"), not a click
   overload.** It behaves like every other tool (`state.tool`), is visible only
   while a curved annotation is selected, and only ever inserts into that one
   selected curve.
2. **Toolbar space comes from consolidating, not from a 6th slot.**
   Straight / Curved / Eraser / Text collapse into one drop-down button reusing
   the existing `#stitchesBtn` / `#stitchesMenu` pattern (fixed-label trigger,
   active item marked inside the menu) — paying down the same toolbar-space
   constraint ADR 0052 already hit once, instead of re-discovering it.
3. **Insertion preserves the curve's shape exactly.** A click on the curve body
   inserts the new anchor at the nearest point *on* the curve (De Casteljau
   subdivision at that parameter), not at the raw click pixel — the curve does
   not jump at the moment of insertion; only a subsequent handle drag changes
   it.
4. **A new anchor's two handles default to mirrored (smooth); Alt+drag breaks
   the pairing for one drag only.** A plain drag of either handle keeps both
   collinear through the anchor, so the curve cannot kink there by accident.
   Holding Alt while dragging moves just the one handle. This is computed on
   every plain drag, not stored — an anchor "broken" by an Alt-drag re-smooths
   itself the next time either handle is dragged normally. No new persisted
   per-anchor field.
5. **No handle-visibility gating.** Every anchor's handles stay visible and
   grabbable at once when the curve is selected — the same "no crowding gate"
   stance the two-handle model already takes. What's different from the
   rejected 2026-07-18 model is that the anchors are opt-in: a curve with extra
   handles is one the TD explicitly asked to have them.
6. **Deleting an anchor is select-then-Delete, not a click gesture.**
   Double-click on a curve already opens its label/POM-number editor (the same
   gesture a note's editor uses); it cannot also mean "delete this point."
   Instead: selecting an interior anchor (so it becomes the active
   `state.selection.part`) and pressing Delete/Backspace removes just that
   anchor and rejoins its two neighbors. Delete with no interior anchor active
   still deletes the whole line, exactly as today.
7. **Deletion does not try to preserve shape.** Unlike insertion, merging two
   segments back into one has no exact solution. The rejoin simply keeps the
   two segments' existing outer handles as-is; the TD re-drags by hand if the
   result doesn't look right. Insertion is lossless, deletion is not — a real
   asymmetry, not an oversight.
8. **Applies uniformly, no POM-vs-decorative distinction.** The "Add point"
   control shows for any selected curved annotation, including an applied POM
   14/17/18 line. The TD can already hand-edit an applied POM curve's existing
   two handles without restriction in Manual Mode; gating extra anchors by
   POM-ness would add an asymmetry that protects nothing real.

## Alternatives Considered

1. **Bring back the fixed midpoint model (up to 7 always-on handles).**
   Rejected — it is exactly what the TD asked removed on 2026-07-18; the
   original complaint doesn't stop applying just because a new use case
   surfaced.
2. **Show only the active anchor's handles, hide the rest** (the
   Illustrator/Figma convention). Considered and set aside for now: the TD
   chose to keep the existing "no gate" stance since anchors are opt-in and
   expected to stay few (1-2 extra per curve). Flagged below as the fallback if
   clutter reappears in practice.
3. **Permanent corner/smooth state per anchor** (Illustrator's actual model).
   Rejected — it requires a persisted field and a conversion gesture for a
   distinction the TD didn't ask to survive across drags; Alt-as-momentary
   override gives the same escape hatch with no new state.
4. **Shape-preserving fit on delete.** Rejected — no exact solution exists, and
   the added fitting complexity doesn't remove the need to hand-adjust
   afterward anyway.
5. **Gate the feature to non-POM curves only.** Rejected — there is no
   technical protection to gain, since the TD can already reshape an applied
   POM curve's two handles by hand today.

## Consequences

Positive:

- The two-handle model the TD approved for POM measurement is untouched as the
  default and the floor — drawing or editing a plain curve does not change.
- `getCurveBeziers()`-based rendering, PDF export, stitch rendering, and length
  measurement (`lineLength` / `getAnnotationPolyline`) already iterate over
  however many segments a curve has — the data model extends into an existing
  seam instead of opening four new ones.
- Frees toolbar space without a 6th always-visible button, by reusing an
  already-proven drop-down pattern (`#stitchesBtn`) instead of inventing one.

Tradeoffs:

- `state.selection.part` grows a new category (an interior anchor id) that
  Delete must special-case. Every other reader of `part` — Tab-cycle nudge,
  arrow-key nudge, `drawSelectionHelpers`'s active-part highlight — needs to at
  least tolerate the new values even before it acts on them specially.
- Several files hardcode the fixed field set (`control1` / `control2` /
  `midPoint` / `midHandleIn` / `midHandleOut`) by name instead of looping over
  a generic point list: `annotation-clipboard.js` (copy/paste, reflect),
  `line-nudge.js` (Tab-cycle), `label-layout.js` (tangent at the curve's
  midpoint). These need to become loop-based over a general anchor list, not
  just extended additively.
- Legacy projects, and the still-present but always-null `midPoint` /
  `midHandleIn` / `midHandleOut` fields, need a clear migration story so a
  new `ensureCurveControls`-style normalization doesn't collide with the new
  anchor list.
- The insertion/deletion asymmetry (positive 3 above, negative here) needs to
  be visible to the TD in the moment, not just in this doc — deleting a point
  can visibly change the curve, adding one never does.

## Follow-Up

- If TDs commonly add more than 2-3 extra anchors per curve, revisit
  Alternative 2 (hide inactive handles) — the clutter math converges on the
  same handle count the 2026-07-18 model was rejected for.
- **Resolved 2026-08-21 (implementation, US-093).** Data model: `ann.points`
  is an array of `{point, handleIn, handleOut}`, empty by default (the
  2-handle case stays byte-identical). Migration: `ensureCurveControls`
  defaults a missing `points` to `[]` — purely additive, no destructive
  rewrite. Keyboard shortcut: none for v1 — the button is already
  selection-gated and free single letters are scarce; revisit only if TDs
  ask. Icon: a small bow with a filled dot mid-curve (distinct from the plain
  bow used for the Curved-line tool). The toolbar consolidation itself joined
  the newer `BOARD_TOOLBAR_MENUS` registry (`src/ui/board-toolbar.js`, from
  US-082) rather than the older bespoke `stitchesBtn` pattern this ADR
  originally cited as the model to copy — same TD-approved visual behavior
  (fixed-prefix trigger showing the current choice), built on the more
  current, less duplicative plumbing.
- **Found during implementation, not anticipated here:** consolidating the
  toolbar freed enough width that it retired a *different* story's test
  scenario — `board-interaction-check`'s "selecting a line reflows the
  toolbar" proof (from US-088 / ADR 0051) stopped triggering any reflow at
  1440px. See US-093's `overview.md` "Status" section and `TESTING.md` for
  the full account; the underlying board-holds-still invariant is still
  proven by a different, still-real scenario in the same suite.
- `docs/FEATURE_INTAKE.md` classification was run 2026-08-20: **high-risk**
  (data model + migration hard gate, existing behavior, multi-domain). Story:
  `docs/stories/epics/E01-manual-mode/US-093-curved-lines-grow-anchor-points/`.
- `project-load.js`'s reopen-mode predicate (also flagged in ADR 0052's
  Follow-Up for notes) is unaffected by this story — an interior anchor only
  ever exists on an already-curved, already-applied-or-drawn line.
- **Found and fixed 2026-08-21, via `/code-review` on this story's own
  diff.** The Consequences/Tradeoffs section above named the general risk
  ("several files hardcode the fixed field set... need to become loop-based")
  and listed three files that needed it — but missed two more that a
  multi-agent review caught independently, converging from five different
  angles: `moveAnnotation` (`src/manual/pointer-events.js`) and
  `scaleAnnotationAbout` (`src/manual/viewport.js`) both predate `ann.points`
  and walk the same hardcoded `['midPoint','midHandleIn','midHandleOut',
  'control1','control2']` field list, never touching an interior anchor.
  Live effect before the fix: dragging a curved line's body (or the photo it
  sits on) moved every fixed field but left an interior anchor frozen in
  place, tearing the curve; resizing a photo scaled the fixed fields but not
  the anchor, silently changing that POM's measured length — the exact class
  of bug ADR 0051/US-091 exists to prevent, reopened for any curve a TD had
  reshaped with this story's own new feature. Fixed by adding an `ann.points`
  loop to both functions; guarded by two new `board-interaction-check`
  assertions (4d/4e) with a passing negative control. None of the 24 suites
  already in this repo — including this story's own "94/94 green" claim in
  `validation.md` — exercised "move/resize a curve with an interior anchor,"
  so it shipped undetected through the original verification pass. Two
  related, lower-severity gaps the same review surfaced were fixed the same
  day: `specPanelFingerprint` (`src/ui/spec-panel.js`) now hashes
  `ann.points` alongside the existing fixed fields — verified live in-browser
  (not just by suite) that dragging an interior anchor's handle then hitting
  Undo previously left the Measurements panel showing the dragged length
  after the geometry had reverted, and now correctly shows the reverted
  length; a negative control (temporarily excluding `points` from the
  fingerprint again) reproduced the exact stale-value bug before the fix was
  restored. The learning-evidence normalizers (`normalizeLineForEvidence` in
  `style-evidence-capture.js` / `normalizeEvidenceLine` in
  `style-evidence-record.js`) now capture and round-trip `ann.points` the
  same way they already handle `control1`/`control2`/`midPoint` — verified
  live that a captured/committed evidence record for a curve with an
  interior anchor now carries a `points` array with normalized coordinates.
  This data is stored but not yet *consumed*: `style-evidence-reuse.js`'s
  `getConfirmedEvidenceMediansByPom` only ever reads `start`/`end` medians
  today — `control1`/`control2`/`midPoint` have always been
  captured-but-unused the same way, so `points` joining them is consistent
  with, not a regression of, that existing asymmetry. `learning-tests` and
  `evidence-tests` both still pass. **Lesson for any
  future annotation-field addition:** naming the *files* that hardcode a
  field list in an ADR is not the same as finding *all* of them — a
  multi-angle review of the actual diff and its live call sites found two
  the design discussion missed.
