# Cell map — ` BOM-LACE`

Implementation-ready map for worksheet 3 of the factory pack, read cell by cell
off the reference release
`3916.KiraForm vA 1.0 17.05.2025(1).xlsx` → sheet ` BOM-LACE` (`xl/worksheets/sheet3.xml`,
`xl/drawings/drawing3.xml`).

Every colour, width, height, offset and literal below was read from that file.
Nothing here is invented; where our state cannot fill a cell it is listed in
[Data gaps](#7-data-gaps), not guessed.

`BOM-SOLID` is the same map with `variant = 'solid'` — see
[`bom-solid.md`](bom-solid.md) for the two differences (sheet name, no
LACE-scoped rows).

Scope note: this document describes the **exported worksheet**. The BOM page on
screen does not change (ADR 0048 decision 6).

---

## 1. Sheet identity

| Property | Value | Source |
| --- | --- | --- |
| Sheet name | `" BOM-LACE"` — **one leading space**, no trailing space | reference `xl/workbook.xml`; kept per ADR 0048 decision 1 ("kept only if it costs nothing" — it is one character in `TECHPACK_SHEET_NAMES`) |
| Position | 3 of 5 (MAIN PAGE, CONSTRUCTION DETAIL, ` BOM-LACE`, BOM-SOLID, PROTO Direction) | `design.md` |
| Tab colour | `FFB8CCE4` | `<sheetPr><tabColor rgb="FFB8CCE4"/>` |
| `fitToPage` | `1` (`<pageSetUpPr fitToPage="1"/>`) | reference |
| Paper | `paperSize="9"` (A4) | reference |
| Orientation | `portrait` | reference |
| Scale | none — no `scale` attribute; scaling comes from `fitToPage` | reference |
| `fitToWidth` / `fitToHeight` | reference omits both (⇒ implicit `1` / `1`). **We emit `fitToWidth="1" fitToHeight="0"`** — see [Deviations D11](#8-deviations) | deviation |
| Margins | `left="0.236220472440945" right="0.236220472440945" top="0.748031496062992" bottom="0.748031496062992" header="0" footer="0"` (0.6 cm sides, 1.9 cm top/bottom) | reference |
| Centering | `<printOptions horizontalCentered="1"/>` — horizontal only, no `verticalCentered` | reference |
| Header / footer | `<headerFooter/>` empty. **Never emit the reference's customer footer** (ADR 0048 decision 2) | reference + ADR |
| `showGridLines` | `0` | reference |
| Freeze / split panes | none in the reference — emit no `<pane>` | reference |
| `topLeftCell` | reference has `topLeftCell="G32"` (the author's stale scroll position) — **dropped**, emit no attribute | residue |
| `sheetFormatPr` | `defaultColWidth="12.6339285714286" defaultRowHeight="15"`. The reference also carries `customHeight="1"` here plus a 1000-row apron — **dropped** (ADR 0048 decision 1) | reference + residue |
| `dimension` | `A1:{LAST}{lastRow}` where `LAST` is the last colorway column (§2) and `lastRow` the final trim row. The reference declares `A1:S1000` — apron, dropped | residue |

XML skeleton the writer must emit (order matters in OOXML):

```xml
<worksheet …>
  <sheetPr><tabColor rgb="FFB8CCE4"/><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:O22"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultColWidth="12.6339285714286" defaultRowHeight="15"/>
  <cols>…</cols>
  <sheetData>…</sheetData>
  <mergeCells count="8">…</mergeCells>
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.236220472440945" right="0.236220472440945"
               top="0.748031496062992" bottom="0.748031496062992"
               header="0" footer="0"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
  <headerFooter/>
  <drawing r:id="rId1"/>
</worksheet>
```

---

## 2. Column grid

Widths are verbatim from `<cols>`. The px column is Excel's
`round(width × 7 + 5)` at 96 dpi — used **only** for fitting pictures (§6),
never written to the file.

| Letter | `width` | px | Role |
| --- | --- | --- | --- |
| A | `6.5` | 50 | Item number (`#`) — header cell is **blank** in the reference |
| B | `15.3839285714286` | 113 | `DESCRIPTION` |
| C | `15.3839285714286` | 113 | `SUPPLIER NAME` |
| D | `15.3839285714286` | 113 | `ARTICLE #` |
| E | `15.3839285714286` | 113 | `WIDTH` |
| F | `15.3839285714286` | 113 | `SIZE` |
| G | `15.3839285714286` | 113 | `AREA OF USE` |
| H | `36.6339285714286` | 261 | `MATERIAL IMAGES` — left half of the double-width band; also the left half of the OUTSIDE flat panel |
| I | `36.6339285714286` | 261 | `MATERIAL IMAGES` — right half of the band; first column of the INSIDE flat panel |
| J … `LAST` | `16.1339285714286` | 118 each | Colorway columns, one per `state.mainPage.colorways` entry |
| (P–S) | `9.13392857142857` | 69 | Reference apron, styled but empty — **not emitted** |

Emit as three `<col>` runs plus one for the colorway block:

```js
// widths, in reference order
[{min:1,  max:1,  w:'6.5'},
 {min:2,  max:7,  w:'15.3839285714286'},
 {min:8,  max:9,  w:'36.6339285714286'},
 {min:10, max:9 + Math.max(1, colorways.length), w:'16.1339285714286'}]
```

`LAST` — the rightmost printed column, used by every full-width merge:

```js
const cwCount = ((state.mainPage && state.mainPage.colorways) || []).length;
const LAST = specColLetter(Math.max(8, 9 + cwCount - 1)); // 6 colorways → 'O'
```

The reference has exactly six colorway columns, `J`…`O` (`COL 1`…`COL 6`), so
`LAST = 'O'` there. We do **not** pad to six (Deviation D8).

---

## 3. Row-by-row map

### 3.1 Row addressing

Our table length is dynamic, so rows are addressed by block. `F` = fabric row
count for this variant, `T` = trim row count, both from
`bmNumberedRows('lace')` filtered by `row.section`.

| Symbol | Row | Reference value (F=4, T=10) |
| --- | --- | --- |
| — | 1 | 1 — page title |
| — | 2–3 | 2–3 — flat panels band |
| — | 4 | 4 — table title |
| `FB` | 5 | 5 — `MAIN BODY FABRICS` band |
| `FH` | 6 | 6 — fabric header |
| `FD₁…FD_F` | 7 … 6+F | 7–10 — fabric data |
| `TB` | 7+F | 11 — `TRIMS / COMPONENTS` band |
| `TH` | 8+F | 12 — trim header |
| `TD₁…TD_T` | 9+F … 8+F+T | 13–22 — trim data |

Row ordering **must** be `bmNumberedRows(variant)` order, so the sheet's
numbering matches the page's. The reference proves this is per-sheet and live:
the same size-split pair numbers `6.1`/`6.2` on ` BOM-LACE` and `5.1`/`5.2` on
`BOM-SOLID`, because the LACE-scoped `Galloon lace` row occupies fabric slot 4
on the lace sheet only.

### 3.2 Named styles

The style engine (`design/style-engine.md`) interns these. All fonts are
**Calibri**; all font colours are `FF000000` (the reference writes them as theme
`dk1`, which resolves to `000000` in `xl/theme/theme1.xml`); `numFmt` is
`General` everywhere on this sheet.

| Style | Font | Fill | Borders | Alignment |
| --- | --- | --- | --- | --- |
| `bomTitle` | 18 bold | solid `FFB7B7B7` | anchor: `left medium`, `top medium`; middles: `top medium`; last: `top medium`, `right medium` | center / center |
| `bomFlatCaption` | 11 bold | none | medium box, distributed across the merge's edge cells (§3.4) | center / **top** |
| `bomSectionBand` | 12 bold | solid `FFD8D8D8` | medium box, distributed across the merge's edge cells | center / center |
| `bomHeadNum` | 10 bold | none | `left medium`, `right thin` | center / center |
| `bomHead` | 10 bold | none | `left thin`, `right thin` | center / center, wrap |
| `bomNum` | 10 | none | `left medium`, `right thin`, `top thin`, `bottom thin` | center / center |
| `bomText` | 10 | none | thin box (all four sides) | left / center, wrap |
| `bomWell` | 10 | none | thin box | center / center, **no wrap** |
| `bomColorway` | 10 | none | thin box | center / center, wrap |

Border rationale (read, not invented): the reference's header cells carry
**only vertical** borders — the horizontal rules above and below come from the
band row's `bottom medium` and the first data row's `top thin`. Keep that; it is
why `bomHead` has no top/bottom.

Fills read on the reference that we deliberately do **not** reproduce: the
`FFFFFF00` yellow on `N6`/`N12` and on every `N` data cell (a working
highlight), the theme-`lt1` (= `FFFFFF`) white on `K`/`M`/`O`, the explicit
`FFFFFFFF` on `J`, and the scattered white fills on `C14`, `C15`, `B21:E21`,
`G21`, `B22:E22`. All are residue → no fill (Deviation D5).

### 3.3 Row 1 — page title

Height `35.25`.

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A1` | literal `Fabric and Trim Requirement` (factory boilerplate) | `bomTitle` (anchor) | `A1:{LAST}1` |
| `B1`…`{LAST-1}1` | blank | `bomTitle` (middle) | ↑ |
| `{LAST}1` | blank | `bomTitle` (last) | ↑ |

### 3.4 Rows 2–3 — the two annotated flat half-panels

Height `408.75` (row 2) and `100.5` (row 3). Two merged wells, each framed with
a medium box, each holding a caption **as cell text** plus one picture (§6).

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A2` | literal `OUTSIDE VIEW` | `bomFlatCaption`; borders `left medium` + `top medium` | `A2:H3` |
| `B2`…`G2` | blank | `bomFlatCaption`; `top medium` | ↑ |
| `H2` | blank | `bomFlatCaption`; `top medium` + `right medium` | ↑ |
| `A3` | blank | `bomFlatCaption`; `left medium` + `bottom medium` | ↑ |
| `B3`…`G3` | blank | `bomFlatCaption`; `bottom medium` | ↑ |
| `H3` | blank | `bomFlatCaption`; `bottom medium` + `right medium` | ↑ |
| `I2` | literal `INSIDE VIEW` | `bomFlatCaption`; `top medium` (no left — the OUTSIDE panel's `H2 right medium` is the divider, exactly as the reference has it) | `I2:{LAST}3` |
| `J2`…`{LAST-1}2` | blank | `bomFlatCaption`; `top medium` | ↑ |
| `{LAST}2` | blank | `bomFlatCaption`; `top medium` + `right medium` | ↑ |
| `I3`…`{LAST-1}3` | blank | `bomFlatCaption`; `bottom medium` | ↑ |
| `{LAST}3` | blank | `bomFlatCaption`; `bottom medium` + `right medium` | ↑ |

In the reference these two captions are `xdr:sp` text boxes — `Shape 4`
(`OUTSIDE VIEW`, anchored col 4 / row 1, `colOff 733425`, `rowOff 276225`,
ext 154×46 px) and `Shape 3` (`INSIDE VIEW`, col 10 / row 1, same offsets) —
each a no-fill rect with a 2 pt (`w="25400"`) black outline, Calibri 11 bold,
centred. Both cells in rows 2–3 are otherwise **empty** in the reference. We
render them as top-aligned merged-cell text (`xdr:sp` is out of scope per
`execplan.md`); the merge's own medium frame stands in for the shape outline
(Deviation D1).

### 3.5 Row 4 — table title

Height `35.25`.

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A4` | literal `Bill of Materials Sheet` (factory boilerplate) | `bomTitle` (anchor) | `A4:{LAST}4` |
| `B4`…`{LAST}4` | blank | `bomTitle` (middle / last) | ↑ |

### 3.6 Row `FB` (=5) — fabric section band

Height `23.25`.

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A5` | `BM_SECTION_BANDS.FABRIC` → `MAIN BODY FABRICS` (verbatim match with the reference) | `bomSectionBand`; `left/top/bottom medium` | `A5:{LAST}5` |
| `B5`…`{LAST-1}5` | blank | `bomSectionBand`; `top/bottom medium` | ↑ |
| `{LAST}5` | blank | `bomSectionBand`; `top/bottom/right medium` | ↑ |

### 3.7 Row `FH` (=6) — fabric header

Height `16.5`. **English only, single line.** Labels come from
`BM_CELL_LABELS[field]`; `BM_CELL_LABELS_CN` and `BM_PHOTO_LABEL_CN` are not
read by this sheet at all.

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A6` | **blank** — the reference has no `#` header text, only the styled cell | `bomHeadNum` | — |
| `B6` | `DESCRIPTION` | `bomHead` | — |
| `C6` | `SUPPLIER NAME` | `bomHead` | — |
| `D6` | `ARTICLE #` | `bomHead` | — |
| `E6` | `WIDTH` | `bomHead` | — |
| `F6` | `SIZE` | `bomHead` | — |
| `G6` | `AREA OF USE` | `bomHead` | — |
| `H6` | `BM_PHOTO_LABEL` → `MATERIAL IMAGES` | `bomHead` (anchor) | `H6:I6` |
| `I6` | blank | `bomHead` (continuation) | ↑ |
| `J6` … `{LAST}6` | `state.mainPage.colorways[i].col` → `COL 1` … `COL 6` | `bomHead` | — |

### 3.8 Rows `FD₁…FD_F` (=7–10) — fabric data

Height **`90`** per row (the reference's fabric-block geometry).

`x` = the `bmNumberedRows(variant)` entry, `row = x.row`, `r` = the sheet row.

| Cell | Content — exact state expression | Style | Notes |
| --- | --- | --- | --- |
| `A{r}` | `x.seq` written as a **number** (`<c r="A7" s="…"><v>1</v></c>`) | `bomNum` | Reference `A7` is `<v>1</v>`, `A14` is `<v>6.1</v>` — numeric, `General` format. Emit numeric when `/^\d+(\.\d)$/` matches `x.seq`; fall back to `t="inlineStr"` for a 10+-member split (`6.10` would collapse to `6.1` as a number). Never occurs with today's `bmSplitRow` (pairs only) |
| `B{r}` | `row.cells.description` | `bomText` | |
| `C{r}` | `row.cells.supplier` | `bomText` | |
| `D{r}` | `row.cells.article` | `bomText` | |
| `E{r}` | `row.cells.width` | `bomText` | |
| `F{r}` | `row.cells.size` | `bomText` | Reference values are size-run strings: `ALL`, `XS, S, M, L, XL`, `2XL and above`, `Size wise graded` |
| `G{r}` | `row.cells.areaOfUse` | `bomText` | |
| `H{r}` | blank — picture well (§6) | `bomWell` | Holds `row.photo.dataURL` as a picture, never text |
| `I{r}` | blank — second picture well | `bomWell` | **Not merged with H** in data rows; no state fills it today (Gap G2) |
| `J{r}` … `{LAST}{r}` | `bmCwValue(row, colorways[i])` rendered two-line (§3.10) | `bomColorway` | |

`row.cells.composition` is **not written** — see §4.

### 3.9 Rows `TB`, `TH`, `TD₁…TD_T` (=11, 12, 13–22) — trim block

Identical to §3.6–3.8 with three differences read off the reference:

| Row | Height | Difference |
| --- | --- | --- |
| `TB` (=11) | `15.75` | Band text is `BM_SECTION_BANDS.TRIM` → `TRIMS / COMPONENTS`. Borders `left/right/bottom medium` — **no top** (the fabric block's last data row supplies the rule). Merge `A{TB}:{LAST}{TB}` |
| `TH` (=12) | `15.75` | Same header cells as `FH`, same styles. Merge `H{TH}:I{TH}` |
| `TD_n` (=13–22) | **`127.5`** | Same cell map as §3.8. The taller row is the trim block's geometry in the reference (bigger component photos) |

The two size-split pairs are ordinary data rows; only `A{r}` differs
(`6.1`/`6.2`, `12.1`/`12.2` …), and `bmNumberedRows` already produces that.

### 3.10 Two-line colorway values

Per ADR 0048 decision 8 / `design.md`, a colorway is
`{ col, code, name, value, hex }`. The BOM cell prints:

```js
function bomCwCellText(row, cw) {
  const v = bmCwValue(row, cw);              // cwOverride wins, else cw.value
  if (row.cwOverride && Object.prototype.hasOwnProperty.call(row.cwOverride, cw.col)) return v;
  return cw.code ? cw.code + '\n' + cw.name : (cw.name || cw.value || '');
}
```

Reference literals this reproduces, verbatim:

| Column | Cell text | Renders as |
| --- | --- | --- |
| `J` | `Default White` | one line (no code) |
| `K` | `Default Black` | one line |
| `L` | `14-1212 TCX␊Nude Tan CP` | two lines |
| `M` | `12-1304 TCX␊Light Pink CP` | two lines |
| `N` | `14-4306 TCX␊Coral Blue CP` | two lines |
| `O` | `18-3211 TCX␊Dusty Purple CP` | two lines |

Those strings are exactly the `MP_COLOR_MASTER` entries `14-1212 TCX Nude Tan CP`
etc. with the code/name split applied — the master list needs no editing.

**Writer change:** the reference encodes the break as `&#10;` in
`sharedStrings.xml`. `xmlEscape()` in `src/render/export-xlsx.js` does not
escape `\n` today; add `.replace(/\n/g, '&#10;')` (a raw LF inside
`<t xml:space="preserve">` survives XML parsing, but the explicit entity is what
the reference does and removes all doubt). `wrapText` on `bomColorway` is what
makes the break visible.

---

## 4. What the builder drops, and what the header row becomes

`src/ui/bom.js` line 59:

```js
const BM_CELL_FIELDS = ['description', 'composition', 'supplier', 'article', 'width', 'size', 'areaOfUse'];
```

The BOM **page** keeps all seven — a TD uses `TYPE / COMPOSITION` on screen. The
**exporter** must stop reading `BM_CELL_FIELDS` and read its own list:

```js
// src/render/export-xlsx.js — export-only column contract (ADR 0048 decision 6)
const BM_EXPORT_FIELDS = ['description', 'supplier', 'article', 'width', 'size', 'areaOfUse'];
```

- **Dropped from the export:** the `composition` field. `row.cells.composition`
  is never written to any cell; `BM_CELL_LABELS.composition`
  (`TYPE / COMPOSITION`) and `BM_CELL_LABELS_CN.composition` are never read by
  this sheet. Nothing is removed from state, the page, or the project file.
- **Also dropped:** the `'\n' + BM_CELL_LABELS_CN[f]` suffix on every header
  (English-only, single-line) and the `'#'` text in the header's first cell.

The header row becomes exactly seven printed labels plus the colorway block:

| A | B | C | D | E | F | G | H:I (merged) | J … LAST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| *(blank)* | `DESCRIPTION` | `SUPPLIER NAME` | `ARTICLE #` | `WIDTH` | `SIZE` | `AREA OF USE` | `MATERIAL IMAGES` | `COL 1` … |

Column count: `1 + BM_EXPORT_FIELDS.length + 2 + colorways.length`
(A + six text columns + the H/I double well + colorways) = 15 when six
colorways exist, matching the reference's `A`…`O`.

Cross-check for the suite: `bom-check.mjs:185` asserts the **page** header still
starts `#|DESCRIPTION|TYPE / COMPOSITION|…`. That assertion is about the page and
must stay green unchanged; the new `factory-format-check` asserts the export
header has no `TYPE / COMPOSITION`.

---

## 5. Merge list

Eight merges — the same count the reference declares (`<mergeCells count="8">`).
`LAST` is from §2; `FB`/`FH`/`TB`/`TH` from §3.1. Reference refs in the last
column are the F=4 / T=10 / six-colorway case.

| Merge | Anchor cell + content | Purpose | Reference |
| --- | --- | --- | --- |
| `A1:{LAST}1` | `A1` = `Fabric and Trim Requirement` | page title bar | `A1:O1` |
| `A2:H3` | `A2` = `OUTSIDE VIEW` | left flat panel well | `A2:H3` |
| `I2:{LAST}3` | `I2` = `INSIDE VIEW` | right flat panel well | `I2:O3` |
| `A4:{LAST}4` | `A4` = `Bill of Materials Sheet` | table title bar | `A4:O4` |
| `A{FB}:{LAST}{FB}` | `A5` = `MAIN BODY FABRICS` | fabric section band | `A5:O5` |
| `H{FH}:I{FH}` | `H6` = `MATERIAL IMAGES` | double-width image band, fabric header | `H6:I6` |
| `A{TB}:{LAST}{TB}` | `A11` = `TRIMS / COMPONENTS` | trim section band | `A11:O11` |
| `H{TH}:I{TH}` | `H12` = `MATERIAL IMAGES` | double-width image band, trim header | `H12:I12` |

Rules the writer must honour:

- Emit `<mergeCells>` **after** `</sheetData>` and **before** `<printOptions>`.
- Every continuation cell of a merge still needs its own `<c>` with the merge's
  style so the frame draws — the reference does exactly this (row 1 carries 19
  `<c>` elements for one string). §3.4 lists the per-edge border split.
- No merge exists in a data row: `H{r}` and `I{r}` are separate cells there
  (Deviation D10).

---

## 6. Images

All pictures are `oneCellAnchor` with an explicit `<xdr:ext>` (the pattern
`buildTechPackDrawingXml` already uses), so aspect is fixed by the writer.
`xdr:cNvPicPr` must gain `<a:picLocks noChangeAspect="1"/>` — the reference
omits it, our current writer already emits it; keep it.

**Aspect is preserved for every image on this sheet.** `displayWidth` /
`displayHeight` are computed by fitting the natural PNG size into the well box:
`s = min(boxW / natW, boxH / natH)`.

`colOff` / `rowOff` are given in px; multiply by `9525` for EMU.

| # | Render | Anchor | colOff | rowOff | Display box (max) | Aspect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | OUTSIDE flat: `bmRenderMatkeyToCanvas(variant, 'outer', …)` → PNG (needs the new `view` argument, Gap G1) | `A2` | `4` | `76` | `976 × 595` px | preserved, fit |
| 2 | INSIDE flat: `bmRenderMatkeyToCanvas(variant, 'inner', …)` → PNG | `I2` | `4` | `76` | `(261 + 118 × cwCount − 8) × 595` px → `961 × 595` at six colorways | preserved, fit |
| 3…n | Material photo: `pngBytesFromDataURL(row.photo.dataURL, 400)` for each row with a photo | `H{r}` | `4` | `4` | `253 × (rowPx − 8)` → `253 × 112` on a fabric row (90 pt), `253 × 162` on a trim row (127.5 pt) | preserved, fit |

Derivation of the flat-panel box, from the widths and heights in §2/§3:

- OUTSIDE well `A2:H3` = `50 + 6×113 + 261` = **989 px** wide; rows 2+3 =
  `408.75 + 100.5` pt = **679 px** tall.
  Width budget `989 − 4 (colOff) − 9 (right pad) = 976`; height budget
  `679 − 76 (caption clearance) − 8 (bottom pad) = 595`.
- INSIDE well `I2:{LAST}3` = `261 + 118 × cwCount` = **969 px** at six
  colorways; same height budget.
- `rowOff 76` clears the caption: the reference's caption box sits 29 px below
  the band top and is 46 px tall (29 + 46 ≈ 76 px, and `76 px = 723900 EMU` is
  literally the caption's `a:off y` in the reference drawing).

Reference anchors, recorded for provenance (`xdr:from` is authoritative;
`a:off` is a stale cached render position and disagrees by ~22 px on
`image17.png`):

| Reference picture | `from` col/colOff | `from` row/rowOff | `ext` (px) | Reads as |
| --- | --- | --- | --- | --- |
| `image22.png` | 0 / `12700` | 1 / `1710690` | 984 × 388 | OUTSIDE flat, spanning `A`…`H` (984 ≈ the 989 px well) |
| `image17.png` | 8 / `142240` | 1 / `2128520` | 966 × 303 | INSIDE flat, spanning `I`…`O` (966 ≈ the 969 px well) |
| `image23.png` | 7 / `0` | 7 / `0` | 91 × 120 | material photo, row 8 `H` well |
| `image25.png` | 7 / `0` | 9 / `0` | 89 × 119 | material photo, row 10 `H` well |
| `image2.png` | 6 / `1171575` | 12 / `219075` | 290 × 126 | row 13 `H` well |
| `image9.png` | 6 / `1162050` | 13 / `38100` | 291 × 327 | row 14 `H` well (over-tall — spills into rows 15–16 in the reference) |
| `image20.png` | 6 / `1162050` | 15 / `581025` | 292 × 50 | row 16 `H` well |
| `image15.png` | 7 / `2771775` | 15 / `400050` | 291 × 88 | row 16 **`I`** well (second photo) |
| `image24.png` | 7 / `0` | 16 / `0` | 230 × 170 | row 17 `H` well |
| `image19.png` | 7 / `0` | 17 / `0` | 238 × 170 | row 18 `H` well |
| `image11.png` | 7 / `704850` | 18 / `47625` | 141 × 163 | row 19 `H` well |
| `image6.png` | 6 / `1171575` | 20 / `352425` | 284 × 100 | row 21 `H` well |
| `image4.png` | 7 / `2771775` | 20 / `304800` | 292 × 114 | row 21 **`I`** well (second photo) |

Two reference facts to note: several pictures are anchored to column index 6
(`G`) with a `colOff` larger than `G`'s width, i.e. they land inside `H` — WPS
sloppiness we normalise by anchoring to `H` with a small `colOff`. And several
pictures are taller than their row, overlapping the row below; our fit-to-box
rule prevents that (Deviation D9).

---

## 7. Data gaps

Everything on the reference sheet with no source in our state.

| # | Reference thing | Our state | Recommendation |
| --- | --- | --- | --- |
| G1 | Two flat panels, one OUTSIDE and one INSIDE, each with its own numbered material callouts | `state.bom.images[variant]` is a **flat, role-less list** of free-positioned images (`{id,x,y,width,height,aspect,locked}`); `bmRenderMatkeyToCanvas(variant, w, h, s)` renders **all** of them plus all callouts onto **one** canvas. Construction, by contrast, already keys images by `sheet` + `view:'outer'\|'inner'` (`CC_VIEWS`) | **Add state.** Give a BOM image `view: 'outer'\|'inner'` (default `'outer'`), mirroring `CC_VIEWS`, and add a `view` filter argument to `bmRenderMatkeyToCanvas` / `bmDrawCanvasInto` so the exporter can render one panel at a time. Interim rule if the state lands later: sort `bmVariantImages(variant)` by `x` then `y`; first → OUTSIDE, second → INSIDE; one image → OUTSIDE only, INSIDE well framed and empty; three or more → all on OUTSIDE |
| G2 | A **second** material photo per row, in the `I` well (`image15.png` row 16, `image4.png` row 21) | `row.photo` is a single `{dataURL}` | **Add state** if the TD wants it: `row.photos: [{dataURL}, {dataURL}]` capped at 2, with `row.photo` kept as an alias for `photos[0]` on load. Until then: photo → `H` well, `I` well framed and empty |
| G3 | Article-code **text** inside the MATERIAL IMAGES well: `H7 = 'BR-FB-KT-NL-H-200-XG-I/7'`, `H9 = 'BR-MM-KT-NL-H-180-F012-I/1'` (the reference uses the picture cell as a fallback text cell when it has no photo) | no source; our `article` column already carries codes | **Drop.** Column `D` (`ARTICLE #`) is the contract home for a code; duplicating it in the image well is the reference working around a missing photo |
| G4 | `A1 = 'Fabric and Trim Requirement'`, `A4 = 'Bill of Materials Sheet'`, `A2 = 'OUTSIDE VIEW'`, `I2 = 'INSIDE VIEW'` | no source | **Hard-code as factory boilerplate** in `buildBomSheetPart`. Four literals, identical on both BOM sheets |
| G5 | No style/date identity row anywhere on the sheet | our current builder writes `bmSheetMetaText()` (range name · style # · creation date) into row 2 | **Drop from this sheet** — row 2 is the flats band, and MAIN PAGE owns style identity. `bmSheetMetaText()` stays in use by the BOM page's on-screen sheet head |
| G6 | Six colorway columns `COL 1`…`COL 6` | `state.mainPage.colorways` — two by default (`Default White`, `Default Black`) | **No new state.** Emit one column per entry; `LAST` and every full-width merge follow. Do not pad to six (Deviation D8) |
| G7 | `I13 = '`'` (a lone backtick in the image column) | none | **Drop** — named residue in ADR 0048 decision 1 |
| G8 | `P13` styled as bold red Calibri 12, empty; `P14:S16` white-filled, empty; `P:S` column widths | none | **Drop** — styled-empty apron |

Nothing on this sheet needs a POM, an anchor, or a measurement, so
`pom-template.json` is not read by this map.

---

## 8. Deviations

| # | Deviation | Reason |
| --- | --- | --- |
| D1 | `OUTSIDE VIEW` / `INSIDE VIEW` are **merged-cell text** (top-aligned, Calibri 11 bold, centred), not the reference's `xdr:sp` text boxes with a 2 pt outline | `xdr:sp` is out of scope (`execplan.md`); the merged panel's own medium frame reads as the caption's box. Instruction from the sheet brief |
| D2 | Sheet name keeps the reference's leading space (`" BOM-LACE"`); `BOM-SOLID` has none | ADR 0048 decision 1 — kept because it costs one character. If any consumer normalises sheet names, drop it: it carries no information |
| D3 | `TYPE / COMPOSITION` column dropped from the export | ADR 0048 decision 6. Column count 8 → 7 printed |
| D4 | Headers are English, single-line; the `#` header cell is blank | ADR 0048 decision 6 + read from `A6`/`A12` |
| D5 | No fills on colorway cells (reference: `FFFF00` on `N`, `FFFFFF` on `J`/`K`/`M`/`O`) and none on the scattered white body cells (`C14`, `C15`, `B21:E21`, `G21`, `B22:E22`) | A one-column yellow highlight and stray whites are working residue, not format |
| D6 | All body text is Calibri 10 | the reference mixes Calibri 10, Calibri 11 and Arial 10 across adjacent cells in the same column (e.g. `B14` Calibri 10 vs `B20` Calibri 11 vs `F14` Arial 10) — inconsistency, not design |
| D7 | Normalised border scheme (§3.2): thin box on every data cell, `left medium` on column `A`, medium box only on the title/band/panel rows | the reference loses `left medium` on `A9`, gives `O6` a full box but `O12` only verticals, and closes the data block's right edge with thin — inconsistent. The scheme keeps every rule a reader sees |
| D8 | Colorway column count follows `state.mainPage.colorways` (2 by default) instead of a fixed six | the six columns are this style's colourway plan, not a grid requirement. Every merge is computed from `LAST` |
| D9 | Every picture is fitted inside its cell box; nothing overlaps the row below | reference `image9.png` (327 px) is nearly twice its 170 px row and covers rows 15–16 |
| D10 | `H` and `I` stay **unmerged** in data rows (merged only in the two header rows) | matches the reference and leaves room for the second photo of Gap G2 |
| D11 | `pageSetup` gets `fitToWidth="1" fitToHeight="0"`; the reference omits both (implicit 1 × 1) | our table length is unbounded — a 40-material BOM squeezed onto one page is unreadable. Columns still fit the page width, which is the parity a reader notices |
| D12 | No `topLeftCell`, no 1000-row apron, no `customHeight="1"` on `sheetFormatPr`, `dimension` ends at the last real row | ADR 0048 decision 1 |
| D13 | No footer | ADR 0048 decision 2 — the reference footer is another company's legal notice |
| D14 | Item numbers are numeric (`<v>6.1</v>`) with a text fallback for a hypothetical `x.10` split | matches the reference's cell types; the fallback protects a value a number cannot represent |
| D15 | `xmlEscape()` gains `\n → &#10;` | required for the two-line colorway cells; matches the reference's `sharedStrings` encoding |

---

## 9. Verification hooks

- `factory-format-check` (new): sheet name `" BOM-LACE"` with its leading space
  at index 2; column widths per §2; the eight merges of §5; `FFB7B7B7` on
  `A1`/`A4` and `FFD8D8D8` on both band rows; medium frames on `A2:H3` and
  `I2:{LAST}3`; row heights `35.25 / 408.75 / 100.5 / 35.25 / 23.25 / 16.5 / 90×F
  / 15.75 / 15.75 / 127.5×T`; `paperSize 9`, portrait, `horizontalCentered`,
  `showGridLines="0"`, tab colour `FFB8CCE4`; header row has exactly
  `DESCRIPTION, SUPPLIER NAME, ARTICLE #, WIDTH, SIZE, AREA OF USE,
  MATERIAL IMAGES` and **no** `TYPE / COMPOSITION`; `A{FH}` empty; item numbers
  numeric with `x.1`/`x.2` on the seeded split pairs; a colorway cell with a code
  contains `\n`.
- `bom-check` must stay green **unchanged** — the page keeps all seven columns.
- Screenshot / LibreOffice render of the exported sheet: the US-068 lesson is
  that 29 green assertions coexisted with two visible defects. The two panels
  and the photo wells are exactly the kind of thing assertions miss.
