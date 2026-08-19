# Cell map — `CONSTRUCTION DETAIL`

Implementation-ready map for one worksheet of the factory tech-pack workbook
(US-081). Target is **readable/printable equivalence** with the reference, not
byte parity.

- Reference workbook: `3916.KiraForm vA 1.0 17.05.2025(1).xlsx`
- Reference sheet: `CONSTRUCTION DETAIL` (`sheetId="2"`, `xl/worksheets/sheet2.xml`,
  drawing `xl/drawings/drawing2.xml`)
- Our writer: `src/render/export-xlsx.js` → replaces
  `buildConstructionSheetPart('construction-solid')` +
  `buildConstructionSheetPart('construction-lace')` with **one**
  `buildConstructionDetailSheetPart()`.
- Our state: `state.construction` in `src/ui/construction.js`
  (`CC_SHEETS = ['solid','lace']`, `CC_VIEWS = ['outer','inner']`).

Unit conventions used throughout: `1 pt = 4/3 px`; `1 px = 9525 EMU`; column
pixel width from the OOXML formula
`px = trunc(((256*width + trunc(128/7))/256)*7)`.

---

## 1. Sheet identity

| Property | Value | Source |
| --- | --- | --- |
| Sheet name | `CONSTRUCTION DETAIL` | `xl/workbook.xml` `<sheet name="CONSTRUCTION DETAIL" sheetId="2"/>` |
| Tab colour | `<sheetPr><tabColor rgb="FF95B3D7"/></sheetPr>` | sheet2 `sheetPr` |
| `pageSetUpPr` | `fitToPage="1"` | sheet2 `sheetPr` |
| Paper | `paperSize="9"` (A4) | sheet2 `pageSetup` |
| Orientation | `portrait` | sheet2 `pageSetup` |
| Scale | **no `scale` attribute** — fit-to-page governs | sheet2 `pageSetup` |
| fitToWidth / fitToHeight | **not written** → OOXML defaults `1` / `1` (one page total) | sheet2 `pageSetup` |
| Margins (inches) | `left="0.236220472440945" right="0.236220472440945" top="0.748031496062992" bottom="0.748031496062992" header="0" footer="0"` (= 6 mm / 19 mm) | sheet2 `pageMargins` |
| Centering | **none** — no `<printOptions>` element at all, so `centerHorizontally` / `centerVertically` are both default `false`, and print gridlines / headings are off | sheet2 (element absent) |
| `showGridLines` | `0` | sheet2 `sheetView` |
| Freeze panes | **none** — no `<pane>` element | sheet2 `sheetView` |
| `topLeftCell` | reference has `topLeftCell="A11"`; we emit **`A1`** (see DEVIATIONS D-6) | sheet2 `sheetView` |
| `tabSelected` | reference `1` (workbook `activeTab="1"`); we emit only if this is our active tab | sheet2 `sheetView` |
| `sheetFormatPr` | `defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"` | sheet2 |
| Header/footer | reference has `<oddFooter>` with another company's legal notice — **never emit** (D-1) | sheet2 `headerFooter` |
| `dimension` | reference `A1:AA1000`; we emit `A1:Z46` | sheet2 |

Exact XML preamble our writer should emit:

```xml
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><tabColor rgb="FF95B3D7"/><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:Z46"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"/>
  <cols>
    <col min="1"  max="18" width="13.3839285714286" customWidth="1"/>
    <col min="19" max="26" width="12.1339285714286" customWidth="1"/>
  </cols>
  <sheetData>…</sheetData>
  <mergeCells count="20">…</mergeCells>
  <pageMargins left="0.236220472440945" right="0.236220472440945"
               top="0.748031496062992" bottom="0.748031496062992" header="0" footer="0"/>
  <pageSetup paperSize="9" orientation="portrait"/>
  <drawing r:id="rId1"/>
</worksheet>
```

---

## 2. Column table

Only two `<col>` runs exist. Everything is one of two widths.

| Letters | `width` attr | Rendered px | Role |
| --- | --- | --- | --- |
| A–I | `13.3839285714286` | 94 each → **846 px** | **Outer Construction** board well (9 columns) |
| J–R | `13.3839285714286` | 94 each → **846 px** | **Inner Construction** board well (9 columns) |
| S–V | `12.1339285714286` | 85 each → **340 px** | Additional Information — left sub-box column pair |
| W–Z | `12.1339285714286` | 85 each → **340 px** | Additional Information — right sub-box column pair |
| AA+ | none (default `12.6339285714286`, 88 px) | — | Reference has a styled-empty apron in AA26:AA46. **Dropped** (D-2) |

Total printed content width A–Z = `18×94 + 8×85` = **2372 px**.

---

## 3. Row-by-row map

### 3.0 Style ids used below

The reference's own `cellXfs` indices are quoted as `ref s=NNN` so the reading
can be re-verified. Our writer needs these **12 new xfs** (names are proposals
for `src/render/export-xlsx.js`; add them at the END of `cellXfs` so existing
`SPEC_XF` indices do not shift). All borders are colour `FF000000`.

| Our name | ref `s=` | Font | Fill (ARGB) | Borders | Alignment |
| --- | --- | --- | --- | --- | --- |
| `cdTitle` | 136 | Calibri 18 **bold**, colour `theme1` | solid `FFCCCCCC` | left `medium`, top `medium`, bottom `thin` | h=center, v=center |
| `cdTitleFill` | 28 | Arial 10 | none | top `medium`, bottom `thin` | default |
| `cdTitleEnd` | 29 | Arial 10 | none | right `medium`, top `medium`, bottom `thin` | default |
| `cdCapOuter` | 137 | Calibri 14 **bold**, `theme1` | solid `FFD9EAD3` | left `medium`, top `thin`, bottom `thin` | h=center, v=center |
| `cdCapInner` | 139 | Calibri 14 **bold**, `theme1` | solid `FFC9DAF8` | left `thin`, top `thin`, bottom `thin` | h=center, v=center |
| `cdCapAddl` | 140 | Calibri 14 **bold**, `theme1` | solid `FFFFF2CC` | left `thin`, top `thin` (**no bottom**) | h=center, v=center |
| `cdCapFill` | 15 | Arial 10 | none | top `thin`, bottom `thin` | default |
| `cdCapFillEndThin` | 138 | Arial 10 | none | right `thin`, top `thin`, bottom `thin` | default |
| `cdCapAddlFill` | 19 | Arial 10 | none | top `thin` | default |
| `cdCapAddlEnd` | 141 | Arial 10 | none | right `medium`, top `thin` | default |
| `cdBoxTopMedL` | 144 / 148 | Arial 10, `theme1` | none | left `medium`, top `medium` | v=center (144 also h=center) |
| `cdBoxTopMed` | 61 | Arial 10 | none | top `medium` | default |
| `cdBoxTopMedR` | 66 | Arial 10 | none | right `medium`, top `medium` | default |
| `cdBoxTopThinL_med` | 142 | Calibri 10, `theme1` | none | left `medium`, top `thin` | v=center |
| `cdBoxTopThinL_thin` | 143 | Calibri 10, `theme1` | none | left `thin`, top `thin` | h=center, v=center |
| `cdBoxTopThinR` | 64 | Arial 10 | none | right `thin`, top `thin` | default |
| `cdSideMedL` | 145 | Arial 10 | none | left `medium` | default |
| `cdSideThinL` | 146 | Arial 10 | none | left `thin` | default |
| `cdSideThinR` | 78 | Arial 10 | none | right `thin` | default |
| `cdSideMedR` | 147 | Arial 10 | none | right `medium` | default |
| `cdBotMedL` | 133 | Arial 10 | none | left `medium`, bottom `medium` | default |
| `cdBotMed` | 69 | Arial 10 | none | bottom `medium` | default |
| `cdBotMedR` | 70 | Arial 10 | none | right `medium`, bottom `medium` | default |
| `cdBotThinR` | 149 | Arial 10 | none | right `thin`, bottom `medium` | default |
| `cdBotThinL` | 150 | Arial 10 | none | left `thin`, bottom `medium` | default |

No cell on this sheet carries a `numFmt` other than builtin `0`, and no cell
carries `wrapText`. Every populated cell is `t="inlineStr"` for us (the
reference uses `sharedStrings`; either is readable-equivalent).

`theme1` in the reference resolves to black — emit `<color rgb="FF000000"/>`.

### 3.1 LACE block — rows 1–23

| Row | Height | Cell(s) | Content | Style | Merge |
| --- | --- | --- | --- | --- | --- |
| **1** | `35.25` pt (47 px) | `A1` | literal `Technical Detail Sheet - Lace version` (verbatim: lower-case `version`) | `cdTitle` | `A1:Z1` |
| | | `B1`–`Y1` | blank | `cdTitleFill` | `A1:Z1` |
| | | `Z1` | blank | `cdTitleEnd` | `A1:Z1` |
| **2** | `22.5` pt (30 px) | `A2` | literal `Outer Construction` | `cdCapOuter` | `A2:I2` |
| | | `B2`–`H2` | blank | `cdCapFill` | `A2:I2` |
| | | `I2` | blank | `cdCapFillEndThin` | `A2:I2` |
| | | `J2` | literal `Inner Construction` | `cdCapInner` | `J2:R2` |
| | | `K2`–`Q2` | blank | `cdCapFill` | `J2:R2` |
| | | `R2` | blank | `cdCapFillEndThin` | `J2:R2` |
| | | `S2` | literal `Additional Information / Inspirational Images` (reference has a **trailing space**; dropped — D-3) | `cdCapAddl` | `S2:Z2` |
| | | `T2`–`Y2` | blank | `cdCapAddlFill` | `S2:Z2` |
| | | `Z2` | blank | `cdCapAddlEnd` | `S2:Z2` |
| **3** | `22.5` pt | `A3` | reference holds `√` here; **we emit blank** (file residue — D-4) | `cdBoxTopThinL_med` | `A3:I23` |
| | | `B3`–`H3` | blank | `cdCapAddlFill` (`s=19`, top thin) | `A3:I23` |
| | | `I3` | blank | `cdBoxTopThinR` | `A3:I23` |
| | | `J3` | blank | `cdBoxTopThinL_thin` | `J3:R23` |
| | | `K3`–`Q3` | blank | `cdCapAddlFill` | `J3:R23` |
| | | `R3` | blank | `cdBoxTopThinR` | `J3:R23` |
| | | `S3` | blank | `cdBoxTopMedL` (ref `s=144`) | `S3:V13` |
| | | `T3`,`U3` | blank | `cdBoxTopMed` | `S3:V13` |
| | | `V3` | blank | `cdBoxTopMedR` | `S3:V13` |
| | | `W3` | blank | `cdBoxTopMedL` (ref `s=144`) | `W3:Z13` |
| | | `X3`,`Y3` | blank | `cdBoxTopMed` | `W3:Z13` |
| | | `Z3` | blank | `cdBoxTopMedR` | `W3:Z13` |
| **4–12** | `22.5` pt each | `A{r}` | blank | `cdSideMedL` | `A3:I23` |
| | | `I{r}` | blank | `cdSideThinR` | `A3:I23` |
| | | `J{r}` | blank | `cdSideThinL` | `J3:R23` |
| | | `R{r}` | blank | `cdSideThinR` | `J3:R23` |
| | | `S{r}` | blank | `cdSideMedL` | `S3:V13` |
| | | `V{r}` | blank | `cdSideMedR` | `S3:V13` |
| | | `W{r}` | blank | `cdSideMedL` | `W3:Z13` |
| | | `Z{r}` | blank | `cdSideMedR` | `W3:Z13` |
| | | `B..H`, `K..Q`, `T,U`, `X,Y` | **no `<c>` record at all** | — | — |
| **13** | `22.5` pt | `A13`,`I13`,`J13`,`R13` | blank | as rows 4–12 (`cdSideMedL`,`cdSideThinR`,`cdSideThinL`,`cdSideThinR`) | `A3:I23`, `J3:R23` |
| | | `S13` | blank | `cdBotMedL` | `S3:V13` (bottom edge) |
| | | `T13`,`U13` | blank | `cdBotMed` | `S3:V13` |
| | | `V13` | blank | `cdBotMedR` | `S3:V13` |
| | | `W13` | blank | `cdBotMedL` | `W3:Z13` |
| | | `X13`,`Y13` | blank | `cdBotMed` | `W3:Z13` |
| | | `Z13` | blank | `cdBotMedR` | `W3:Z13` |
| **14** | `22.5` pt | `A14`,`I14`,`J14`,`R14` | blank | as rows 4–12 | `A3:I23`, `J3:R23` |
| | | `S14` | blank | `cdBoxTopMedL` (ref `s=148` — same borders as `s=144`, alignment is v=center only) | `S14:V23` |
| | | `T14`,`U14` | blank | `cdBoxTopMed` | `S14:V23` |
| | | `V14` | blank | `cdBoxTopMedR` | `S14:V23` |
| | | `W14` | blank | `cdBoxTopMedL` (ref `s=148`) | `W14:Z23` |
| | | `X14`,`Y14` | blank | `cdBoxTopMed` | `W14:Z23` |
| | | `Z14` | blank | `cdBoxTopMedR` | `W14:Z23` |
| **15–22** | `22.5` pt each | identical to rows 4–12 | blank | same | `A3:I23`, `J3:R23`, `S14:V23`, `W14:Z23` |
| **23** | `22.5` pt | `A23` | blank | `cdBotMedL` | `A3:I23` (bottom) |
| | | `B23`–`H23` | blank | `cdBotMed` | `A3:I23` |
| | | `I23` | blank | `cdBotThinR` | `A3:I23` |
| | | `J23` | blank | `cdBotThinL` | `J3:R23` |
| | | `K23`–`Q23` | blank | `cdBotMed` | `J3:R23` |
| | | `R23` | blank | `cdBotThinR` | `J3:R23` |
| | | `S23` | blank | `cdBotMedL` | `S14:V23` |
| | | `T23`,`U23` | blank | `cdBotMed` | `S14:V23` |
| | | `V23` | blank | `cdBotMedR` | `S14:V23` |
| | | `W23` | blank | `cdBotMedL` | `W14:Z23` |
| | | `X23`,`Y23` | blank | `cdBotMed` | `W14:Z23` |
| | | `Z23` | blank | `cdBotMedR` | `W14:Z23` |

### 3.2 SOLID block — rows 24–46

Byte-for-byte the same style pattern, offset by **+23 rows**, with two
differences: the title text, and the absence of the `√`.

| Row | Height | Cell(s) | Content | Style | Merge |
| --- | --- | --- | --- | --- | --- |
| **24** | `35.25` pt (47 px) | `A24` | literal `Technical Detail Sheet - Solid Version` (verbatim: capital `Version` — the reference is inconsistent with row 1 and we reproduce both spellings) | `cdTitle` | `A24:Z24` |
| | | `B24`–`Y24` / `Z24` | blank | `cdTitleFill` / `cdTitleEnd` | `A24:Z24` |
| **25** | `22.5` pt | `A25` / `J25` / `S25` | `Outer Construction` / `Inner Construction` / `Additional Information / Inspirational Images` | `cdCapOuter` / `cdCapInner` / `cdCapAddl` | `A25:I25`, `J25:R25`, `S25:Z25` |
| | | `B25`–`H25`, `K25`–`Q25` | blank | `cdCapFill` | " |
| | | `I25`, `R25` | blank | `cdCapFillEndThin` | " |
| | | `T25`–`Y25` | blank | `cdCapAddlFill` | `S25:Z25` |
| | | `Z25` | blank | `cdCapAddlEnd` | `S25:Z25` |
| **26** | `22.5` pt | mirror of row 3, **`A26` blank** | blank | same ids as row 3 | `A26:I46`, `J26:R46`, `S26:V36`, `W26:Z36` |
| **27–35** | `22.5` pt each | mirror of rows 4–12 | blank | same | " |
| **36** | `22.5` pt | mirror of row 13 (top sub-box bottom edge) | blank | same | `S26:V36`, `W26:Z36` |
| **37** | `22.5` pt | mirror of row 14 (bottom sub-box top edge) | blank | same | `S37:V46`, `W37:Z46` |
| **38–45** | `22.5` pt each | mirror of rows 15–22 | blank | same | " |
| **46** | `22.5` pt | mirror of row 23 | blank | same | `A26:I46`, `J26:R46`, `S37:V46`, `W37:Z46` |

**Rows 47+**: the reference carries 954 more `<row ht="13.5" customHeight="1">`
records with styled-empty cells (`s=62`) and nothing else. **Not emitted**
(D-2).

### 3.3 Where the two title strings come from

There is **no state source** for either title. Emit as factory boilerplate,
parameterised only by the variant key from `CC_SHEETS`:

```js
const CD_TITLE = { lace: 'Technical Detail Sheet - Lace version',
                   solid: 'Technical Detail Sheet - Solid Version' };
```

Same for the three caption strings — constants, not state:

```js
const CD_CAPTIONS = ['Outer Construction', 'Inner Construction',
                     'Additional Information / Inspirational Images'];
```

`state.construction.rows[].area` / `.detail` and
`state.construction.callouts[]` never reach a **cell** on this sheet. They are
drawn *inside* the board PNGs by `ccDrawCallout` (leader lines + numbered pins
+ label text). That matches the reference exactly: its boards are flattened
annotated bitmaps with no cell-level note table.

---

## 4. Merge list

20 merges, verbatim from `sheet2.xml` `<mergeCells count="20">`:

```
A1:Z1      A2:I2     J2:R2     S2:Z2
A3:I23     J3:R23    S3:V13    W3:Z13    S14:V23   W14:Z23
A24:Z24    A25:I25   J25:R25   S25:Z25
A26:I46    J26:R46   S26:V36   W26:Z36   S37:V46   W37:Z46
```

Emit in the reference's own order (title/caption merges first per block, then
the boards) — order is not semantically meaningful but keeping it makes diffs
against the reference trivial.

Well geometry that falls out of the merges + column widths + 22.5 pt rows:

| Merge | Columns | Rows | Pixel well |
| --- | --- | --- | --- |
| `A3:I23` / `A26:I46` | 9 × 94 | 21 × 30 | 846 × 630 |
| `J3:R23` / `J26:R46` | 9 × 94 | 21 × 30 | 846 × 630 |
| `S3:V13` / `S26:V36` | 4 × 85 | 11 × 30 | 340 × 330 |
| `W3:Z13` / `W26:Z36` | 4 × 85 | 11 × 30 | 340 × 330 |
| `S14:V23` / `S37:V46` | 4 × 85 | 10 × 30 | 340 × 300 |
| `W14:Z23` / `W37:Z46` | 4 × 85 | 10 × 30 | 340 × 300 |

---

## 5. Image table

### 5.1 What the reference actually has (16 anchors, 9 media parts)

All 16 are `<xdr:oneCellAnchor>` with an explicit `<xdr:ext>`; none is
`twoCellAnchor`; `picLocks noChangeAspect="1"` on every one. Note the reference's
`<xdr:cNvPr name="…">` values are **stale** (e.g. the anchor named
`image7.png` embeds `rId1` → `xl/media/image3.png`) — dropped residue.

| # | rId → media | Natural px | Anchor cell | colOff px | rowOff px | Display px | Aspect kept? | What it is |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | rId9 → `image11.png` | 1411 × 627 | `A6` | 20.2 | 24.3 | 862.1 × 360.7 | no (2.250 → 2.390) | LACE **outer** board: annotated front+back flats, EN+CN callouts, 3 photo insets |
| 13 | rId8 → `image10.png` | 1322 × 433 | `J7` | 12.5 | 11.5 | 868.5 × 340.9 | no (3.053 → 2.548) | LACE **inner** board (same bytes as #14) |
| 3 | rId4 → `image6.png` | 513 × 532 | `S3` | 29.3 | 6.9 | 297.8 × 317.9 | no (0.964 → 0.937) | `LEFT SIDESEAM OPENING 左侧缝开口。` detail |
| 4 | rId5 → `image7.png` | 434 × 354 | `W3` | 1.7 | 17.9 | 355.0 × 288.0 | ~yes (1.226 → 1.233) | `SIDESEAM 侧缝。` outer/inner cross-section |
| 5 | rId6 → `image8.png` | 590 × 528 | `S14` | 44.0 | 9.0 | 302.0 × 270.0 | yes (1.117 → 1.119) | `RIGHT SIDESEAM OPENING 右侧缝开口。` detail |
| 2 | rId3 → `image5.png` | 628 × 192 | `X14` | 37.0 | 9.0 | 102.0 × 30.0 | ~yes (3.271 → 3.400) | red word-art label `STRAP` |
| 0 | rId1 → `image3.png` | 926 × 1314 | `W15` | 34.0 | 27.0 | 151.0 × 213.0 | yes (0.705 → 0.709) | strap reference photo (2-up) |
| 1 | rId2 → `image4.png` | 1478 × 1226 | `Y17` | 10.0 | 17.0 | 151.0 × 128.0 | ~yes (1.206 → 1.180) | strap reference photo (close-up) |
| 6 | rId7 → `image9.png` | 1414 × 612 | `A30` | 1.3 | 11.4 | 875.2 × 377.5 | yes (2.311 → 2.318) | SOLID **outer** board |
| 14 | rId8 → `image10.png` | 1322 × 433 | `J30` | 11.9 | 25.3 | 876.1 × 297.6 | no (3.053 → 2.944) | SOLID **inner** board (same bytes as #13) |
| 7 | rId4 → `image6.png` | 513 × 532 | `S26` | 36.0 | 8.0 | 297.7 × 308.8 | yes (0.964 → 0.964) | shared with #3 |
| 8 | rId5 → `image7.png` | 434 × 354 | `W27` | 19.0 | 0.2 | 335.5 × 275.7 | ~yes (1.226 → 1.217) | shared with #4 |
| 9 | rId6 → `image8.png` | 590 × 528 | `S37` | 44.0 | 9.0 | 302.0 × 270.0 | yes | shared with #5 |
| 12 | rId3 → `image5.png` | 628 × 192 | `X37` | 37.0 | 9.0 | 102.0 × 30.0 | ~yes | shared with #2 |
| 11 | rId1 → `image3.png` | 926 × 1314 | `W38` | 34.0 | 27.0 | 151.0 × 213.0 | yes | shared with #0 |
| 10 | rId2 → `image4.png` | 1478 × 1226 | `Y40` | 10.0 | 17.0 | 151.0 × 128.0 | ~yes | shared with #1 |

**Does the reference share artwork between the two blocks?** Yes, partially.
All six Additional-Information images are the *same media parts* in both
blocks, and so is the **Inner** board (`image10.png`, one part, two anchors).
Only the **Outer** board differs (`image11.png` for LACE, `image9.png` for
SOLID) — that is the only place the lace overlay is actually visible.

**Should we share?** Split answer:

- **Additional Information sub-boxes: share.** They are variant-independent
  construction references (sideseam opening, sideseam cross-section, strap).
  One media part, two anchors — halves the workbook size.
- **Inner board: do NOT share.** `state.construction.images.lace.inner` and
  `.solid.inner` are independent arrays with independent callouts. Sharing
  would silently discard whichever variant's inner annotations the TD entered
  second. Render per variant, then **dedupe by PNG byte identity** in the
  packer so an identical result still ships one media part. (D-7)

### 5.2 What we emit

Add a per-board render to `src/ui/construction.js` — the existing
`ccRenderSheetToCanvas(sheet, cssW, cssH, scale)` flattens **both** panels
side-by-side into one canvas, plus a `#eef0f4` page background, a white panel
frame, and a 30 px `OUTER` / `INNER` header strip. All four of those are wrong
for a merged cell well that already supplies the frame and the caption.

```js
// src/ui/construction.js — new sibling of ccRenderSheetToCanvas.
// Draws ONE view of ONE sheet: its images + its callouts, on white, with no
// panel chrome, no page background, no header strip, no selection highlight.
// Restores the module view state in finally() for the same reason
// ccRenderSheetToCanvas does (ccPanelLayouts / ccBoxCache are live hit-test
// caches; leaving them swapped mis-hits the next click).
function ccRenderBoardToCanvas(sheet, view, cssWidth, cssHeight, pixelScale) { … }
```

Reuse `ccBuildPanelLayout`'s fit maths (`scale = min(content.w/bounds.w,
content.h/bounds.h, 2)` over `ccImageBounds(sheet, view)`) with
`content = {x:0, y:0, width:cssWidth, height:cssHeight}` so the images are
letterboxed and centred inside the canvas. Because the canvas CSS size then
**equals** the display size, aspect is preserved by construction and the writer
never has to compute a fit rectangle.

Then `buildConstructionDetailSheetPart()` emits 4 images:

| # | Render call | Anchor cell | colOff px | rowOff px | Display px | Aspect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ccRenderBoardToCanvas('lace','outer', 834, 618, 2)` | `A3` | 6 | 6 | 834 × 618 | preserved (letterboxed in canvas) |
| 2 | `ccRenderBoardToCanvas('lace','inner', 834, 618, 2)` | `J3` | 6 | 6 | 834 × 618 | preserved |
| 3 | `ccRenderBoardToCanvas('solid','outer', 834, 618, 2)` | `A26` | 6 | 6 | 834 × 618 | preserved |
| 4 | `ccRenderBoardToCanvas('solid','inner', 834, 618, 2)` | `J26` | 6 | 6 | 834 × 618 | preserved |

`834 × 618` = the 846 × 630 well inset by 6 px on every side, so the medium
box border stays visible. `pixelScale 2` keeps callout text legible at print
scale (the reference's own boards are ~1.6× oversampled). Skip an anchor
entirely when `ccImages(sheet, view).length === 0` — do **not** emit the
"Paste, drop, or add images" placeholder that `ccDrawCanvasInto` draws for the
live board.

The four **Additional Information** sub-boxes get **no image** — see DATA GAP
G-1. Their merges, borders and the caption still print, so the sheet reads as
"these four reference boxes are empty" rather than losing the layout.

`buildTechPackDrawingXml` already emits `oneCellAnchor` + explicit EMU
`<xdr:ext>` + `noChangeAspect` and needs only two additions: `colOff` /
`rowOff` (currently hard-coded to `0`) and byte-identity dedupe so a shared
part maps two anchors to one `rId`.

---

## 6. DATA GAP list

| # | Reference element | Our state | Recommendation |
| --- | --- | --- | --- |
| **G-1** | The whole **Additional Information / Inspirational Images** column — four sub-boxes (`S3:V13`, `W3:Z13`, `S14:V23`, `W14:Z23` and the SOLID mirrors) holding sideseam-opening details, a sideseam cross-section, a `STRAP` word-art label and two strap photos | **Nothing.** `CC_VIEWS = ['outer','inner']` only. `state.construction.images` has exactly two view buckets per sheet. There is no third board, no sub-box concept, no inspiration-image slot | **Add state.** Smallest change that keeps the layout honest: extend `CC_VIEWS` to `['outer','inner','addl']` and give `addl` **four ordered slots** (`state.construction.images[sheet].addl[0..3]`), each rendering into one sub-box well. Until then the boxes print empty (borders + caption only) — do not fake them and do not collapse the merges, because the factory expects the four wells to exist |
| **G-2** | The `√` in `A3` | No source | **Drop** — already agreed file residue (D-4) |
| **G-3** | Title strings `Technical Detail Sheet - Lace version` / `- Solid Version` | No `state` field; `state.styleId` and `state.mainPage.fields` hold the style, not the sheet title | **Hard-code as factory boilerplate**, keyed by the `CC_SHEETS` variant (`CD_TITLE` above). Do not splice `state.styleId` in — the reference title carries no style identity and MAIN PAGE already owns that |
| **G-4** | Caption strings (3 per block) | No source | **Hard-code as factory boilerplate** (`CD_CAPTIONS`) |
| **G-5** | The reference outer board shows a **lace-textured** cup for LACE and a plain cup for SOLID — i.e. the two variants use genuinely different artwork | Our state supports this (`images.lace.outer` vs `images.solid.outer` are separate arrays) but nothing **enforces** it; a TD can leave one empty | **No state change.** Render whatever each bucket holds; an empty bucket yields no image (the well prints empty). Enforcing "both variants must have an outer board" is an export-readiness gate, out of scope for the cell map |
| **G-6** | Bilingual EN + 中文 callout text inside every board bitmap | `state.construction.rows[].detail` is a single free-text field; `CONSTRUCTION_PHRASES` is built from `CONSTRUCTION_STARTER_PHRASES` / `CONSTRUCTION_TERM_LIBRARY` (`.en`) / `CONSTRUCTION_GENERATED_PHRASES` — the term library **has** a Chinese side but `ccDrawCallout` renders only `row.detail` | **Add state later, not here.** Note it: our boards will print English-only. This is a real readability gap for the factory but it is a construction-page feature (a `detailCn` field + a two-line `ccDrawCallout`), not an exporter change. Flag for a follow-up story |
| **G-7** | Reference `<oddFooter>` document-control string | n/a | **Never emit** — another company's legal notice (D-1) |
| **G-8** | Conditional-formatting rule `notContainsBlanks` on `A2 A25:I25`, `dxfId 0` = solid `FFB7E1CD` | n/a | **Drop the rule** (D-5) |

---

## 7. DEVIATIONS

| # | Reference | We emit | Reason |
| --- | --- | --- | --- |
| **D-1** | `<headerFooter><oddFooter>&C00-049This document is the property of B Pty Ltd and not for unauthorised reproduction or distribution.</oddFooter></headerFooter>` | No `<headerFooter>` element | Another company's legal notice. Never emit under any framing (confirmed decision 1) |
| **D-2** | 1000 `<row>` records; rows 47–1000 are `ht="13.5" customHeight="1"` with styled-empty cells (`s=62`), plus a styled-empty apron in `AA26:AA46` (`s=151`/`s=13`) | Rows 1–46 only, columns A–Z only, `dimension ref="A1:Z46"` | Invisible authoring residue; costs ~40 KB and adds nothing readable. Confirmed decision 1 |
| **D-3** | `S2` / `S25` = `Additional Information / Inspirational Images ` (trailing space, `xml:space="preserve"`) | Same string with the trailing space removed | Trailing-space residue, confirmed decision 1. The cell is centre-aligned so the space is invisible anyway |
| **D-4** | `A3` = `√` | blank | Explicitly named residue in confirmed decision 1 ("the stray 'v' tick in construction A3"). Note it exists only in the LACE block — `A26` is already blank in the reference, so dropping it also makes the two blocks symmetric |
| **D-5** | `<conditionalFormatting sqref="A2 A25:I25"><cfRule type="notContainsBlanks" dxfId="0" priority="1"><formula>LEN(TRIM(A2))&gt;0</formula></cfRule></conditionalFormatting>`, where `dxfId 0` is a solid `FFB7E1CD` fill. Because `A2` and `A25` are non-blank, the rule fires and those two cells actually **print saturated green `FFB7E1CD`**, not the `FFD9EAD3` in their base style | No CF rule; `A2` / `A25` carry their static base fill `FFD9EAD3` | The three caption fills are a deliberate palette — pale green `FFD9EAD3` / pale blue `FFC9DAF8` / pale cream `FFFFF2CC`. The CF override hits only the *Outer* caption and breaks that palette; it is a template checklist leftover, not design intent. **This is the one visible-colour deviation in the map** — flag it to the TD; reverting is a one-line change (`cdCapOuter` fill → `FFB7E1CD`) |
| **D-6** | `sheetView topLeftCell="A11" tabSelected="1"` | `topLeftCell` omitted (opens at `A1`); `tabSelected` only if this is the workbook's active tab | `A11` is a saved scroll position — it makes the sheet open mid-LACE-block with the title bar off-screen. Scroll state is not layout |
| **D-7** | Inner board is ONE media part anchored twice (`image10.png` in both blocks); the six Additional-Information parts are likewise shared | Additional-Information parts shared (once G-1 lands); **Inner board rendered per variant**, with a byte-identity dedupe in the packer that collapses them to one part when the pixels really are identical | `state.construction.images.lace.inner` and `.solid.inner` are independent buckets with independent callouts. Hard-sharing would drop one variant's inner annotations. Dedupe gives the reference's file-size benefit without the data loss |
| **D-8** | Two sheets' worth of content in one sheet, both blocks on **one** A4 portrait fit-to-page | Same page setup, reproduced verbatim | Confirmed decision 1 lists page setup as a parity target. **Observation for the TD, not changed here:** A–Z is 2372 px wide, so A4 portrait fit-to-one-page renders 10 pt text at roughly 3 pt. The reference is effectively a screen document that nobody prints from Excel. If the TD wants a printable version the change is `orientation="landscape"` + `fitToWidth="1" fitToHeight="0"` + a `rowBreaks` entry before row 24 — one page per variant. Not applied without a decision |
| **D-9** | Picture `cNvPr name` values are stale (`name="image7.png"` embedding `image3.png`, etc.) | Stable generated names, e.g. `CONSTRUCTION LACE OUTER` | Named residue in confirmed decision 1. Meaningful names also make the drawing part reviewable |
| **D-10** | Reference display sizes distort aspect by up to 17 % (inner board 3.053 → 2.548) | Aspect always preserved: the canvas CSS size equals the display size and images are letterboxed inside it | Hand-dragged sizing in the source file; distorting a technical flat is a defect, not a layout intent. `picLocks noChangeAspect="1"` is already on every reference anchor, which shows the distortion was accidental |
| **D-11** | Sheet content is `t="s"` (sharedStrings) | `t="inlineStr"` | Matches the existing writer (`specInlineStrCell`); readable-equivalent, and this sheet has only 6 distinct strings so sharedStrings buys nothing |
| **D-12** | Two sibling xfs differ only in alignment for empty cells: `s=144` (h=center, v=center) on `S3`/`W3` vs `s=148` (v=center) on `S14`/`W14` | One style, `cdBoxTopMedL`, with h=center + v=center | The cells are permanently empty (they anchor image-only merges), so the alignment is unobservable. Collapsing saves an xf |
| **D-13** | Sheet name in our current exporter is two sheets, `CONSTRUCTION-SOLID` and `CONSTRUCTION-LACE` (`TECHPACK_SHEET_NAMES` in `src/render/export-xlsx.js`) | One sheet, `CONSTRUCTION DETAIL` | Confirmed decision 2. Also drop the two `PV_SHEETS` entries `construction-solid` / `construction-lace` in `src/ui/preview-page.js` in favour of one `construction` preview page whose paper shows both blocks |

---

## 8. Implementation checklist

1. `src/ui/construction.js` — add `ccRenderBoardToCanvas(sheet, view, cssW, cssH, scale)`
   (§5.2). Keep `ccRenderSheetToCanvas` for the live-board/preview path.
2. `src/render/export-xlsx.js`
   - `TECHPACK_SHEET_NAMES`: replace the two construction keys with
     `'construction': 'CONSTRUCTION DETAIL'`.
   - `buildSpecStylesXml`: append the fills `FFCCCCCC`, `FFD9EAD3`, `FFC9DAF8`,
     `FFFFF2CC`; the borders in §3.0; the fonts Calibri 18 bold, Calibri 14
     bold, Calibri 10, Arial 10; and the 24 xfs. Append only — do not
     renumber, `SPEC_XF` indices are load-bearing for the POM sheet.
   - `buildTechPackSheetXml`: add optional `sheetPr` (tabColor + fitToPage),
     `sheetView` attrs (`showGridLines`), a `<cols>` run form (`min`/`max`
     ranges, not one `<col>` per column), a merge list, `pageMargins` and
     `pageSetup`. Guard the additions so the MAIN PAGE / BOM / POM callers are
     unchanged.
   - `buildTechPackDrawingXml`: honour `colOff` / `rowOff` and dedupe images by
     byte identity.
   - Replace `buildConstructionSheetPart` with
     `buildConstructionDetailSheetPart()` emitting the §3 rows, §4 merges and
     §5.2 images.
3. `src/ui/preview-page.js` — one `construction` sheet entry (D-13).
4. `npm run build` → `npm run check` → `npm run preview-check`,
   `npm run construction-check`, `npm run export-xlsx`, `npm run export-hidden`.
