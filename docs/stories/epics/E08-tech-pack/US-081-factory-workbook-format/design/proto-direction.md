# Cell map — `PROTO Direction`

US-081 / ADR 0048 decisions 1, 4, 5, 7, 8.

Reference: `3916.KiraForm vA 1.0 17.05.2025(1).xlsx`, sheet 5 of 5
(`xl/worksheets/sheet5.xml`, `xl/drawings/drawing5.xml`,
`xl/media/image27.png`). Every width, height, ARGB, border style, alignment and
numFmt below was read out of those parts — nothing here is guessed. Where our
data model cannot fill a cell it is listed in **Data gaps**, not invented.

This sheet is **new for the tool** and it **owns the measurement block**. After
US-081 the pack is five worksheets and there is no standalone `Measurement Spec`
worksheet. The Board's own `Export Excel` button and its single-sheet file do
not change at all (ADR 0048 decision 5).

---

## 1. Sheet identity

| Property | Value | Provenance |
| --- | --- | --- |
| Sheet name | `PROTO Direction` | `xl/workbook.xml`: `<sheet name="PROTO Direction" sheetId="5" r:id="rId5"/>`. No leading/trailing space. |
| Position in workbook | 5th and last | reference order: `MAIN PAGE`, `CONSTRUCTION DETAIL`, `` BOM-LACE``, `BOM-SOLID`, `PROTO Direction` |
| Tab colour | **none** — do not emit `<tabColor>` | reference `<sheetPr><outlinePr summaryBelow="0" summaryRight="0"/></sheetPr>` carries no `tabColor`, and no sheet in the workbook does |
| `showGridLines` | **`0`** (ours) | reference sheet 5 omits the attribute (gridlines ON) — the only sheet in the pack that does; sheets 1–4 all carry `showGridLines="0"`. Deviation D-01. |
| Paper | **A4 (`paperSize="9"`)** (ours) | reference sheet 5 is `paperSize="1"` (Letter); sheets 1–4 are all `paperSize="9"`. Deviation D-01. |
| Orientation | `landscape` | reference `<pageSetup paperSize="1" orientation="landscape"/>` — kept |
| Scale / fit | `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` + `<pageSetup … fitToWidth="1" fitToHeight="0"/>` (ours) | reference has no scaling at all; the grid is 20 columns / ~2200 px wide and prints across three sheets of paper. Deviation D-02. |
| Margins | `left="0.236220472440945" right="0.236220472440945" top="0.748031496062992" bottom="0.748031496062992" header="0" footer="0"` (ours) | read off reference sheets 2/3/4 (the pack's own inner-page margin set). Reference sheet 5 carries Excel defaults `0.7/0.7/0.75/0.75` — an un-set-up sheet. Deviation D-01. |
| Print centering | `<printOptions horizontalCentered="1"/>` (ours) | read off reference sheets 3 and 4. Reference sheet 5 has no `printOptions`. Deviation D-01. |
| Header/footer | `<headerFooter/>` empty — **never emit footer text** | ADR 0048 decision 2: the reference footers carry another company's legal notice |
| Freeze / split | **none** | reference has no `<pane>`; do not invent one |
| `topLeftCell` | `A1` (ours) | reference `topLeftCell="C18"` is a saved scroll position. Deviation D-03. |
| `defaultColWidth` / `defaultRowHeight` | `12.6339285714286` / `15`, `customHeight="1"` | reference `<sheetFormatPr defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"/>` |
| `dimension` | `A1:{LAST}{SKETCH_ROW}` | computed; the reference's `A1:AA996` covers a styled-empty apron we drop (D-04) |
| ListObjects / tables | **none** | the reference carries 8 orphan `tablePart` refs over 1–2 cell ranges in column I (`Table_1` `ref="I19:I20"` … `Table_13` `ref="I30"`). Dropped per ADR 0048 decision 1. |
| dataValidations / conditionalFormatting | none in the reference | verified: zero matches in `sheet5.xml` |

---

## 2. Column table

`px` below uses the standard `round(width × 7) + 5` conversion (MDW = 7 px at
96 dpi for the sheet's Arial 10 / Calibri 11 default).

| Col | Width (chars) | px | Role |
| --- | --- | --- | --- |
| A | `4.88392857142857` | 39 | left gutter — the whole sheet is inset by one narrow column. Never written except as a styled blank. |
| B | `19.6339285714286` | 142 | field labels (rows 3–6) · instruction-block anchor (rows 9–16) · `POM` number column (rows 17…) · sketch-frame anchor |
| C | `46.75` | 332 | field values (rows 3–6) · `Description - English` |
| D | `46.75` | 332 | `Description - Chinese` (and the right edge of the row-16 naming caption merge) |
| E | `11.75` | 87 | `TOL` |
| F … `LAST` | `11.75` | 87 each | one column per selected size, in `selectedSizeRun()` order |
| — | — | — | nothing is written right of `LAST` |

`LAST = specColLetter(5 + N - 1)` where `N = selectedSizeRun().length`.
With the 15-size default (`S M L XL 2XL 3XL 4XL 5XL M2 L2 XL2 2XL2 3XL2 4XL2
5XL2`) `LAST = 'T'`. Deselect `4XL2` and `N = 14`, `LAST = 'S'` — the reference's
exact grid.

Reference column widths verbatim, for the record:
`<col min="1" max="1" width="4.88392857142857"/>`,
`<col min="2" max="2" width="19.6339285714286"/>`,
`<col min="3" max="4" width="46.75"/>`,
`<col min="5" max="12" width="11.75"/>`,
`<col min="13" max="16" width="13.1339285714286"/>`; columns Q–S fall through to
the `12.6339285714286` default. We apply `11.75` to **every** size column —
see deviation D-05.

### Column-offset relationship to `buildSpecSheetRows`

`buildSpecSheetRows` natively emits `A`=POM, `B`=EN, `C`=ZH, `D`=TOL,
`E…`=sizes. The proto grid is that grid **shifted one column right** (A is the
gutter). The shift must happen *inside* the builder, not by rewriting emitted
XML strings, because the graded cells carry live formulas whose base-column
letter is computed from the layout (`specColLetter(4 + lIdx)`, currently `H`
for Size L in the all-sizes default). See §7.

---

## 3. Row-by-row map

Row numbers 1–17 are fixed. Below that:

- `DATA_TOP = 18`
- `P = buildSpecSheetRows(...).pomKeys.length` (18 contract POMs + registered
  customs, minus hidden/deleted — `specVisiblePomKeys`)
- `DATA_BOTTOM = 17 + P`
- `SKETCH_ROW = 18 + P` (reference: `P = 13`, so `DATA_BOTTOM = 30`,
  `SKETCH_ROW = 31`)

Shorthand for styles (all fonts are **Arial**, all borders `FF000000`):

- `thinBox` = thin left/right/top/bottom
- `medL` / `medR` / `medT` / `medB` = medium on that side

### 3.1 Style header — rows 3–6

Row height `22.5` on all four. Rows 1–2 and 7–8 exist in the reference only as
styled-empty apron and are **not emitted** (D-04).

| Row | Cell | Content | Style | Merge |
| --- | --- | --- | --- | --- |
| 3 | `B3` | literal `PRODUCT NAME` | Arial 10 **bold**, no fill, `thinBox`, horizontal `right` | none |
| 3 | `C3` | style expression — see §3.1.1 | Arial 12 **bold**, no fill, `thinBox`, horizontal `left` | none |
| 4 | `B4` | literal `SUPPLIER/VENDORS` | as `B3` | none |
| 4 | `C4` | `mpFieldValue(/^Supplier\s*\/\s*Vendors\b/i)` → `state.mainPage.fields[i].value` (**new field — data gap G-01**) | as `C3` | none |
| 5 | `B5` | literal `DATE` | as `B3` | none |
| 5 | `C5` | `formatProtoDate(...)` — see §3.1.2 | as `C3`. **Text cell, numFmt General.** (Reference `C5` is a shared *string* `18.May.2026` carrying a dead `numFmt 176 dd\-mmm\-yy`; we drop the format — D-06.) | none |
| 6 | `B6` | literal `DEVELOPMENT ROUND` | as `B3` | none |
| 6 | `C6` | `mpFieldValue(/^Development Round\b/i)` → `state.mainPage.fields[i].value` (**new field — data gap G-02**) | as `C3` | none |

Reference values for these four, verbatim: `KiraForm vA 1.0`, `Wanting`,
`18.May.2026`, `Mock up`.

#### 3.1.1 `C3` PRODUCT NAME

There is no single state field holding this. The reference's value is the hand
rendering of its own MAIN PAGE `Style No Breakdown` sub-grid
(`B6='KiraForm'`, `C6='v.A'`, `D6='1'`).

Write:

```js
const bd = (state.mainPage.fields || [])
  .find(f => /Style No Breakdown/i.test(f.label || ''));
const parts = bd && bd.parts
  ? [bd.parts.prefix, bd.parts.category, bd.parts.rangeNo]
  : [];
const productName =
  parts.map(v => String(v || '').trim()).filter(Boolean).join(' ')
  || (state.styleId || '').trim()
  || mpFieldValue(/^Range Name\b/i)
  || 'Untitled';
```

Real variables: `state.mainPage.fields[i].parts.prefix`, `.parts.category`,
`.parts.rangeNo` (US-080/ADR 0047 — `parts` is authoritative, `value` is the
`' · '`-joined derivation and must **not** be used here: `KiraForm · v.A · 1`
is not a product name). Bind the row by regex, never by index — the labels are
TD-editable and `mpResolveSpecs()` already binds this way.

We do **not** reproduce the reference's cosmetic normalisation
(`v.A` → `vA`, `1` → `1.0`): our output for the same input is
`KiraForm v.A 1`. Deviation D-07.

#### 3.1.2 `C5` DATE

```js
function formatProtoDate(iso, now) {           // 2026-05-18 -> '18.May.2026'
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : now;
  return String(d.getDate()).padStart(2, '0') + '.' + M[d.getMonth()] + '.' + d.getFullYear();
}
```

Source: `mpFieldValue(/Tech Pack Creation date/i)` — i.e.
`state.mainPage.fields[i].value`, which `ensureMainPage()` guarantees is
`yyyy-mm-dd` — else the export's `now`.

This is a **new helper, not `formatSpecDate`**: `formatSpecDate` yields a
two-digit year (`18.May.26`) and is load-bearing for the byte-identical Board
export. Do not touch it.

### 3.2 The three bilingual instruction blocks — rows 9–14

Six merged full-width rows: a title bar, then a body, three times. Every merge
spans `B{r}:{LAST}{r}` (reference `B{r}:S{r}` at its 14-size width).

| Row | ht | Anchor cell | Content | Style |
| --- | --- | --- | --- | --- |
| 9 | `24` | `B9` | literal `**Construction comment - 工艺评论` | Arial **13** bold, fill `FFC9DAF8`, `medL` + thin bottom, align `left` + `vertical center` |
| 10 | `33` | `B10` | `state.proto.constructionComment` or the boilerplate default (§3.2.1) | Arial 12, no fill, `medL` + thin top + thin bottom, `vertical center`, **`wrapText="1"`**, align `left` |
| 11 | `24` | `B11` | literal `**Material - 材料评论` | Arial **14** bold, fill `FFC9DAF8`, `medL` + thin top, align `left` + `vertical center` |
| 12 | `33` | `B12` | `state.proto.materialComment` or the boilerplate default (§3.2.1) | as row 10 |
| 13 | `24` | `B13` | literal `**Sample Request-` (reference is `**Sample Request- ` — trailing space dropped, D-08) | as row 11 |
| 14 | `45` | `B14` | `state.proto.sampleRequest` or the composed default (§3.2.2) | as row 10, **but the block's closing rule**: `medL` + thin top + **`medB`** |

Interior cells of each merge (`C{r}` … `{LAST}{r}`) carry the same horizontal
rules as the anchor, plus `medR` on `{LAST}{r}`, and — per our existing
`band()` convention in `export-xlsx.js` — the **same fill as the anchor**.
The reference leaves the interior cells fill-less and relies on Excel painting
a merge from its top-left cell; LibreOffice / Sheets / Numbers do not always.
Deviation D-09.

Reference right-edge irregularity: on rows 11 and 13 the interior style runs
`C..S` with *no* `medR` at all (style 19), while rows 9/10/12/14 do carry it
(styles 11/16/16/26). We emit `medR` on every one of rows 9–16 so the panel is
a closed box. Deviation D-10. Likewise `B14` uses a **thin** left border in the
reference (style 24) where `B10`/`B12` use medium; we use medium throughout.
Deviation D-11.

#### 3.2.1 Blocks 1 and 2 — boilerplate, TD-overridable

Both bodies are **fixed factory boilerplate that points at this pack's own
sheets**, so the tool can always fill them with no TD work. Both are also worth
making overridable — block 1 is literally called a *comment*.

Recommendation: `state.proto.constructionComment` / `state.proto.materialComment`
as optional strings where **empty means "print the default"** (the same
empty-means-built-in rule `state.pomSpecs[key].en/.zh` already uses, so the
boilerplate can evolve with a build instead of being frozen into old project
files).

Defaults, with a real `LF` between the two lines and `wrapText` on:

```
Please follow the Construction Details Sheet
请按照工艺细节表执行。
```

```
Please follow the BOM Sheet
请按照BOM表执行。
```

Verbatim reference text for block 2 is `Please follow the  BOM Sheet` — two
spaces after `the`. Collapsed to one (D-08).

Both reference bodies are **rich text**: the English run inherits the cell font
(Arial 12) and the CJK run is `<rFont val="宋体-简"/><charset val="134"/>` at
size 12. Our writer has no `sharedStrings` and no rich-text runs (ADR 0048
non-goal), so each body is one inline string in Arial 12 and the CJK glyphs come
from the viewer's font fallback — exactly what the D-column POM descriptions
already do in the Board export. Deviation D-12.

#### 3.2.2 Block 3 — `**Sample Request-`

Reference body, verbatim:

```
Please make the Mock-up size L in Solid Version.
请制作L码素色版手板样 / 结构样。
```

Three variables are embedded: the development round (`Mock up` → `Mock-up`),
the base size (`L`), and the requested version (`Solid`). Recommendation:
`state.proto.sampleRequest` is TD-editable free text; when empty the exporter
composes the English line and looks the Chinese line up:

```js
const round = mpFieldValue(/^Development Round\b/i) || 'Mock-up';
const size  = mpFieldValue(/^Base Size\b/i).replace(/^TBC$/i, '') || 'L';
const ver   = protoSampleVersionLabel();            // 'Solid' | 'Lace'  — gap G-04
const en = 'Please make the ' + round + ' size ' + size + ' in ' + ver + ' Version.';
const zh = PROTO_SAMPLE_ZH[ver.toLowerCase()]       // solid only — gap G-05
  ? PROTO_SAMPLE_ZH[ver.toLowerCase()].replace('{size}', size) : '';
const body = zh ? en + '\n' + zh : en;
```

with `PROTO_SAMPLE_ZH = { solid: '请制作{size}码素色版手板样 / 结构样。' }`.
The lace-version Chinese sentence is **not** in the reference and is not
invented — see gap G-05.

### 3.3 Measurement Spec bar + naming caption — rows 15–16

| Row | ht | Cell | Content | Style | Merge |
| --- | --- | --- | --- | --- | --- |
| 15 | `24` | `B15` | literal `Measurement Spec` | Arial **14** bold, fill `FFC9DAF8`, `medL` + **`medT`** + thin bottom, align `left` + `vertical center` | `B15:{LAST}15` |
| 16 | `22.5` | `B16` | literal `Product name _ Measurement Spec_Sample Type_Date` | Arial 12 **bold**, fill `FFEAD1DC`, `medL` + thin bottom | `B16:D16` |
| 16 | — | `{LAST}16` | styled blank | `medR` only (closes the panel's right edge on this row) | — |

Row 15's `medT` against row 14's `medB` is the double rule that separates the
instruction panel from the measurement block — keep both.

Row 16 is the **file/sheet naming convention caption**, fixed boilerplate; there
is no state for it and none is wanted. The reference spells it
`Product name _ Meaaurement Spec_Sample Type_Date`; we fix the typo
(ADR 0048 decision 7 — "where the reference file is wrong, we are right").
Deviation D-13. The reference's `E16:M16` styled-blank strip (styles 31/32) is
apron and dropped (D-04).

### 3.4 Measurement table header — row 17

Row height `15.75`. No merges. Emitted by `buildSpecSheetRows` with
`colOffset: 1`, `headerRow: 17`.

| Cell | Literal | Style |
| --- | --- | --- |
| `B17` | `POM` | Arial 12 bold, fill `FFFFF2CC`, `medL` + thin right/top/bottom |
| `C17` | `Description - English` | Arial 12 bold, fill `FFFFF2CC`, `thinBox`, `vertical center` + `wrapText="1"` |
| `D17` | `Description - Chinese` | as `C17` |
| `E17` | `TOL` | Arial 12 bold, fill `FFC9DAF8`, `thinBox`, horizontal `center`. **numFmt General** — reference carries a dead `numFmt 177 #\ ??/??` here (D-06) |
| `F17` … `{LAST-1}` | `layout[i].label` — `state`-driven via `selectedSizeRun()` | Arial 12 bold, fill `FFFBD4B4`, `thinBox`, horizontal `center` |
| `{LAST}17` | last size label | same, but `medR` instead of thin right |

The four literal header strings are byte-identical to what
`buildSpecSheetRows` already writes (`'POM'`, `'Description - English'`,
`'Description - Chinese'`, `'TOL'`) — no new strings needed.

Reference row 17 verbatim: `POM`, `Description - English`,
`Description - Chinese`, `TOL`, then `S M L XL 2XL 3XL 4XL 5XL M2 L2 XL2 2XL2
3XL2 5XL2` (14 columns, **no `4XL2`** — see D-14). Reference `R17`/`S17` carry a
dead `numFmt 2` (D-06).

**One fill per size column, not per depth tier.** The Board export tints each
depth column its own colour (`SPEC_XF.headDepth0 + i`, 7 fills). The reference
paints all 14 size headers the single peach `FFFBD4B4`. The proto sheet follows
the reference. Deviation D-15.

### 3.5 Measurement data rows — `DATA_TOP` … `DATA_BOTTOM`

Row height `20.25` on every data row (reference: `20.25` on rows 18–29 and
`23.25` on its last row 30 — a hand artifact, normalised, D-16).

One row per key in `buildSpecSheetRows(...).pomKeys`, in ascending numeric
order. For row `r`, POM key `k`, `spec = getPomSpec(k)`:

| Cell | Content (state expression) | Style |
| --- | --- | --- |
| `B{r}` | `Number(k)` as a **numeric** cell | Arial 10, **no fill**, `thinBox`, horizontal `center`, numFmt General |
| `C{r}` | `spec.en` → `state.pomSpecs[k].en` else `builtinPomEn(k)` (= `POM_TEMPLATE[k].name`) | Arial 10, fill `FFFFFFFF`, `thinBox`, horizontal `left`, numFmt General |
| `D{r}` | `spec.zh` → `state.pomSpecs[k].zh` else `builtinPomZh(k)` (= `POM_TEMPLATE[k].zh`) | Arial 12, fill `FFFFFFFF`, `thinBox`, horizontal `left`, numFmt General. Reference carries a dead `numFmt 178 #\ ?/?` on this text column (D-06). |
| `E{r}` | `inchesToFractionOrDecimal(spec.tol)` written as an **inline string**, blank when `spec.tol` is empty | Arial 10, fill `FFFFFFFF`, `thinBox`, horizontal `center`, **numFmt General** |
| base-size column | the sample-size measurement — see §3.5.1 | Arial 10, fill `FFFFFFFF`, `thinBox`, horizontal `center`, **numFmt `# ??/??`** |
| every other size column | **styled blank** — see §3.5.1 | Arial 12, fill `FFFFFFFF`, `thinBox`, horizontal `center`, numFmt `# ??/??` |
| `{LAST}{r}` | as above but `medR` instead of thin right | — |

`E{r}` is the TOL cell and it is **text, always**. The reference's TOL column
holds date serials (`46024`, `46030`, `46026`) under `numFmt 179 m/d`, because
someone typed `1/2` and Excel coerced it; row 19 and 21 hold the literal `-`.
ADR 0048 decision 7: we keep deliberate text. `buildSpecSheetRows` already does
exactly this (`specInlineStrCell`, never coerced) — no change needed.

The reference's per-cell style churn in this block is residue and is normalised
away: `C` alternates between a full box (style 41) and right+bottom only
(styles 48/52/53); `E` alternates between right+bottom (43/47) and a full box
(50); the sample-size column alternates `numFmt 177 #\ ??/??` (style 45) and
`numFmt 178 #\ ?/?` (style 51) with no pattern; `O20` alone carries a stray
`FFF3F3F3` fill (style 49); and on its last row the reference drops the bottom
border from `C30`…`S30` (styles 53–56). Deviation D-17.

#### 3.5.1 What the proto sheet writes into the size columns

**The header row prints every selected size; only the base-size column carries
a value.** This is the reference's own behaviour (`H` = `L` filled, the other 13
size columns empty) and it is what ADR 0048 decision 5 already settled: the pack
carries the *sample-size proto sheet the factory reads*, and a TD who wants the
graded 15-size run keeps using the Board's `Export Excel`.

Base-size column resolution:

```js
const wanted = mpFieldValue(/^Base Size\b/i).trim();     // MAIN PAGE field
const layout = selectedSizeRun();
let baseIdx = layout.findIndex(c => c.label === wanted);
if (baseIdx < 0) baseIdx = layout.findIndex(c => c.label === 'L');   // grading anchor
if (baseIdx < 0) baseIdx = 0;
```

`'L'` is the fallback because it is the tool's structural grading base
(`SPEC_ALPHA_DELTA_L_IN` is L-anchored) — not an invented default. The
reference's own MAIN PAGE `Base Size - 基础尺码` cell is empty, so its `H`
column was filled by hand.

Value written into `{baseCol}{r}`: a **plain numeric cell** (no formula), the
`buildFullSizeRun` cell at the base index — which is `getPomSpec(k).sizeL` (TD
value, else the Tier-0 library median) converted to the project's unit, or
blank when there is none. Every other size column is a **styled blank** of the
same xf, so the grid's white fill and box borders run to the right edge.

Consequences, stated plainly:

- **No live formulas on this sheet.** `=H18+1.25` etc. exist only in the Board
  file. There is exactly one value column, so there is nothing to grade off.
- The row set, the hide/delete rules, the EN/ZH/TOL text and the numeric
  formatting still come from `buildSpecSheetRows`, satisfying ADR 0048
  decision 4's surviving one-builder rule.
- If the TD deselects `4XL2` in the export size picker, the header row becomes
  the reference's exact 14 columns.

### 3.6 The framed how-to-measure sketch — `SKETCH_ROW`

| Property | Value |
| --- | --- |
| Row height | `331.5` pt (= 442 px) |
| Merge | `B{SKETCH_ROW}:{LAST}{SKETCH_ROW}` |
| `B{SKETCH_ROW}` | styled blank: Arial 10, no fill, `medL` + `medT` + `medB`, horizontal `center` |
| interior `C…{LAST-1}` | styled blank: no fill, `medT` + `medB` |
| `{LAST}{SKETCH_ROW}` | styled blank: no fill, `medR` + `medT` + `medB` |

That is a closed medium frame around the merge, with **no cell text** — the row
exists only to frame the picture. Nothing is written below it (the reference's
rows 32–996 are `customHeight` apron, D-04).

---

## 4. Merge list

With `N` selected sizes and `LAST = specColLetter(5 + N - 1)`
(`T` at the 15-size default, `S` at the reference's 14):

| Merge | Purpose |
| --- | --- |
| `B9:{LAST}9` | Construction-comment title bar |
| `B10:{LAST}10` | Construction-comment body |
| `B11:{LAST}11` | Material title bar |
| `B12:{LAST}12` | Material body |
| `B13:{LAST}13` | Sample-Request title bar |
| `B14:{LAST}14` | Sample-Request body |
| `B15:{LAST}15` | `Measurement Spec` bar |
| `B16:D16` | naming caption (fixed width — spans the POM + EN + ZH columns only) |
| `B{SKETCH_ROW}:{LAST}{SKETCH_ROW}` | sketch frame |

Nine merges, the same count and shape as the reference
(`B9:S9 B10:S10 B11:S11 B12:S12 B13:S13 B14:S14 B15:S15 B16:D16 B31:S31`).
Rows 3–6 are **not** merged — the field value sits in the single 46.75-wide
column C.

---

## 5. Image table

One image on this sheet.

| # | Render | Anchor | colOff | rowOff | Display size | Aspect |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `specBoardPngBytes()` → `renderBoardRegionToCanvas(getContentBounds())` — the whole Board: every photo plus the applied POM lines and their numbered labels | `oneCellAnchor` `from` col walked from B (index 1) on row `SKETCH_ROW - 1` (0-based) | centring walk, px (below) | `9` px | fitted inside `2160 × 424` px | **preserved** |

Reference for comparison: `<xdr:oneCellAnchor>` `from` col `2` (C),
`colOff="3048000"` EMU = **320 px**, row `30`, `rowOff="85725"` EMU = **9 px**,
`<xdr:ext cx="13887450" cy="3857625"/>` = **1458 × 405 px**, source
`xl/media/image27.png` at 990 × 275 (so the reference *upscales* 1.47×).
`preferRelativeResize="0"`, `cstate="print"`, name `image18.png`,
title `Hình ảnh` — the stale name and title are dropped (D-18).

Sizing rule (all inputs read, none invented):

```js
const FRAME_H_PX = 424;                     // 331.5pt = 442px, less 9px top + 9px bottom
const FRAME_W_PX = 142 + 332 + 332 + 87 * (1 + N);   // B + C + D + E + N size cols
const box = Math.min(FRAME_H_PX / img.height, (FRAME_W_PX - 38) / img.width);
const displayWidth  = Math.round(img.width  * box);
const displayHeight = Math.round(img.height * box);
```

Aspect is preserved because the writer emits an explicit EMU `<xdr:ext>`
computed from one scale factor — the same technique
`buildSpecDrawingXml`/`buildTechPackDrawingXml` already use (`1 px = 9525 EMU`),
which keeps the ratio identical across Excel / Sheets / Numbers.

Horizontal centring inside the frame (the style engine needs sub-cell
`colOff`, which `buildTechPackDrawingXml` currently hard-codes to 0):

```js
let gap = Math.max(0, Math.round((FRAME_W_PX - displayWidth) / 2));
const walk = [142, 332, 332].concat(Array.from({ length: 1 + N }, () => 87));
let col = 1;                                  // B
while (col - 1 < walk.length - 1 && gap >= walk[col - 1]) { gap -= walk[col - 1]; col += 1; }
// anchorCol = col, colOff = gap (px)
```

The reference's 320 px indent into C is hand-centring of a 1458 px image in a
~2169 px frame; the walk above reproduces the *intent* generically.

`rowOff = 9` px is read from the reference. Row height stays at the reference's
`331.5` pt even when a tall board makes the fitted image height-bound and
narrower than the frame — the frame is the reference's geometry, not the
image's.

---

## 6. Data gaps

Everything on the reference sheet that has no source in our state.

| # | Reference content | Status | Recommendation |
| --- | --- | --- | --- |
| G-01 | `B4`/`C4` `SUPPLIER/VENDORS` = `Wanting` | **no state** | **Add state.** Append a field to `state.mainPage.fields`: `{ label: 'Supplier/Vendors - 供应商', value: 'TBC', protoOnly: true }`. Why `mainPage.fields` and not a new top level key: it is style metadata that belongs beside Brand / Designers; the island is already serialized by `project-io.js` (`mainPage:`), already captured by history, and the field ladder already gives it an editor, an undo path and the `MP_FIELD_SPEC` suggestion picker plus `mp.fieldExtra` memory for off-roster values, for free. A top-level `state.supplier` would need a new project-io key, new history handling and a new editor surface for one string. Note: BOM already has a **per-row** `supplier` (`BM_CELL_FIELDS`) — that is a *material* supplier, a different thing from the pack's assembler; do **not** auto-derive one from the other. Append + regex-bind exactly the way `ensureMainPage()` added `Block Reference`; never insert by index (labels are editable and `mpResolveSpecs` binds by regex). |
| G-02 | `B6`/`C6` `DEVELOPMENT ROUND` = `Mock up` | **no state** | **Add state**, same island and same reasons: `{ label: 'Development Round - 开发轮次', value: 'Mock up', protoOnly: true }` plus an `MP_FIELD_SPEC` roster entry `{ key: 'devRound', re: /Development Round/i, values: [...] }`. It is a controlled vocabulary that changes every pack revision, and §3.2.2 has to quote it inside a sentence, so it needs exactly one editable home. The roster's member list is a TD question, not ours — seed it from the value we can prove (`Mock up`) and let `mp.fieldExtra` absorb whatever the TD types until FD confirms the list. |
| G-03 | Both new fields would also lengthen MAIN PAGE | **cross-sheet risk** | The reference MAIN PAGE prints neither field, and US-080 parity depends on the field ladder's row geometry. Hence the `protoOnly: true` flag: `buildMainPageSheetPart` and the MAIN PAGE preview skip flagged rows, `PROTO Direction` reads them. Recheck the US-080 caption-row lesson — a `<tr>` that is not a field breaks DOM-row-index-as-field-index; add these by append + regex bind only. |
| G-04 | The requested sample **version** (`Solid`) in `B14` | **no persisted state** | The Construction and BOM pages carry a lace/solid variant, but it is a **session-only UI selection** (`bmVariant`, `ccSheetKey`), not project state, so it must not drive an exported sentence. Add `state.proto.sampleVersion` (`'solid' \| 'lace'`), defaulting to whichever `state.mainPage.sketches[variant]` has a filled slot and to `'solid'` when both or neither do. |
| G-05 | The Chinese half of `B14` for a **lace** sample | **no verified translation** | The reference only ever states the solid case (`请制作L码素色版手板样 / 结构样。`). Substituting a lace term would be inventing a translation for a factory instruction. Ship the solid template only; when `sampleVersion === 'lace'` write the English line alone and let the TD type the Chinese into `state.proto.sampleRequest`. Raise the lace sentence with FD. |
| G-06 | `B13` bar has **no Chinese half** (`**Sample Request- `) | reference gap | **Hard-code as-is** (minus the trailing space). Blocks 1 and 2 carry `- 工艺评论` / `- 材料评论`; block 3 carries none. Do not invent `样品要求`. |
| G-07 | `B10`/`B12` body text | no state, always derivable | **Hard-code as factory boilerplate**, TD-overridable via `state.proto.constructionComment` / `.materialComment` with empty-means-default (§3.2.1). Both sentences point at sheets this same workbook contains, so the default is never wrong. |
| G-08 | `B16` naming caption | no state, none wanted | **Hard-code as factory boilerplate**, typo corrected. |
| G-09 | `C3` PRODUCT NAME as one authored string | **partially derivable** | Compose from the breakdown `parts` (§3.1.1). Do **not** add a fourth "product name" field — that would duplicate the breakdown sub-grid US-080 just built and let the two drift. Accept the cosmetic difference (D-07). |
| G-10 | Reference POM row wording, e.g. `Bottom band Width 1/2 - Relax - closet hook`, `Cradle height at bottom cup` | **not a gap** | Our contract names differ (`1/2 Bottom band - Relax`, POM 7 `Cradle height at bottom cup`). `POM_TEMPLATE` is the versioned source of truth; a TD who wants the factory's exact phrasing overrides per project via `state.pomSpecs[k].en` / `.zh`, which `getPomSpec` already honours. No state to add. |
| G-11 | Reference `B24` `Side Zipper height` / `侧边拉链高度`, and the duplicate row numbered `7` | **deliberately not reproduced** | ADR 0048 decision 7. An off-contract POM stays a custom POM (`state.customPoms`, numbering from 19) and gets its own row and number; we never emit two rows numbered `7`. |
| G-12 | Reference sample-size values (`14`, `19`, `17`, `22`, `4.5`, `1.75`, `2.375`, `7.5`, `8.25`, `3`, `6.5`, `5`, `12`) | **not a gap** | Same role as `getPomSpec(k).sizeL` (TD entry, else the Tier-0 library median). 1:1. |

---

## 7. `buildSpecSheetRows` contract change

The proto sheet must reuse the builder (ADR 0048 decision 4) while the Board's
single-sheet file stays **byte-identical** (decision 5, asserted by
`npm run export-xlsx`). So the builder gains an options bag whose defaults
reproduce today's bytes exactly:

```js
function buildSpecSheetRows(now, opts) {
  const o = opts || {};
  const colOffset = o.colOffset || 0;      // 0 = Board (A=POM);  1 = proto (A=gutter)
  const headerRow = o.headerRow || 3;      // 3 = Board;         17 = proto
  const bands     = o.bands !== false;     // true = Board's rows 1-2 title+style bands
  const xf        = o.xf || SPEC_XF;       // proto passes PD_XF (same key names)
  const heights   = o.heights || { band1: 26, band: 18, head: 20, data: null };
  const valueMode = o.valueMode || 'graded';   // 'graded' | 'baseOnly'
  const baseIdx   = o.baseIdx;             // required when valueMode === 'baseOnly'
  ...
}
```

Why the offset has to live inside the builder rather than be applied to the
returned strings: the graded cells are `specFormulaCell(ref, xf, baseCol + r ± Δ)`
where `baseCol = specColLetter(4 + lIdx)`. Shifting refs by string surgery would
leave the formulas pointing one column left of their base. (The proto sheet uses
`valueMode: 'baseOnly'` and emits no formulas at all, but the offset also moves
`A→B` … `E→F` for every literal ref, and a future graded proto variant must not
be a trap.)

Proto call:

```js
const { rowsData, pomKeys } = buildSpecSheetRows(now, {
  colOffset: 1, headerRow: 17, bands: false, xf: PD_XF,
  heights: { head: 15.75, data: 20.25 },
  valueMode: 'baseOnly', baseIdx,
});
```

Regression guard: `npm run export-xlsx` must still assert the Board file
byte-identical, and the new structural-diff suite asserts the proto block's row
set, EN/ZH/TOL text and POM numbering equal the Board sheet's for the same
project state.

---

## 8. Deviations

| # | Reference | Ours | Reason |
| --- | --- | --- | --- |
| D-01 | sheet 5 alone: `paperSize="1"` (Letter), default margins `0.7/0.7/0.75/0.75`, no `printOptions`, gridlines **on** | A4 (`paperSize="9"`), margins `0.2362/0.2362/0.748/0.748`, `horizontalCentered="1"`, `showGridLines="0"` | Sheet 5 was never page-set-up; sheets 1–4 all are. Values are read from sheets 2/3/4, not invented. A pack must not mix paper sizes or print gridlines on one page. |
| D-02 | no scaling | `fitToPage="1"`, `fitToWidth="1"`, `fitToHeight="0"` | 20 columns ≈ 2200 px cannot fit landscape at 100%; the reference prints across three sheets of paper. |
| D-03 | `topLeftCell="C18"` | `A1` | Saved scroll position, not layout. |
| D-04 | `dimension A1:AA996`; styled-empty rows 1–2, 7–8, `D3:AA6`, `E16:M16`, and `customHeight` rows 32–996 | nothing emitted outside the content range | ADR 0048 decision 1 (styled-empty aprons, 1000-row `customHeight` grids). |
| D-05 | size columns at three different widths: E–L `11.75`, M–P `13.1339285714286`, Q–S the `12.63…` default | every size column `11.75` | Three widths across one uniform numeric run is a hand-drag artifact; `11.75` is the one that covers most of the run. |
| D-06 | dead number formats on text/header cells: `C5` `dd\-mmm\-yy`, `E17` `#\ ??/??`, `R17`/`S17` `0.00`, the whole `D` column `#\ ?/?` | `General` on all of them | A fraction format on a Chinese description, or a date format on a text date, changes nothing visible and misleads anyone who edits the cell. |
| D-07 | `C3` `KiraForm vA 1.0` | breakdown parts joined by a single space, e.g. `KiraForm v.A 1` | `v.A → vA` and `1 → 1.0` are hand cosmetics with no rule behind them; inventing one would misrender other styles. |
| D-08 | trailing space in `**Sample Request- `; double space in `the  BOM Sheet` | single spaces, no trailing space | ADR 0048 decision 1 (trailing spaces). |
| D-09 | merged bars carry their fill on the anchor cell only | fill written on every cell of the merge | Existing `export-xlsx.js` `band()` convention — non-Excel viewers do not reliably paint a merge from its top-left cell. |
| D-10 | rows 11 and 13 have **no** `medR` on `{LAST}`; rows 9/10/12/14/15/16 do | `medR` on every one of rows 9–16 | The panel must be a closed box; the two missing edges are residue. |
| D-11 | `B14` left border **thin** where `B10`/`B12` are medium | medium on all three | Same closed-box reason. |
| D-12 | instruction bodies are rich text with the CJK run in `宋体-简` size 12 | one inline string per body, Arial 12, viewer font fallback for CJK | `sharedStrings` and rich-text runs are ADR 0048 non-goals; identical to how the Board export already writes the `Description - Chinese` column. |
| D-13 | `Meaaurement` in the row-16 caption | `Measurement` | ADR 0048 decision 7. |
| D-14 | 14 size columns; `4XL2` omitted | `selectedSizeRun()` — 15 by default, and exactly the reference's 14 when the TD deselects `4XL2` | The 15-size run is our grading contract (`SPEC_SIZE_RUN`); a per-style membership choice belongs in the export size picker, not hard-coded. |
| D-15 | all 14 size headers one peach `FFFBD4B4` | same — peach for every size header | Deviates from **our own** Board sheet, which tints each depth column separately (`SPEC_XF.headDepth0 + i`). The factory grid is what this sheet is for. |
| D-16 | last data row `ht="23.25"`, rows above `20.25` | `20.25` on every data row | One taller final row with no content difference is a hand artifact. |
| D-17 | per-cell style churn inside the data block: `C` full box vs right+bottom; `E` full box vs right+bottom; sample column alternating `#\ ??/??` and `#\ ?/?`; stray `FFF3F3F3` on `O20`; missing bottom border on `C30`…`S30` | one xf per column role; `#\ ??/??` everywhere; no stray fill; the sketch row's `medT` closes the table | Residue. `#\ ??/??` also matches the Board export's existing `numFmtId 164` `# ??/??`. |
| D-18 | picture named `image18.png`, title `Hình ảnh`, `preferRelativeResize="0"` | our own picture name, no title, `<a:picLocks noChangeAspect="1"/>` | ADR 0048 decision 1 (stale picture names). |
| D-19 | 8 orphan `ListObjects` over `I19:I20` … `I30` | none | ADR 0048 decision 1. |
| D-20 | footer carrying another company's legal notice | never emitted | ADR 0048 decision 2. |
| D-21 | duplicate POM number `7`; off-contract `Side Zipper height` row | no duplicate numbering; off-contract POMs are custom POMs numbered from 19 | ADR 0048 decision 7. |
| D-22 | TOL as date serials under `m/d` | TOL as verbatim text (`1/2`, `-`) | ADR 0048 decision 7; already `buildSpecSheetRows`' behaviour. |
| D-23 | values in the sample-size column only, no formulas | same — values in the base-size column only, no formulas | Matches the reference, and deviates from our Board export, which writes all selected sizes with live `=H{r}±Δ` formulas. ADR 0048 decision 5: the pack carries the proto sheet, the Board button carries the graded run. |

---

## 9. Open questions for FD

1. The `Development Round` roster (G-02) — only `Mock up` is evidenced.
2. The lace-version Chinese sample-request sentence (G-05).
3. Should `Supplier/Vendors` and `Development Round` also print on MAIN PAGE?
   The reference does not, hence `protoOnly: true` (G-03).
