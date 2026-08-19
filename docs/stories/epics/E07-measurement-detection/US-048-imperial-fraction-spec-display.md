# US-048 Show Size L / size run / TOL as imperial fractions (panel + export)

## Status

implemented

## Lane

normal

## Product Contract

TD: "the measurement and TOL should be in fraction." In **inch mode**, the spec
numbers are the house imperial convention — fractions, not decimals:

- Panel: Size L, Size L2, and TOL inputs display as reduced fractions
  (`5.5 → 5 1/2`, `0.375 → 3/8`).
- Export: size run already renders as fractions (Excel numFmt 164); **TOL** now
  exports as a fraction too (`0.375 → 3/8`) instead of a decimal.

In **cm mode**, everything stays decimal (fractions are imperial-only). The
auto-measured VALUE column is unchanged (TD scoped it out).

## Relevant Product Docs

- `docs/decisions/0009-*` (unit handling: inches default, cm supported)
- Export invariant: two identical exports are byte-identical (`npm run export-xlsx`).

## Acceptance Criteria

- Inch mode: Size L / L2 / TOL panel inputs show a reduced fraction when the
  value lands on the 1/16 grid; an off-grid / odd value (9.9, a raw median)
  shows verbatim — never misrepresented as a near fraction.
- Inch mode: exported TOL is a fraction (verbatim text, no coercion); typed
  `± a/b` round-trips exactly.
- cm mode: panel + export stay decimal.
- Arrow-stepping a spec field (1/8 grain) keeps the field showing fractions.
- Accepting a suggestion (typing its value in either fraction or decimal form)
  still counts as "no override" — numeric compare in `setPomSpec`.
- Empty spec fields, blank clears, and TD overrides all behave as before.

## Design Notes

- Commands: `inchesToFractionOrDecimal` / `decimalToFraction` / `gcdInt` /
  `specNumEq` (`src/ui/spec-panel.js`), display-only (stored values stay decimal).
- UI surfaces: `buildSpecInputCell` sets the fraction display; the arrow-step
  handler re-renders the field as a fraction; `setPomSpec` clears on numeric
  equality so accepted suggestions stay "library".
- Export: `src/render/export-xlsx.js` TOL cell wraps `spec.tol` in
  `inchesToFractionOrDecimal`. Size cells keep numFmt 164 (unchanged) so live
  grade formulas (Req-3) still recompute.
- Domain rules: fraction grid = 1/16 (covers halves/quarters/eighths/sixteenths).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | build + check pass |
| Integration | suggestions-tests PASS (panel fraction display), export-xlsx PASS (typed ± a/b round-trip + fraction numFmt), export-hidden PASS, autosave-check PASS |
| E2E | Browser: inch → panel `5 1/2` / `1/4`, export TOL `3/8`; cm → decimals |
| Platform | n/a |
| Release | n/a |

## Harness Delta

None. Display + TOL-text change; size-cell numFmt and grade formulas untouched.

## Evidence

- `npm run check` / `suggestions-tests` / `export-xlsx` / `export-hidden` /
  `autosave-check` — pass.
- Browser (localhost:4173) via `loadProject` + panel read + `exportSpecXlsxBase64`:
  inch → Size L `5 1/2, 2 1/4, 1 3/4`, TOL `1/4, 1/8, 3/8`, export TOL
  `3/8,1/2,1/4,1/8`; cm → `35.56 / 0.953` (decimal). Panel screenshot confirms.
- Note: `golden` / `contract` remain red only on the new demo
  `EvelynBliss vA 1.0.jpg` (no baseline + 1 detection assertion) — pre-existing,
  unrelated (see US-047).
