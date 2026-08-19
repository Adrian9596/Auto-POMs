# US-082 Board Toolbar Simplification

## Status

implemented

## Lane

normal

## Product Contract

The Board toolbar exposes the next useful TD action without presenting every
available command at once. Auto Mode follows the image → Detect → Generate
workflow. Manual Mode keeps drawing tools direct, reveals selection actions
contextually, and groups file, export, view, scale, learning, and destructive
commands in accessible menus. Existing element ids, shortcuts, offline
behavior, project compatibility, and Auto-to-Manual handoff remain unchanged.

## Relevant Product Docs

- `docs/FRONTEND.md`
- `docs/GLOSSARY.md`
- `docs/decisions/0008-reenable-manual-mode.md`
- `docs/decisions/0038-page-navigation-model.md`

## Acceptance Criteria

- An empty Auto Board shows no more than five direct controls and one primary
  action.
- Auto Mode shows no more than seven direct controls at any workflow stage;
  Detect and Generate become the primary action only when they are next.
- Manual Mode shows no more than ten direct controls before selection.
- Selection-only actions do not occupy the direct toolbar without a compatible
  selection or clipboard/history state.
- File, Export, View/More, Arrow, and Color menus support keyboard focus,
  Escape-to-close, and correct `aria-expanded` state.
- The Board toolbar occupies no more than two rows at 1440 px and remains
  usable without overlap at 1024 px and 768 px.
- Existing shortcuts and bound element ids continue to work.
- No detection, anchor, POM geometry, persistence, or export behavior changes.

## Design Notes

- Commands: `npm run build`, `npm run check`, `npm run smoke`,
  `npm run golden`, `npm run invariants`, `npm run contract`,
  `npm run autosave-check`, `npm run board-toolbar-check`.
- Domain rules: one Primary Board Action per state; secondary commands remain
  available in contextual menus.
- UI surfaces: Board toolbar only; tech-pack page tabs remain unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Build membership, syntax, menu/state assertions |
| Integration | Existing Board bindings and shortcuts target original ids |
| E2E | Auto smoke plus dedicated toolbar state transitions |
| Platform | Browser screenshots at 1440, 1024, and 768 px |
| Release | Golden, invariants, contract, autosave all pass |

## Harness Delta

The Harness CLI is absent in this checkout, so durable intake/story rows cannot
be registered. This checked-in story is the fallback work record.

## Evidence

- `npm run build`: pass; 66 source parts assembled.
- `npm run check`: pass.
- `npm run board-toolbar-check`: pass, 30/30 assertions.
- `npm run smoke`: pass; 18 drafts applied, 29 anchors, zero failures.
- `npm run golden`: pass; all 13 fixtures have `maxDrift=0.0000`.
- `npm run invariants`: pass, 135/135 assertions.
- `npm run contract`: pass, 753/753 assertions.
- `npm run autosave-check`: pass.
- Direct browser QA: 1440 px uses at most two toolbar rows; 1024 px and
  768 px remain usable without page overflow. At 768 px, overflow stays
  inside the toolbar and File/Export/More remain visible in the sticky tray.
- Browser console: no JavaScript errors or warnings during the responsive pass.
