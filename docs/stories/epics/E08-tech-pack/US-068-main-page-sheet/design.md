# Design

## Domain Model

`mainPage` is style metadata, not measurement data. It shares no vocabulary with
the POM contract and adds no anchor, no line, and no view. The invariants in
`CLAUDE.md` are untouched by design — this branch is inert to detection.

Entities:

- **Field** — `{ label, value }`. The label is editable (the source keeps it
  `contenteditable`), so a row is bound to its suggestion spec **once, by
  regex, at resolve time** — never re-matched per render. Re-matching would
  unbind a row the moment a TD retypes its label.
- **FieldSpec** (code, not data) — `{ key, re, values, kind? }`. `values` may be
  an array or a thunk, so Season and Style No can be *composed* from what the
  project already knows instead of offering the drifted historical strings.
- **Colorway** — `{ col, value, hex }`. `col` is positional (`COL 1`, `COL 2`)
  and is renumbered on removal.
- **ColorLibraryEntry** — `{ name, hex }`. `hex` is a rough on-screen cue derived
  from shade words in the name, never a Pantone value.

Business rules carried over from the source:

- Brand is pinned to `Crossian` (52/52 in the historical scan).
- Tech Pack Creation date is pinned to the project date, ISO `YYYY-MM-DD`.
- A suggestion list is never a wall: an off-list value is accepted and
  remembered in `fieldExtra[key]`, because the rosters were inferred from 52
  packs and are known to be incomplete.
- `Style No Breakdown` suggests **range names only**. The source's comment is
  explicit that offering the composite `"Airnix · VB · 1.0"` would push the
  whole string into the style name and corrupt every sheet header and the export
  filename. Preserved verbatim.

## Application Flow

`renderFields()` rebuilds the table from `state.mainPage.fields`; the picker is
a single floating menu parked on `<body>` and addressed by row index, opened by
a per-row `▾` trigger that lives in **its own `<td>`**. Keeping the trigger out
of the value cell is load-bearing in the source (the value cell's whole
`textContent` is read back as the value) and is preserved.

Colour search folds diacritics and requires every query token to appear
somewhere in the entry, so `14-38 lilac` and `lilac 14-38` both resolve
`14-3812 TCX Lilac Mist`.

Edits push undo through the tool's `pushHistoryIfChanged()` and mark autosave
dirty via the existing render/update path.

## Interface Contract

No network surface. The changed contract is the **project file**:

```jsonc
state: {
  /* ...existing keys, all unchanged... */
  mainPage: {
    fields:       [ { label, value }, ... ],   // 13 rows
    fieldExtra:   { [specKey]: [ "off-list value", ... ] },
    colorways:    [ { col, value, hex }, ... ],
    colorLibrary: [ { name, hex }, ... ],      // 47 entries
    colorLibId:   "color-master-list-47"
  }
}
```

Read path is defensive: `loadProject` seeds a default when `mainPage` is absent,
so pre-US-068 files open unchanged. `colorLibId` is the source's migration
guard — a project holding a stale library picks up a new master list instead of
pinning the old one.

## Data Model

No database. Persistence is the JSON project file plus the autosave slot.
`PROJECT_VERSION` bumps; `PROJECT_FORMAT` does not, because the change is
additive and old files remain loadable.

Retention concern: `colorLibrary` is 47 entries copied into every saved project.
That is ~3 KB — accepted, and it is what the source does, so a project stays
self-describing when the master list later changes.

## UI / Platform Impact

Browser only, offline. New markup lives in `index.html` behind a MAIN PAGE view;
screen-only affordances (`＋ Thêm màu`, the `▾` triggers, the floating menus)
join the existing print-hidden rule set so the printed sheet stays factory-clean.

## Observability

None. This branch carries no measurement evidence and must not enter the
learning store — learning biases anchor seeds only, and MAIN PAGE has no anchor.

## Runtime mapping

The source module cannot be copied; every primitive it calls is re-pointed:

| `Tech pack Output` | Bra Auto Measure |
| --- | --- |
| `Pack.data` | `state` (`src/state.js`) |
| `Pack.registerModule` | source part in `scripts/source-parts.mjs` |
| `Pack.esc` | `escapeHtml` (`src/ui/dialogs/core.js`) |
| `Pack.pushUndo` / `markDirty` | `pushHistoryIfChanged` (`src/project/history.js`) |
| `Pack.setHint` | `showToast` (`src/ui/toast.js`) |
| `Pack.emit('colorways-changed')` | **no target — no BOM in this tool** |
| `Pack.asset` / `versionImages` | out of scope (no images this story) |
| `Pack.placeVertically` | small local helper |

## Alternatives Considered

1. **Embed the tech pack HTML in an iframe.** Rejected: it carries its own
   `Pack` runtime, an Anthropic API key path, and a 5.8 MB base64 payload, and
   it could not read the board's style data. The tool must stay offline and
   self-contained.
2. **Port the `Pack.*` runtime too, then drop the module in unmodified.** Lower
   porting effort, but it would give the tool two competing state/undo systems.
   Rejected in favour of re-pointing ~8 primitives.
3. **Fields only, no sheet layout** (the intake's option A). Rejected by the TD,
   who chose the full sheet replica.
