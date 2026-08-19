# US-035 Unit hinting and validation in Size L / L2 / TOL fields

## Status

implemented

## Lane

normal

## Product Contract

1. **Unit hinting.** The Size L, Size L2, and TOL column headers show the
   board's active unit — "(in)" by default, "(cm)" after a cm Set Scale —
   and each numeric input's tooltip names its unit and role.
2. **Fraction entry.** TDs think in eighths: `parseSpecNumber` now accepts
   simple fraction forms — `1/2`, `12 1/2`, `12-1/2` — everywhere it is
   used (tolerance chip, on-canvas readout, arrow stepping, size-run
   dialog, Excel export's Size L2), so a typed fraction behaves exactly
   like its decimal. Plain decimals parse unchanged.
3. **Invalid values are visible.** A non-blank value that doesn't parse
   marks the input (red border + explanatory tooltip) instead of being
   silently ignored; the mark updates live while typing and clears when
   the value parses.

## Relevant Product Docs

- `docs/FRONTEND.md` (improvement backlog item 6 remainder)
- `docs/stories/epics/E01-manual-mode/US-031-spec-field-arrow-stepping.md`

## Acceptance Criteria

- Headers show the active unit and switch after a cm scale is set.
- Typing `9 1/2` as Size L produces the same tolerance verdict as `9.5`;
  arrow stepping from a fraction-typed value works.
- Typing junk (`abc`) turns the field red with a tooltip; clearing or
  fixing it removes the mark. The value is ignored as before (no behaviour
  change — it's now just visible).
- `npm run check`, `npm run smoke`, and `npm run export-xlsx` stay green
  (the parser feeds the export's L2 derivation).

## Design Notes

- `parseSpecNumber` (`src/ui/spec-panel.js`) gains a fraction branch ahead
  of the existing tolerant `parseFloat` fallback — "leading number wins"
  behaviour for strings like `14 in` is preserved.
- `buildSpecInputCell` numeric fields get a live validity refresher
  (`spec-invalid` class + tooltip); `index.html` gets `.th-unit` spans in
  the three headers, the `.spec-invalid` CSS, and spec-panel updates the
  spans on every `renderSpecPanel` call (before the US-033 fingerprint
  skip — calibration is already fingerprinted, so full rebuilds also stay
  correct).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | `npm run check`, `npm run export-xlsx` |
| E2E | `npm run smoke`; browser pass: header hint, fraction ≡ decimal verdict, stepping from fraction, live invalid marking |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None.

## Evidence

- `npm run build` (57 parts), `npm run check`, `npm run smoke`
  (failures: []), `npm run export-xlsx` PASS — 2026-07-15.
- Browser pass on demo1 (scale = 10 in, then re-scaled 25 cm):
  - Headers show "(in)" ×3, and flip to "(cm)" after a cm Set Scale.
  - Size L `9 1/2` produced a tolerance chip identical to `9.5`
    ("10 in +0.5 ✗"); ArrowUp from the fraction stepped to 9.625.
  - Typing `abc` marked the field (`spec-invalid` + "Not a number…"
    tooltip); typing `12 1/2` cleared it and restored the unit tooltip.
