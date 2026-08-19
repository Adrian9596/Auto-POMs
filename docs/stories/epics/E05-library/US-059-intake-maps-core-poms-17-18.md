# US-059 Library intake maps core POMs 17/18 with term confirmation

## Status

implemented

## Lane

normal

Intake classification — input type: **change request** (refines accepted
importer behaviour). Risk flags: **public contracts** (importer output is
consumed downstream by evidence bundles and the library), **existing behavior**
(a suite asserted the old non-mapping result). 2 flags, no hard gate tripped —
this is not auth/authorization, not a data migration, not audit/security, not an
external provider, and it *strengthens* rather than weakens validation. Lane:
**normal with stronger validation**.

## Product Contract

A Measurement Spec workbook row or saved-project POM spec numbered 17 or 18
resolves to the active core concept (`neckline_length`, `armhole_curve_length`)
when the source carries evidence that it means that concept — and stays pending
for TD review when it does not.

Before this story `scripts/library-intake.mjs` still bounded POM numbers at 16
in three places, so ADR 0032's newly active concepts 17/18 could never resolve:
every such row landed as `mapping_status: 'pending_term_mapping'` with
`concept_id: null`, `pom_number: null`, and the `unresolved_or_custom_pom_number`
issue. This was live behaviour, not a latent gate — import is the only path by
which corpus values for 17/18 can ever enter the library, so ADR 0032's
follow-up ("add corpus Size-L suggestions and ground truth for 17/18") was
blocked by it.

## Relevant Product Docs

- `library/README.md` — source-of-truth order, number-to-concept mapping rule,
  safety boundaries (updated by this story).
- `library/pom-definitions/contract-reference.json` — owns
  `numbering_policy.core_range`; the versioned source of truth for the bound.
- `docs/decisions/0032-extend-pom-core-range-to-18.md` — widened the core range
  16 → 18 and promoted 17/18 to `active_contract`.
- `docs/decisions/0014-global-immutable-pom-numbering.md`,
  `docs/decisions/0018-custom-poms-extend-contract.md` — why numbers 17+ were
  custom-POM territory before ADR 0032.

## Acceptance Criteria

- The core-range bound is **derived** from
  `numbering_policy.core_range` rather than hardcoded, so the next widening
  needs no edit in `library-intake.mjs`. A malformed range fails closed
  (`unsupported_numbering_policy_core_range`).
- POMs 1–16 map by number alone — behaviour byte-identical to before.
- A workbook row numbered 17/18 maps to the core concept only when its
  description matches the canonical English name or a TD-approved alias.
- A workbook row numbered 17/18 whose term does not confirm stays
  `pending_term_mapping` and still raises `unresolved_or_custom_pom_number`.
- A saved project's POM 17/18 maps unless the key is declared in
  `state.customPoms`, which is authoritative for that source.
- `buildTdReview` offers 17/18 as advisory candidates for unresolved terms;
  nothing is auto-resolved by fuzzy match.

## Design Notes

- **Domain rules:** two independent bounds, deliberately separated.
  `core_range.last` is a *moving contract bound* → derived from the governed
  JSON. `NUMBER_ONLY_MAPPING_THROUGH = 16` is a *frozen fact about legacy
  source data* ("numbers ≤16 were never custom-POM slots") → an importer-local
  constant. It is not added to `contract-reference.json` because that file
  describes what the POMs are, not what old spreadsheets did with their
  numbers. Because the boundary is frozen and the range is derived, a future
  core-range bump makes the new number term-confirmed by default (fail-closed).
- **Why term confirmation at all (TD decision, 2026-07-27):** the real legacy
  corpus (`../Measurements 2/library/_raw_intake/measurements_size_l.csv`) uses
  17/18 for other measurements in 43 rows across ~20 styles — 17 as "Strap
  width", "Back panel height", "Shoulder strap length", "Back shoulder strap
  length", "Inner Cup height", "Total body length", "Hook and eye width"; 18 as
  "Strap width", "Shoulder strap length", "Back panel height". Not one is a
  neckline or armhole. Mapping by number alone would have recorded a
  back-panel-height value as a neckline length. The TD chose number + term
  confirmation over a bare widening.
- **Evidence is per-source, not uniform:** `coreConceptFor(number, concepts,
  evidence)` takes `term` (workbooks — no custom-POM list exists, so the
  description is the only signal) or `declaredCustom` (saved projects — the
  project lists its custom POMs, which is stronger than a term match and works
  even when a spec carries no description).
- **Term vocabulary** is canonical English name + `aliases_approved` only,
  matching the existing legacy-CSV matcher. `canonical_name_zh` is not accepted:
  `norm()` strips non-ASCII, so a Chinese label normalises to the empty string
  and could never match. A TD needing a different label adds an approved alias.
- **Queries:** `registry()` now returns concepts within the derived range, which
  also lets `importLegacySizeLCsv` resolve a legacy row whose *term* is
  "Neckline length"/"Armhole curve length" (no such row exists today, so legacy
  output is unchanged) and lets `buildTdReview` suggest 17/18.
- **No app rebuild:** `library-intake.mjs` is a script, not a `src/` part
  concatenated into `app.js`, so `npm run build` is not required for it.

## Validation

`scripts/bin/harness-cli story update --id US-059 --unit 1 --integration 0 --e2e 0 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | `npm run library-intake-tests` — 48 assertions (was 43), 5 new covering both sides of the rule on both import paths. |
| Integration | Not applicable — intake is a dependency-free Node script with no service boundary. |
| E2E | Not applicable — no UI surface; the importer is CLI-invoked. |
| Platform | Not applicable — no browser or platform behaviour changes. |
| Release | `npm run check` passes; `library-l0-tests` and `suggestions-tests` unchanged vs the pre-change baseline. |

## Harness Delta

None required. Two pre-existing failures were observed and confirmed
independent of this change (neither suite imports `library-intake.mjs`):

- `library-l0-tests` — 4 failing assertions: the library's anchor mirror still
  records `anchors-2026-07-18-neckline-armhole-b` with fingerprint
  `sha256:9ca59be1…`, while `auto_mode_rules/version.json` is at
  `anchors-2026-07-26-cup-width-own-height` and the file hashes to
  `sha256:39bb59d2…`. The governance mirror was not resynced after ADR 0036.
  Same *class* of miss as this story (library mirror not moving in lockstep with
  a contract change), different artifact — left out deliberately rather than
  folded into a mapping change.
- `library-l0-tests` also exits 0 despite printing `FAIL`, so a red run does not
  break a caller that only checks the exit code.
- `pom-contract-tests` — 1 failing assertion on `demo/EvelynBliss vA 1.0.jpg`,
  the new demo with no committed baseline.

## Evidence

- `npm run library-intake-tests` — PASS, 48/48. New assertions:
  - `a stale custom POM 17 row is not confused with the core neckline concept`
  - `an unconfirmed POM 17 row stays pending and is reported`
  - `POM 18 maps to the core armhole concept when the canonical term confirms it`
  - `a core POM 17 in a saved project maps to the neckline concept`
  - `a POM 17 declared as a custom POM does not map to the core neckline concept`
- `npm run check` — `check passed`.
- `npm run suggestions-tests` — PASS (unchanged).
- `npm run library-l0-tests` — 4 pre-existing anchor-mirror failures, identical
  before and after this change.
- Files touched: `scripts/library-intake.mjs`,
  `scripts/library-intake-tests.mjs`, `library/README.md`.
