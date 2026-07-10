# Validation — US-011

## Automated (must be green before done)

- `npm run check` — build + wiring (new dialog parts registered in
  `scripts/source-parts.mjs`).
- `npm run export-xlsx` — extended: full-run export byte-stable; "L only"
  export has exactly the L columns; formula cells reference correct base
  columns in a subset layout; base-absent subsets emit cached values.
- `npm run export-hidden` — hidden POMs (built-in AND custom) stay excluded.
- `npm run contract`, `npm run invariants`, `npm run golden`, `npm run smoke`
  — auto pipeline untouched (goldens must NOT drift; 16-POM generation
  unchanged).
- `npm run autosave-check` — new fields survive autosave round-trip.

## Manual / TD verification

- Old project (saved before US-011) opens unchanged; export defaults to all
  sizes; grading dialog shows built-ins.
- Add POM 17, label a drawn line "17", set Size L + deltas, export: row 17
  appears with graded formulas; unzip -t passes; openpyxl reads values;
  Excel opens without repair warnings; fractions render as fractions.
- Deselect L2 base, export: depth columns present but value-only. Reselect —
  formulas return.
- Reset-to-standard restores built-in deltas per POM and globally.

## Proof artifacts

- Validation report in this folder after implementation
  (`docs/templates/validation-report.md`).
