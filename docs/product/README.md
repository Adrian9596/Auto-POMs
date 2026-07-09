# Product Docs

Current product truth for **Bra Auto Measure**. These are the living contract
files; derive smaller domain docs here as behaviors grow.

## Current Product Contracts

The product contract already exists in the repo root and is authoritative:

- [`../../POMS_CONTRACT.md`](../../POMS_CONTRACT.md) — the **16 POMs**: what each
  measures, which view it lives on, its anchor pair, and its confidence tier.
  The machine-readable source of truth is `auto_mode_rules/pom-template.json`
  (JSON wins if the two disagree).
- [`../../PROJECT_CHARTER.md`](../../PROJECT_CHARTER.md) — vision, objectives,
  scope, non-goals, success metrics, milestones, and risks.

Core product rules, in brief:

- Auto-first with Manual handoff: detect → seed anchors → TD corrects →
  generate 16 POM lines → Apply → Manual Mode for TD line correction (visible
  Manual/Auto toggle; projects with applied lines reopen in Manual). No
  per-row approval on a clean apply. See
  `../decisions/0008-reenable-manual-mode.md`.
- Fully offline; no sketch or measurement data leaves the browser.
- The 16-POM set and anchor schema are a **versioned contract**; the learning
  loop tunes seeds, never the rules.

## Update Rule

When behavior changes:

1. Update the affected product doc (here, or `POMS_CONTRACT.md` for POM changes).
2. Update or create the story packet under `docs/stories/`.
3. Update durable proof status with `scripts/bin/harness-cli story add|update`.
4. Record a decision under `docs/decisions/` if the change affects the POM
   contract, anchor schema, architecture, scope, or risk.
