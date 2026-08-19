# Cell map — `BOM-SOLID`

US-081 factory workbook format. Implementation target: our hand-written OOXML
writer (`src/render/export-xlsx.js`, tech-pack workbook path).

Reference: `3916.KiraForm vA 1.0 17.05.2025(1).xlsx`, sheet `BOM-SOLID`
(`xl/worksheets/sheet4.xml`, `xl/drawings/drawing4.xml`, sheetId 4 of 5).

**Read [`bom-lace.md`](bom-lace.md) first.** This map is a *delta*. Everything
not contradicted here — column grid, style tokens, border scheme, colorway
cell composition, banner well geometry, photo fitting, page setup — is defined
in the lace map and reproduced here byte-for-byte by the same code path. The
two sheets are emitted by **one** builder, `buildBomSheetPart(key)`, with
`variant = 'solid' | 'lace'` as its only input difference.

---

## 0. Executive delta

Reference `BOM-SOLID` differs from reference ` BOM-LACE` in exactly **five**
substantive ways, and in four ways that are file residue:

| # | Difference | Reproduce? |
| --- | --- | --- |
| D1 | MAIN BODY FABRICS block has **3** data rows (7–9), not 4 (7–10). The lace sheet's 4th fabric row — `A10='4'`, `B10='Galloon lace'`, `D10='BR-GL-KT-NL-M-150-DX-I/7'`, `F10='ALL'`, `G10='Cup panel'` — is absent. | **Yes**, and for free: `bmVisibleRows('SOLID')` drops `scope:'LACE'` rows. |
| D2 | Every row from the TRIMS band down sits **one row higher**: band at `A10` (lace `A11`), header at row 11 (lace 12), trim data rows 12–21 (lace 13–22). Last content row 21 (lace 22). | **Yes** — a consequence of D1, not a separate rule. Row numbers are computed, never literal. |
| D3 | Trim numbering starts one lower and the split pair moves: `4, 5.1, 5.2, 6, 7, 8, 9, 10, 11, 12` (lace: `5, 6.1, 6.2, 7 … 13`). | **Yes** — `bmNumberedRows('solid')` already produces exactly this shape (FABRIC block then TRIM block, one shared base per `groupId` with `.1`/`.2` children). |
| D4 | **One fewer material photo.** 10 material photos here vs 11 on lace; the missing one is the galloon-lace swatch at lace `H10` (89×119 px). SOLID drawing part = 14 anchors (2 text boxes + 2 banners + 10 photos); LACE = 15. | **Yes** — again a consequence of D1: no row, no photo. |
| D5 | Banner picture extents differ (solid sketch vs lace sketch renders): `A2` 995.4×428.5 px / `I2` 987.3×317.2 px here, vs `A2` 984×388 px / `I2` 966×303 px on lace. | **N/A** — both banners are *our* render; extents are computed from our own canvas aspect, never copied. See §5. |
| R1 | Sheet name `BOM-SOLID` — no leading space (lace is `' BOM-LACE'`). | **Yes**, exact. |
| R2 | `sheetView topLeftCell="A4"` (lace `"G32"`) — wherever the author last scrolled. | **No** — dropped, `topLeftCell` omitted. |
| R3 | Backtick residue: `I12='\`'` (lace `I13`). | **No** — dropped (confirmed decision 1). |
| R4 | Styled-empty apron: row heights written to row 218 (lace 219), `dimension ref="A1:S1000"`. | **No** — dropped. |

### Three "differences" I was asked to map that are **not** differences

I checked each against ` BOM-LACE` cell by cell. Reporting the negative result
rather than inventing a delta:

1. **The yellow COL 5 column is shared, not solid-only.** `N6` and `N11` (the
   two `'COL 5'` headers) carry `fill=FFFFFF00` *and* so does every data cell
   `N7:N21`. ` BOM-LACE` is identical: `N6`, `N12`, and `N7:N22` are all
   `FFFFFF00`. It belongs in the lace map's colorway-fill rule, not here. Our
   handling (drop it — no state source) is DEV-9 below and must match lace.
2. **The second material-photo slot is shared, not solid-only.** Two rows carry
   two photos each: row 15 `Ready-made soft stretch tape` (292×50 px + 291×88 px)
   and row 20 `V-fold elastic` (284×100 px + 292×114 px). ` BOM-LACE` has the
   same two materials doubled, at its rows 16 and 21. Our single-`row.photo`
   model skips the second slot on **both** sheets (DEV-7).
3. **Article codes typed into the image column are shared, not solid-only.**
   `H7='BR-FB-KT-NL-H-200-XG-I/7'` (Arial 11) and
   `H9='BR-MM-KT-NL-H-180-F012-I/1'` (Arial 10) — instead of a swatch. Lace
   `H7`/`H9` hold the identical two strings. We skip both (DEV-8).

---

## 1. Sheet identity

Identical to ` BOM-LACE` in every field below except the name. Reproduce as read.

| Property | Value | Source |
| --- | --- | --- |
| Sheet name | `BOM-SOLID` | `xl/workbook.xml` `<sheet name="BOM-SOLID" sheetId="4"/>`. No leading space. Position 4 of 5, after `CONSTRUCTION DETAIL` and ` BOM-LACE`, before `PROTO Direction`. |
| Tab colour | `FFB8CCE4` | `<sheetPr><tabColor rgb="FFB8CCE4"/>` — same as lace. |
| `showGridLines` | `0` | `<sheetView showGridLines="0" …>` |
| Freeze / split | **none** — no `<pane>` element | `sheetViews` holds only `sheetView` + `selection`. |
| `topLeftCell` | reference `"A4"` → **omit** (deviation DEV-5) | |
| `sheetFormatPr` | `defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"` | verbatim |
| Paper | `paperSize="9"` (A4) | `<pageSetup paperSize="9" orientation="portrait"/>` |
| Orientation | `portrait` | |
| Scale | **no `scale` attribute** | absent from `pageSetup`; do not emit one. |
| `fitToPage` | `<pageSetUpPr fitToPage="1"/>` inside `sheetPr` | `fitToWidth`/`fitToHeight` are absent from `pageSetup`, so Excel's default of `1`/`1` applies — whole sheet crushed onto one A4 page. Emit exactly as read; do **not** add explicit `fitToWidth`/`fitToHeight`. |
| Margins (inches) | left `0.236220472440945`, right `0.236220472440945`, top `0.748031496062992`, bottom `0.748031496062992`, header `0`, footer `0` | verbatim |
| Centering | `<printOptions horizontalCentered="1"/>` — horizontal only, **no** `verticalCentered` | verbatim |
| Header/footer | `<headerFooter/>` — empty element, no `oddHeader`/`oddFooter` | Worth recording: the "B Pty Ltd" customer footer that decision 1 forbids emitting **is not on this sheet at all**. Emit the empty element or omit it. |
| `dimension` | reference `A1:S1000` → emit `A1:O{lastContentRow}` | DEV-4 |
| ListObjects / tables | none (`tableParts` absent) | |
| Conditional formatting / validation / autofilter | none | |

---

## 2. Column table

Identical to ` BOM-LACE` — same `<cols>` element, character for character.
Widths are as read; px values are `round(chars × 7 + 5)` and are given only so
§5's image offsets are checkable.

| Letter | Width (chars) | ≈ px | Role |
| --- | --- | --- | --- |
| A | `6.5` | 50 | `#` — the computed row number (`x.seq`). Unlabelled in the header rows. |
| B | `15.3839285714286` | 113 | `DESCRIPTION` |
| C | `15.3839285714286` | 113 | `SUPPLIER NAME` |
| D | `15.3839285714286` | 113 | `ARTICLE #` |
| E | `15.3839285714286` | 113 | `WIDTH` |
| F | `15.3839285714286` | 113 | `SIZE` |
| G | `15.3839285714286` | 113 | `AREA OF USE` |
| H | `36.6339285714286` | 261 | `MATERIAL IMAGES` (left half of the merged band) |
| I | `36.6339285714286` | 261 | `MATERIAL IMAGES` (right half — the reference's second photo slot, DEV-7) |
| J–O | `16.1339285714286` | 118 each | Colorway columns `COL 1` … `COL 6` |
| P–S | `9.13392857142857` | 69 each | Off-grid. Styled-empty in the reference; **not emitted** (DEV-4). |

`<cols>` to emit verbatim:

```xml
<cols><col min="1" max="1" width="6.5" customWidth="1"/><col min="2" max="7" width="15.3839285714286" customWidth="1"/><col min="8" max="9" width="36.6339285714286" customWidth="1"/><col min="10" max="15" width="16.1339285714286" customWidth="1"/></cols>
```

Cumulative x for §5: A 0–50, B 50–163, C 163–276, D 276–389, E 389–502,
F 502–615, G 615–728, **H 728–989, I 989–1250**, J 1250–1368 …
Left banner well `A:H` = 989 px. Right banner well `I:O` = 969 px.

**Dropping `TYPE / COMPOSITION` (decision 4) is what makes our letters line up
with the reference's.** With `composition` removed from the printed field list,
`['description','supplier','article','width','size','areaOfUse']` maps 1:1 onto
B→G, the photo well onto H:I, and colorway *n* onto `specColLetter(9 + n)` = J…
No offset arithmetic, no shifted merges.

---

## 3. Row-by-row

Row numbers below are **computed**, not literal — the block is dynamic. Let

```
const numbered = bmNumberedRows('solid');            // src/ui/bom.js
const fab      = numbered.filter(x => x.row.section === 'FABRIC');
const trm      = numbered.filter(x => x.row.section === 'TRIM');
const FAB0 = 7;                    // first fabric data row
const BAND2 = FAB0 + fab.length;   // TRIMS / COMPONENTS band
const HDR2  = BAND2 + 1;
const TRM0  = HDR2 + 1;            // first trim data row
const LAST  = TRM0 + trm.length - 1;
```

Reference instantiation, for the parity check: `fab.length = 3`,
`trm.length = 10` → `BAND2 = 10`, `HDR2 = 11`, `TRM0 = 12`, `LAST = 21`.
Our seeded project (`BM_SEED_ROWS`) yields `fab.length = 3` — the same 3, because
the seed's `'Allover lace'` row carries `scope:'LACE'` — and `trm.length = 8`
(6 groups, two of them `.1`/`.2` pairs).

Style tokens (`bmTitle`, `bmBanner`, `bmSection`, `bmHeader`, `bmSeq`,
`bmText`, `bmPhoto`, `bmCw`) are defined once in the lace map's style-token
table; only their *use* is tabulated here.

### Fixed prologue — rows 1–6

| Row | Height | Cell | Text / expression | Style | Merge |
| --- | --- | --- | --- | --- | --- |
| 1 | `35.2` pt | `A1` | literal `Fabric and Trim Requirement` | `bmTitle`: Calibri 18 **bold**, `FF000000`, fill `FFB7B7B7`, `horizontal=center vertical=center`, wrap off, `numFmt` General. Reference borders as read: left `medium/FF000000`, top `medium/FF000000`, **no right, no bottom** → normalized to a medium box (DEV-12). | `A1:O1` |
| 2 | `408.8` pt (545 px) | `A2` | literal `OUTSIDE VIEW` | `bmBanner`: Calibri 11 **bold**, `FF000000`, no fill, `horizontal=center vertical=top`, wrap off. Reference border: thin box `thin/FF000000` all four sides. | `A2:H3` |
| 2 | — | `I2` | literal `INSIDE VIEW` | `bmBanner`. Reference border as read: right `medium`, top `medium`, bottom `medium`, **no left** → normalized to a thin box (DEV-12). | `I2:O3` |
| 3 | `100.5` pt (134 px) | — | (both wells' continuation rows) | | |
| 4 | `35.2` pt | `A4` | literal `Bill of Materials Sheet` | `bmTitle` (identical to row 1) | `A4:O4` |
| 5 | `23.2` pt | `A5` | `BM_SECTION_BANDS.FABRIC` → `MAIN BODY FABRICS` | `bmSection`: Calibri 12 **bold**, `FF000000`, fill `FFD8D8D8`, `center`/`center`, wrap off. Reference: medium box all four sides. | `A5:O5` |
| 6 | `16.5` pt | `A6` | *(empty — the `#` column has no header label)* | `bmHeader`, no text. Reference: left `medium`, right `thin`, no top/bottom. | — |
| 6 | — | `B6` | literal `DESCRIPTION` | `bmHeader`: Calibri 10 **bold**, `FF000000`, no fill, `horizontal=center`, `vertical` unset in reference → set `center`, wrap off, General. Reference borders: left `thin` only → normalized to thin box (DEV-12). | — |
| 6 | — | `C6` | literal `SUPPLIER NAME` | `bmHeader` (reference sets `wrapText=1` on this one cell only — normalized off, DEV-11) | — |
| 6 | — | `D6` | literal `ARTICLE #` | `bmHeader` | — |
| 6 | — | `E6` | literal `WIDTH` | `bmHeader` | — |
| 6 | — | `F6` | literal `SIZE` | `bmHeader` | — |
| 6 | — | `G6` | literal `AREA OF USE` | `bmHeader` | — |
| 6 | — | `H6` | literal `MATERIAL IMAGES` | `bmHeader` | `H6:I6` |
| 6 | — | `J6`…`O6` | `state.mainPage.colorways[i].col` (seeded `'COL 1'`, `'COL 2'`; `mpAddColor` appends `'COL ' + (n+1)`) | `bmHeader`. Reference fills: `J6`=`FFFFFFFF`, `K6`=none, `L6`=none, `M6`=theme lt1 (`FFFFFFFF`), **`N6`=`FFFFFF00`**, `O6`=theme lt1 — dropped, all colorway headers get no fill (DEV-9, DEV-10). | — |

Note the reference's own asymmetry, reproduced deliberately because it is
consistent across *both* BOM sheets and therefore template, not residue: the
first section band is `23.2` pt with a `16.5` pt header, the second is `15.8` pt
with a `15.8` pt header.

### FABRIC data rows — `r` from `FAB0` to `BAND2 - 1`, one per `fab[i]`

Row height **`90.0` pt** (120 px) — fixed, whether or not the row carries a photo.

| Cell | Text / expression | Style | Merge |
| --- | --- | --- | --- |
| `A{r}` | `fab[i].seq` — e.g. `'1'`, `'2'`, `'3'` | `bmSeq`: Calibri 10, `FF000000`, `center`/`center`, wrap off. Written as an **inline string** (DEV-13; reference stores `A7=1` as a number). Reference border: left `medium`, right `thin`, top `thin`, no bottom → normalized to left `medium` + thin R/T/B. | — |
| `B{r}` | `fab[i].row.cells.description` | `bmText`: Calibri 10, `FF000000`, no fill, `horizontal=left vertical=center`, `wrapText=1`, General, thin box. | — |
| `C{r}` | `fab[i].row.cells.supplier` | `bmText` | — |
| `D{r}` | `fab[i].row.cells.article` | `bmText` | — |
| `E{r}` | `fab[i].row.cells.width` | `bmText` | — |
| `F{r}` | `fab[i].row.cells.size` | `bmText` | — |
| `G{r}` | `fab[i].row.cells.areaOfUse` | `bmText` | — |
| `H{r}` | *(no text)* — the photo well; picture only, see §5 | `bmPhoto`: Calibri 10, `center`/`center`, wrap off, thin box. Reference types the article code here on rows 7 and 9 instead of a swatch — not reproduced (DEV-8). | `H{r}:I{r}` (DEV-7: we merge the band we do not fill twice) |
| `J{r}`…`{col}{r}` | `bmCwValue(fab[i].row, colorways[n])` — returns `row.cwOverride[cw.col]` when that key is *present* (even if `''`), else the colorway's own composed text | `bmCw`: Calibri 10, `FF000000`, `center`/`center`, `wrapText=1`, General, thin box, **no fill**. | — |

Reference cell values, for the parity read (all six colorway columns repeat the
same six strings on every single data row of both sheets):

```
row 7  A='1'  B='Synthetic shell fabric'  C=(empty)  D='Same as ShapeCurvy'
       E=(empty)  F='ALL'  G='Outer Cup panel, Zipper guard, Strap, Back panel, CB crossed stript'
       H='BR-FB-KT-NL-H-200-XG-I/7'   (article code, not a photo)
row 8  A='2'  B='Powermesh'  D='BR-ME-KT-NL-H-130-LF-336'  F='ALL'
       G='CB panel, Liner front panel'   H=<photo 91×120 px>
row 9  A='3'  B='Microfiber mesh'  D='Same as EmmaBra'  F='ALL'
       G='Outer neckline panel'   H='BR-MM-KT-NL-H-180-F012-I/1'
J..O = 'Default White' | 'Default Black' | '14-1212 TCX\nNude Tan CP'
     | '12-1304 TCX\nLight Pink CP' | '14-4306 TCX\nCoral Blue CP'
     | '18-3211 TCX\nDusty Purple CP'
```

The two-line colorway cell (`'14-1212 TCX'` + `LF` + `'Nude Tan CP'`) is the
code/name split of confirmed decision 5. Our colorway record is currently
`{ col, value, hex }` (`src/ui/main-page.js`, `mp.colorways` seed and
`mpAddColor`) — there is **no** `code` field yet. Target, following US-080's
"parts authoritative, value derived" pattern:

```js
// state.mainPage.colorways[i]
{ col: 'COL 1', code: '14-1212 TCX', name: 'Nude Tan CP',
  value: '14-1212 TCX - Nude Tan CP',   // derived, for MAIN PAGE
  hex: '#…' }
```

and the BOM cell text becomes
`cw.code ? cw.code + '\n' + cw.name : (cw.name || cw.value || '')`. A per-row
`cwOverride` stays a single string and therefore prints one line — accepted.

### `TRIMS / COMPONENTS` band — row `BAND2` (reference: 10)

| Row | Height | Cell | Text | Style | Merge |
| --- | --- | --- | --- | --- | --- |
| `BAND2` | `15.8` pt | `A{BAND2}` | `BM_SECTION_BANDS.TRIM` → `TRIMS / COMPONENTS` | `bmSection` (same as `A5`). Reference borders: left `medium`, right `medium`, bottom `medium`, **no top** → normalized to a medium box (DEV-12). | `A{BAND2}:O{BAND2}` |

### Second header row — row `HDR2` (reference: 11)

Height `15.8` pt. Cells and text **identical to row 6** — same seven literals,
same colorway expressions, `H{HDR2}:I{HDR2}` merged. Reference border
differences from row 6 (`A11` gains a thin bottom, `H11` gains a thin left) are
normalized away by the shared `bmHeader` token (DEV-12).

### TRIM data rows — `r` from `TRM0` to `LAST`, one per `trm[i]`

Row height **`127.5` pt** (170 px) — fixed, whether or not the row carries a
photo. Reference row 14 (`5.2 UB plush elastic`, no photo) is still `127.5` pt.

Cells, styles and merges are **exactly** the FABRIC block's, with
`fab[i]` → `trm[i]`. The only differences are the height and the numbering
(`trm[i].seq` continues the same `base` counter, so split pairs render `5.1`/`5.2`).

Reference cell values:

```
row 12  A=4    B='2 piece molded foam cup '   F='Size wise graded'  G='Cup'
        H=<photo 290×126>          I='`'  ← residue, dropped (R3)
row 13  A=5.1  B='UB plush elastic'  C='Mingshipai'  D='L1619'  E='1.5 cm'
        F='XS, S, M, L, XL'  G='Inner UB'   H=<photo 291×327>
row 14  A=5.2  B='UB plush elastic'  C='Mingshipai'  D='L1619'  E='2 cm'
        F='2XL and above'  G='Inner UB'     (no photo)
row 15  A=6    B='Ready-made soft stretch tape'  C='Mingshipai'  D='L1827'
        E='1 cm'  F='ALL'
        G='Sideseam, Back panel seam, Side front panel attach zipper '
        H=<photo 292×50>  I=<photo 291×88>   ← two slots
row 16  A=7    B='Nylon coated 8-shaped ring'  E='2.5 cm (inner width)'
        F='ALL'  G='Apex'                    H=<photo 230×170>
row 17  A=8    B='H&E (regular)'   F='ALL'  G='Right sideseam opening'
                                             H=<photo 238×170>
row 18  A=9    B='Velcro patches'  F='ALL'  G='Strap end'
                                             H=<photo 141×163>
row 19  A=10   B='Rigid tape'      F='ALL'  G='Apex'          (no photo)
row 20  A=11   B='V-fold elastic'  C='Mingshipai'  D='L1612'
        E='16 mm (full width)'  F='ALL'  G='Neckline & armholes finish'
        H=<photo 284×100>  I=<photo 292×114>  ← two slots
row 21  A=12   B='Open end zipper-  Nylon coil, Nylon coated puller, automatic locking'
        D='3 teeth'  F='ALL'  G='Left sideseam opening'   (no photo)
```

`sheetData` ends at row `LAST`. Nothing after it (DEV-4).

### Row-height summary (as read)

| Rows | Height (pt) | ≈ px |
| --- | --- | --- |
| 1 | 35.2 | 47 |
| 2 | 408.8 | 545 |
| 3 | 100.5 | 134 |
| 4 | 35.2 | 47 |
| 5 (`MAIN BODY FABRICS`) | 23.2 | 31 |
| 6 (header) | 16.5 | 22 |
| `FAB0`…`BAND2-1` (fabric data) | 90.0 | 120 |
| `BAND2` (`TRIMS / COMPONENTS`) | 15.8 | 21 |
| `HDR2` (header) | 15.8 | 21 |
| `TRM0`…`LAST` (trim data) | 127.5 | 170 |
| 22 → 218 | 12.8 | — **not emitted** (DEV-4) |

---

## 4. Merge list

Static, plus two per dynamic row-block. Reference merges verbatim:
`A1:O1`, `A2:H3`, `I2:O3`, `A4:O4`, `A5:O5`, `H6:I6`, `A10:O10`, `H11:I11`.

| Merge | When |
| --- | --- |
| `A1:O1` | always — title bar 1 |
| `A2:H3` | always — OUTSIDE VIEW banner well |
| `I2:O3` | always — INSIDE VIEW banner well |
| `A4:O4` | always — title bar 2 |
| `A5:O5` | always — `MAIN BODY FABRICS` band |
| `H6:I6` | always — `MATERIAL IMAGES` header, first block |
| `A{BAND2}:O{BAND2}` | always — `TRIMS / COMPONENTS` band (reference `A10:O10`) |
| `H{HDR2}:I{HDR2}` | always — `MATERIAL IMAGES` header, second block (reference `H11:I11`) |
| `H{r}:I{r}` | **new** — every data row, so the single photo centres in the full double-width well. The reference leaves data rows unmerged because it uses `I` as a second photo slot (DEV-7). |

If the second photo slot is ever implemented, drop the per-data-row
`H{r}:I{r}` merges — they are mutually exclusive.

---

## 5. Image table

Reference drawing part `xl/drawings/drawing4.xml`: 14 anchors, all
`<xdr:oneCellAnchor>` with explicit `<xdr:ext>` — 2 text-box shapes, 2 banner
pictures, 10 material photos. We emit `oneCellAnchor` + explicit EMU `ext` the
same way `buildTechPackDrawingXml` already does, so aspect is fixed by the
extents and `<a:picLocks noChangeAspect="1"/>` is set on every picture.

### 5a. The two text boxes — not reproduced as shapes

| Reference | Anchor | Offset | Size | Content |
| --- | --- | --- | --- | --- |
| `Shape 6` | col 1 (`B`), row 1 (`2`) | colOff `38100` EMU = 4 px, rowOff 0 | 1466850×438150 EMU = 154×46 px | `OUTSIDE VIEW`, Calibri 11 bold, `algn="ctr"`, `noFill`, 2 pt `dk1` outline |
| `Shape 5` | col 8 (`I`), row 1 (`2`) | colOff 4 px, rowOff 0 | 154×46 px | `INSIDE VIEW`, same formatting |

Our writer has no shape emitter. Reproduced as **cell text** instead: `A2` and
`I2` carry the two literals with `vertical=top` (§3, `bmBanner`), and the banner
pictures are anchored 46 px down so they clear the label band — which is
precisely what the reference does with its `rowOff` of 130.5 px / 165.1 px.
Readable parity, no shape XML. (DEV-14.)

### 5b. Banner pictures

| Slot | Produced by | Anchor | colOff / rowOff (px) | Display size (px) | Aspect |
| --- | --- | --- | --- | --- | --- |
| Left / OUTSIDE VIEW | `bmRenderMatkeyToCanvas('solid', …)` → `canvasToPngBytes` on the **outer-role** board image of `state.bom.images.solid` (with its `state.bom.callouts` numbers drawn in) | `A2` (col 0, row 1) | `2` / `46` | fit inside **981 × 629** (well `A:H` = 989 px wide; rows 2+3 = 679 px tall; minus the 46 px label band and 4 px padding) | preserved |
| Right / INSIDE VIEW | same render on the **inner-role** board image | `I2` (col 8, row 1) | `2` / `46` | fit inside **961 × 629** (well `I:O` = 969 px) | preserved |

Reference for comparison: `A2` colOff 1.3 px rowOff 130.5 px, ext 995.4×428.5 px
(12 px wider than its own well); `I2` colOff 5.5 px rowOff 165.1 px, ext
987.3×317.2 px (24 px wider than its well). We fit rather than overflow (DEV-15).

**`state.bom.images.solid` has no outer/inner role — see gap G1.** Interim rule:
`images.solid[0]` → left well, `images.solid[1]` → right well, index ≥ 2 not
placed on the sheet.

### 5c. Material photos — one per row that has one

| Produced by | Anchor | colOff / rowOff (px) | Display size (px) | Aspect |
| --- | --- | --- | --- | --- |
| `pngBytesFromDataURL(row.photo.dataURL, 600)` — `row.photo = { dataURL }`, set by the BOM page's photo cell | `H{r}` (col 7, row `r-1` 0-based) | `3` / `3`, then centred in the merged `H:I` well | fit inside **516 × 114** on a FABRIC row (120 px − 6), **516 × 164** on a TRIM row (170 px − 6). 516 = H+I (522) − 6. | preserved |

Reference photo geometry, all `oneCellAnchor`:

| Reference row | Anchor col/row | colOff / rowOff (px) | ext (px) | Effective x |
| --- | --- | --- | --- | --- |
| 8 | 7 / 7 (`H8`) | 0 / 0 | 91 × 120 | H+0 |
| 12 | 6 / 11 (`G12`) | 123 / 23 | 290 × 126 | 10 px into H |
| 13 | 6 / 12 (`G13`) | 122 / 4 | 291 × 327 | 10 px into H — **spills through rows 14–15** |
| 15 slot 1 | 6 / 14 (`G15`) | 122 / 61 | 292 × 50 | 10 px into H |
| 15 slot 2 | 7 / 14 (`H15`) | 291 / 42 | 291 × 88 | 30 px into I |
| 16 | 7 / 15 (`H16`) | 0 / 0 | 230 × 170 | H+0 |
| 17 | 7 / 16 (`H17`) | 0 / 0 | 238 × 170 | H+0 |
| 18 | 7 / 17 (`H18`) | 74 / 5 | 141 × 163 | 74 px into H |
| 20 slot 1 | 6 / 19 (`G20`) | 123 / 37 | 284 × 100 | 10 px into H |
| 20 slot 2 | 7 / 19 (`H20`) | 291 / 32 | 292 × 114 | 30 px into I |

Two things to read off that table. First, the reference's "slot 1 / slot 2"
positions are ~H+10 px and ~I+30 px, both ~291 px wide — the double-width band
holds two ~291 px photos side by side. Second, the reference does **not** fit
photos to their rows (`291×327` in a 170 px row). We fit (DEV-15).

---

## 6. Data gaps

Things on the reference sheet with no source in our state.

| # | Reference thing | Our state | Recommendation |
| --- | --- | --- | --- |
| G1 | Two banner wells with distinct roles: `A2:H3` = OUTSIDE VIEW, `I2:O3` = INSIDE VIEW | `state.bom.images.solid` is an **ordered array with no role field** (`{ id, x, y, width, height, aspect, locked }` + a `dataURL` side-table). Construction has the same shape per variant. | **Add state**: `image.viewRole: 'outer' \| 'inner'`, defaulted on add by board position, editable on the BOM page. Reuses the Board's existing `front_outer` / `front_inner` vocabulary. Until then, use the index rule in §5b and warn in the preview when `images.solid.length > 2`. |
| G2 | Colorway cells print two lines: Pantone code + colour name (`'14-1212 TCX'` / `'Nude Tan CP'`) | `mp.colorways[i] = { col, value, hex }` — one string, no code | **Add state** (already a confirmed decision, not yet built): `.code` + `.name` authoritative, `.value` derived. §3 gives the exact shape and the cell expression. |
| G3 | `N` (COL 5) filled `FFFFFF00` on the header and every data row, both BOM sheets | nothing marks a colorway as highlighted | **Drop.** No source, and no TD statement that the yellow means anything. If it turns out to be "the colorway under review", add `mp.colorways[i].highlight: boolean` and fill `FFFFFF00` from it — one line, both sheets. |
| G4 | `H7` / `H9` hold an article code string where a swatch would go | `row.cells.article` already prints in `D` | **Drop.** Reproducing it would print the same code twice on one row. |
| G5 | Second photo per row (`I15`, `I20`) | `row.photo` is a single `{ dataURL }` | **Drop for now.** If TDs ask for it: `row.photos: [{dataURL}, {dataURL}]`, and remove the per-data-row `H{r}:I{r}` merge. |
| G6 | `OUTSIDE VIEW` / `INSIDE VIEW` text boxes | no shape emitter | **Hard-code as factory boilerplate**, but as cell text in `A2`/`I2` (§5a) rather than DrawingML shapes. |
| G7 | `A1='Fabric and Trim Requirement'`, `A4='Bill of Materials Sheet'`, `A5`/`A{BAND2}` band captions, the seven header labels, `'COL n'` | `BM_SECTION_BANDS`, `BM_CELL_LABELS`, `BM_PHOTO_LABEL` already hold the band + header strings **verbatim**; the two title bars are not in our state | **Hard-code as factory boilerplate.** The two title literals are sheet furniture, not project data. Verified: our existing constants match the reference strings exactly, including `'ARTICLE #'` and the space in `'TRIMS / COMPONENTS'`. |
| G8 | `C7`, `E7`, `C8`… styled-but-empty data cells | our rows always have all six field keys (possibly `''`) | No gap — we emit the same styled-empty cells because every field is written unconditionally. |

Nothing else on the sheet lacks a source: `SUPPLIER NAME`, `ARTICLE #`,
`WIDTH`, `SIZE`, `AREA OF USE`, `DESCRIPTION` and the `#` all come straight from
`row.cells.*` / `x.seq`.

---

## 7. Deviations

Every deliberate difference from the reference sheet. DEV-1…DEV-6 are
sheet-identity/format decisions shared with the lace map; DEV-7…DEV-15 are the
content and rendering ones.

| # | Deviation | Reason |
| --- | --- | --- |
| DEV-1 | `TYPE / COMPOSITION` column dropped — `BM_CELL_FIELDS` minus `composition` for the printed sheet | Confirmed decision 4. Bonus: our letters then land on the reference's (§2). |
| DEV-2 | Headers are **English-only, single-line** — `BM_CELL_LABELS_CN` / `BM_PHOTO_LABEL_CN` are not written to the sheet | Confirmed decision 4. Keep the CN constants for the on-screen table. |
| DEV-3 | `I{TRM0}` backtick residue not emitted | Confirmed decision 1. |
| DEV-4 | No styled-empty apron: no `P:S` columns, no rows past `LAST`, `dimension` ends at `O{LAST}`, no `customHeight` grid to row 218 | Confirmed decision 1. |
| DEV-5 | `topLeftCell` omitted (reference `"A4"`); no `selection` element | Where the author last scrolled — file residue. |
| DEV-6 | Stale picture names (`image9.png`, `image26.png`, `Shape 5`) replaced with our generated `Image {n}` | Confirmed decision 1. |
| DEV-7 | Second material-photo slot in `I` not reproduced; instead `H{r}:I{r}` is merged on every data row and the single `row.photo` centres in it | Our model is one `row.photo` per row. Merging keeps the double-width band that decision 4 requires and gives the one photo the full width. |
| DEV-8 | Article codes are **not** retyped into the `MATERIAL IMAGES` column | `row.cells.article` already prints in `D`; duplicating it in `H` is a reference habit, not information (G4). |
| DEV-9 | The yellow `FFFFFF00` on COL 5 is dropped — all colorway cells get no fill | No state source (G3). Must be dropped on **both** BOM sheets or the two sheets diverge. |
| DEV-10 | White fills dropped: `J*`=`FFFFFFFF`, `K*`/`M*`/`O*`=theme `lt1` (also `FFFFFFFF`), `C13`/`C14`, `B20`–`G20`, `B21`–`E21` | White on white. No visual difference, and no state distinguishes which cells get it — the reference's pattern is arbitrary. |
| DEV-11 | Fonts normalized: Calibri 10 everywhere in data rows (Calibri 11 bold 18 in title bars, 12 in band rows, 10 bold in headers) | The reference mixes Calibri 10, Calibri 11 and Arial 10 cell by cell with no rule — e.g. `B7` Calibri 11 vs `B13` Calibri 10; `F13` Arial 10 vs `F15` Calibri 10; `A16:A21` Arial vs `A7:A15` Calibri. It is copy-paste drift, and readable parity is the target. |
| DEV-12 | Borders normalized: medium box on the four full-width bands (rows 1, 4, 5, `BAND2`) and on column `A`'s left edge; thin box on every header, data and banner cell | The reference drops random sides — `A1`/`A4` have no right or bottom, `A{BAND2}` no top, `I2` no left, `B6` left only, `A7` no bottom, `I15` no borders at all. A uniform grid is what the sheet visually *reads* as. |
| DEV-13 | `#` written as an inline string, not a number (reference stores `A7=1` int, `A13=5.1` float) | `x.seq` is already a string, and `5.10` / `5.1` float formatting is a real hazard. Alignment (`center`) is unchanged, so it reads identically. |
| DEV-14 | `OUTSIDE VIEW` / `INSIDE VIEW` emitted as cell text in `A2` / `I2` (bold, top-aligned) instead of DrawingML text boxes | No shape emitter, and the reference already reserves the top of the well for them via `rowOff` (G6, §5a). |
| DEV-15 | Pictures are fitted to their well/row instead of overflowing it | The reference overflows: banners exceed their merged wells by 12 px and 24 px, and the `291×327` photo at `G13` spills through two more rows. Fitting is required for the `fitToPage` single-page print to stay readable. |
| DEV-16 | Our current `buildBomSheetPart` prologue (`'BOM-SOLID - Fabric and Trim Requirement'` title + a `bmSheetMetaText()` meta row) is replaced by the reference's rows 1–4: title bar, banner wells, second title bar | Parity. `bmSheetMetaText()` keeps its job on the HTML preview sheet head; it has no cell on the factory grid. |
| DEV-17 | Row heights become fixed template values (`90.0` pt fabric, `127.5` pt trim) regardless of whether a row carries a photo — replacing today's `ht: 58` only-when-photo rule | Parity: reference row 14 has no photo and is still `127.5` pt. Row geometry is part of the confirmed parity target. |

---

## 8. Builder contract

```js
// src/render/export-xlsx.js — one builder, two sheets
async function buildBomSheetPart(key /* 'bom-solid' | 'bom-lace' */) {
  const variant   = key.slice('bom-'.length);        // 'solid' | 'lace'
  const numbered  = bmNumberedRows(variant);         // scope filter + numbering, unchanged
  const colorways = (state.mainPage && state.mainPage.colorways) || [];
  // …everything else in this map is variant-independent…
}
```

`TECHPACK_SHEET_NAMES['bom-solid']` is already `'BOM-SOLID'` — correct as is.
`TECHPACK_SHEET_NAMES['bom-lace']` is `'BOM-LACE'`; per decision 1 the
reference's leading space (`' BOM-LACE'`) is kept only if free — that call
belongs to the lace map, not here.

Everything this map needs already exists in `src/ui/bom.js`:
`bmNumberedRows`, `bmVisibleRows`, `bmCwValue`, `bmVariantImages`,
`bmRenderMatkeyToCanvas`, `row.photo`, `BM_SECTION_BANDS`, `BM_CELL_LABELS`,
`BM_PHOTO_LABEL`. The two net-new state fields are G1 (`image.viewRole`) and
G2 (`colorway.code` / `.name`).
