# Validation — US-095 Board shapes support Edit Path and Cut Path

## Proof Strategy

Use deterministic model tests for topology and migration, DOM/gesture tests for
the actual command paths, regression suites for the Board and project system,
and a localhost browser pass on a real sketch. Measurement suites must show
zero change when graphics are added.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Live-shape conversion; line/cubic split; closed/open/repeated cuts |
| Integration | history; save/open; autosave; image move/scale/delete ownership |
| E2E | create each shape; resize; Edit Path; node/handle edit; Cut Path; Escape |
| Platform | mouse plus existing touch-to-mouse routing; macOS modifiers |
| Performance | bounded hit-test sampling and no render-loop allocations that grow state |
| Logs/Audit | clean browser console; no network; Harness proof receipt |

## Fixtures

- `demo/demo1.jpg` for a real Board sketch.
- Deterministic synthetic paths covering straight, cubic, closed, open, and
  multiple-subpath topology.
- A pre-US-095 project snapshot with no `graphics` key.

## Commands

See the Validation Checklist in `execplan.md`; exact results are recorded after
implementation.

## Acceptance Evidence

- `npm run board-shape-check`: PASS, 20/20 assertions. The real browser created
  a Rectangle, preserved annotation isolation, cut a cubic closed path, split
  an open path, rejected an endpoint re-cut, migrated an old project, and
  matched image/graphic move and resize transforms before joint deletion.
- `npm run board-toolbar-check`: PASS, 54/54 assertions; all seven Tools menu
  items remain keyboard reachable and responsive.
- `npm run board-interaction-check`: PASS, 250 checks; existing POM, image,
  note, selection, resize, and device-density gestures remain intact.
- `npm run keyboard-shortcuts-check`: PASS, 32/32 assertions.
- `npm run autosave-check`, `npm run export-hidden`, and `npm run preview-check`:
  PASS.
- `npm run smoke`: PASS with 18 drafts applied and reopened in Manual Mode.
- `npm run golden`: PASS on all 13 fixtures with max drift `0.0000`.
- `npm run invariants`: PASS, 187/187 assertions.
- `npm run contract`: PASS, 883/883 assertions.
- `npm run build` and `npm run check`: PASS; generated `app.js` is current.
- Browser console: clean in the focused localhost/CDP run.
