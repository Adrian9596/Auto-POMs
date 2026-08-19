# Cell map — `MAIN PAGE`

Implementation-ready map for sheet 1 of the tech-pack workbook, written so the
hand-written OOXML writer in `src/render/export-xlsx.js` can reproduce it
without going back to the reference file.

Reference: `3916.KiraForm vA 1.0 17.05.2025(1).xlsx`, sheet `MAIN PAGE`
(`xl/worksheets/sheet1.xml`, `xl/drawings/drawing1.xml`, media `image1.png` /
`image2.png`). Every colour, width, height, border and offset below was read
out of that file — nothing here is a guess. Where a value could not be read
from a source, the row says so.

Governing decision: [ADR 0048](../../../../../decisions/0048-tech-pack-workbook-matches-the-factory-format.md).
Parity target is **readable/printable equivalence**, not byte fidelity.

Rows **1–23** are the whole sheet. Everything at row 24 and below in the
reference is a styled-empty apron (see Data Gaps DG-11) and is not emitted.

---

## 1. Sheet identity

| Property | Value | Source |
| --- | --- | --- |
| Worksheet name | `MAIN PAGE` | `xl/workbook.xml` `<sheet name="MAIN PAGE" sheetId="1">`; matches our existing `TECHPACK_SHEET_NAMES['mainpage']` |
| Sheet position | 1 of 5 (before `CONSTRUCTION DETAIL`, ` BOM-LACE`, `BOM-SOLID`, `PROTO Direction`) | `xl/workbook.xml` |
| Tab colour | `FF548DD4` — `<sheetPr><tabColor rgb="FF548DD4"/></sheetPr>` | sheet1.xml |
| `showGridLines` | `0` | `<sheetView showGridLines="0" …>` |
| Freeze panes | **none** — the reference has no `<pane>` element. Do not add one; the whole sheet is 23 rows on one page. | sheet1.xml |
| `topLeftCell` | Reference says `A14`; **emit `A1` (or omit the attribute)**. `A14` is a saved scroll position, not layout. | DEV-1 |
| `activeCell` / `selection` | Reference `activeCell="B14" sqref="B14:D14"`. Not emitted. | DEV-1 |
| `sheetFormatPr` | `defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"` | sheet1.xml |
| Paper | `paperSize="9"` (A4) | `<pageSetup>` |
| Orientation | `landscape` | `<pageSetup>` |
| Scale | `scale="93"` | `<pageSetup>` |
| `fitToPage` | **not used** — no `fitToWidth`/`fitToHeight`, no `<sheetPr><pageSetUpPr fitToPage="1"/>`. The fixed `scale="93"` is the mechanism. | sheet1.xml |
| Margins | `left="0" right="0" top="0" bottom="0" header="0" footer="0"` | `<pageMargins>` |
| Print centering | `<printOptions horizontalCentered="1" verticalCentered="1"/>` | sheet1.xml |
| Footer | `<headerFooter><oddFooter>&amp;C&amp;A</oddFooter></headerFooter>` — centred sheet name. **Kept**: it costs nothing and carries no third-party text. The "B Pty Ltd" legal notice ADR 0048 §2 forbids is on `CONSTRUCTION DETAIL` (sheet2), not here. | sheet1.xml |
| `dimension` | Emit `A1:J23`. (Reference says `A1:J1000` because of the apron.) | DEV-2 |
| `dataValidations` | Reference has one: `type="list"` on `B8`, `formula1="\"L\""`. **Not emitted** — `dataValidations` is an explicit ADR 0048 non-goal. | DG-12 |

### Theme colours

The reference's `theme1.xml` sets `lt1 = FFFFFF` and `dk1 = 000000`. Every
`theme0` fill in the reference therefore renders as pure white and every
`theme1` font colour as pure black. Shipping `theme1.xml` is an ADR 0048
non-goal, so **this map writes `FFFFFFFF` wherever the reference used
`theme0`, and `FF000000` wherever it used `theme1`** — visually identical,
zero new parts.

---

## 2. Column table

Widths are the raw `<col width>` values. Pixel figures use Excel's
`px ≈ round(width × 7 + 5)` at the default font and are given only to size the
picture wells.

| Col | `width` | ≈px | Role |
| --- | --- | --- | --- |
| A | `31.75` | 227 | Brand banner (`A1:A3`) and the right-aligned field-label column for every even row 4–22. |
| B | `20.8839285714286` | 151 | Credit-grid labels (`B1:B3`); field value cell — merge anchor for `B8:D8`…`B22:D22`; breakdown `style prefix` (`B5`/`B6`). |
| C | `15.75` | 115 | Credit-grid value — merge anchor `C1:D1`/`C2:D2`/`C3:D3`; field-value continuation; breakdown `category #:` (`C5`/`C6`). |
| D | `15.75` | 115 | Field-value continuation (right edge of the value box); breakdown `range no:` (`D5`/`D6`). Also the lace panel's left edge for rows 1–3 (D's right-thin border). |
| E | `16.1339285714286` | 118 | Lace panel: banner anchor (`E1:G3`), flat-well anchor (`E4:G10`), colorway `Col n` label (rows 18–23). |
| F | `16.1339285714286` | 118 | Lace panel: well interior; colorway value — merge anchor `F18:G18`…`F23:G23`. |
| G | `16.1339285714286` | 118 | Lace panel right edge (medium border). |
| H | `16.1339285714286` | 118 | Solid panel: banner anchor (`H1:J3`), flat-well anchor (`H4:J10`), colorway `Col n` label. |
| I | `16.1339285714286` | 118 | Solid panel: well interior; colorway value — merge anchor `I18:J18`…`I23:J23`. |
| J | `16.1339285714286` | 118 | Solid panel right edge (medium border). |

Well geometry that follows from the above: each flat well spans 3 columns
× 7 rows = **354 × 182 px**.

---

## 3. Style tokens

The reference hand-styles nearly every cell and drifts (see Deviations). This
map defines a small token set with the exact measured values; the row table
below refers to tokens. All border colours are `FF000000`. All fonts carry
`charset="134"` as the reference does (harmless, and it is what the source
declares).

| Token | Font | Fill | Borders | Alignment | numFmt |
| --- | --- | --- | --- | --- | --- |
| `BANNER_BRAND` | Arial 14 **bold**, `FFFFFFFF` | solid `FF0000FF` | L thin, R thin, T thin | v=center, wrap | General |
| `BANNER_BRAND_MID` | Arial 10, `FF000000` | none | L thin, R thin | — | General |
| `BANNER_BRAND_BOT` | Arial 10, `FF000000` | none | L thin, R thin, B thin | — | General |
| `CREDIT_LABEL` | Arial 12 **bold**, `FF000000` | solid `FFFFFFFF` | L/R/T/B thin | v=center, wrap | General |
| `CREDIT_VALUE` | Arial 12, `FF000000` | solid `FFFFFFFF` | L thin, T thin, B thin | v=center, wrap | General |
| `CREDIT_VALUE_END` | Arial 10, `FF000000` | none | R thin, T thin, B thin | — | General |
| `VER_BANNER` | Arial 14 **bold**, `FF000000` | solid `FFFFFFFF` | T thin | h=center, v=center, wrap | General |
| `VER_BANNER_T` | Arial 10 | none | T thin | — | General |
| `VER_BANNER_T_END` | Arial 10 | none | R medium, T thin | — | General |
| `VER_BANNER_MID_END` | Arial 10 | none | R medium | — | General |
| `VER_BANNER_B` | Arial 10 | none | B medium | — | General |
| `VER_BANNER_B_END` | Arial 10 | none | R medium, B medium | — | General |
| `FIELD_LABEL` | Calibri 12, `FF000000` | solid `FFFFFFFF` | L thin | h=right, v=center, wrap | General |
| `FIELD_VALUE` | Calibri 12, `FF000000` | solid `FFFDE9D9` | L thin, T thin, B thin | h=left, v=center | General |
| `FIELD_VALUE_BLUE` | Calibri 12, `FF000000` | solid `FF92CDDC` | L thin, T thin, B thin | h=left, v=center | General (`@` for `B8`) |
| `FIELD_VALUE_DATE` | Calibri 12, `FF000000` | solid `FFFDE9D9` | L thin, T thin, B thin | h=left, v=center | `176` = `dd\-mmm\-yy` |
| `FIELD_VALUE_MID` | Arial 10 | none | T thin, B thin | — | General |
| `FIELD_VALUE_END` | Arial 10 | none | R thin, T thin, B thin | — | General |
| `BD_CAPTION` | Calibri 11, `FF000000` | solid `FFFFFFFF` | none | h=center | General |
| `BD_CELL` | Calibri 12, `FF000000` | solid `FFFDE9D9` | L/R/T/B thin | h=center, v=center | General |
| `BD_CELL_MID` | Calibri 12, `FF000000` | solid `FFFDE9D9` | R thin, T thin, B thin | h=center, v=center | General |
| `SPACER_A` | Arial 10, `FF000000` | solid `FFFFFFFF` | L thin | h=right, wrap | General |
| `SPACER_BD` | Calibri 10, `FF000000` | solid `FFFFFFFF` | none | — | General |
| `CLOSE_A` | Arial 10, `FF000000` | solid `FFFFFFFF` | L thin, B thin | h=right, wrap | General |
| `CLOSE_BD` | Calibri 10, `FF000000` | solid `FFFFFFFF` | B thin | — | General |
| `WELL_ANCHOR` | Calibri 10, `FF000000` | solid `FFFFFFFF` | L thin, T medium | — | General |
| `WELL_T` | Arial 10 | none | T medium | — | General |
| `WELL_T_END` | Arial 10 | none | R medium, T medium | — | General |
| `WELL_L` | Arial 10 | none | L thin | — | General |
| `WELL_R` | Arial 10 | none | R medium | — | General |
| `WELL_BL` | Arial 10 | none | L thin, B thin | — | General |
| `WELL_B` | Arial 10 | none | B thin | — | General |
| `WELL_BR` | Arial 10 | none | R medium, B thin | — | General |
| `PANEL_GUTTER_L` | Calibri 10, `FF000000` | solid `FFFFFFFF` | L medium | — | General |
| `PANEL_GUTTER_M` | Calibri 10, `FF000000` | solid `FFFFFFFF` | none | h=right | General |
| `PANEL_GUTTER_R` | Calibri 10, `FF000000` | solid `FFFFFFFF` | R medium | — | General |
| `CW_LABEL` | Calibri 12 **bold**, `FF000000` | solid `FFFFFFFF` | L medium, R thin, T thin, B thin | h=right, v=center | General |
| `CW_LABEL_BOT` | as `CW_LABEL` + B thin (row 23 closes the panel) | — | L medium, R thin, T thin, B thin | h=right, v=center | General |
| `CW_VALUE_1` | Calibri 12, `FF000000` | solid `FFFCE5CD` | L thin, T thin, B thin | h=left, v=center | General |
| `CW_VALUE` | Calibri 12, `FF000000` | solid `FFFDE9D9` | L thin, T thin, B thin | h=left, v=center | General |
| `CW_VALUE_END` | Arial 10 | none | R medium, T thin, B thin | — | General |

Fill palette actually used on this sheet, all read from `xl/styles.xml`:
`FF0000FF` (brand banner), `FFFFFFFF` (white ground), `FF92CDDC` (blue field
value), `FFFDE9D9` (peach field/colorway value), `FFFCE5CD` (deeper peach —
**Col 1 only**).

Borders used: `thin` and `medium`, colour `FF000000`. No other style.

---

## 4. Row-by-row map

Row heights are the reference's `<row ht>` in points.

`mp` below means `state.mainPage` (seeded by `ensureMainPage()` in
`src/ui/main-page.js`). Field rows are bound **by regex against
`mp.fields[i].label`**, never by index — labels are `contenteditable`, so a
position is not trustworthy (same rule `mpResolveSpecs()` already follows).
Notation `F(/re/)` = `mp.fields.find(f => /re/i.test(f.label))`.

### Rows 1–3 — brand banner, credit grid, version banners

**Row 1 — `ht="23.25"`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A1` | Composite: `F(/^\s*Brand\b/).label + ': ' + F(/^\s*Brand\b/).value` → with our shipped roster this reads `Brand - 品牌: Crossian`. Reference literal was `Brand/品牌: Crossian`. | `BANNER_BRAND` | `A1:A3` |
| `B1` | `F(/Fashion Designer/).label` + `':'` if the label does not already end in `:` → `Fashion Designer:`. Reference literal `Fashion Designer: ` (trailing space dropped). | `CREDIT_LABEL` | — |
| `C1` | `F(/Fashion Designer/).value` (default `TBC`; reference `Tung Linh Nguyen`) | `CREDIT_VALUE` | `C1:D1` |
| `D1` | blank | `CREDIT_VALUE_END` | in `C1:D1` |
| `E1` | literal `Lace Version` (reference `Lace Version `; trailing space dropped). Factory boilerplate — derived from `MP_SKETCH_VARIANTS[0]`, matching the `.mp-vhead` text in `index.html`. | `VER_BANNER` | `E1:G3` |
| `F1` | blank | `VER_BANNER_T` | in `E1:G3` |
| `G1` | blank | `VER_BANNER_T_END` | in `E1:G3` |
| `H1` | literal `Solid Version` (reference `Solid Version `) — `MP_SKETCH_VARIANTS[1]` | `VER_BANNER` | `H1:J3` |
| `I1` | blank | `VER_BANNER_T` | in `H1:J3` |
| `J1` | blank | `VER_BANNER_T_END` | in `H1:J3` |

**Row 2 — `ht="23.25"`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A2` | blank (merge body) | `BANNER_BRAND_MID` | in `A1:A3` |
| `B2` | `F(/Tech Pack Designer/).label + ':'` → `Tech Pack Designer:` (matches reference verbatim) | `CREDIT_LABEL` | — |
| `C2` | `F(/Tech Pack Designer/).value` (reference `Nguyễn Thị Hồng Hạnh `) | `CREDIT_VALUE` | `C2:D2` |
| `D2` | blank | `CREDIT_VALUE_END` | in `C2:D2` |
| `G2` | blank | `VER_BANNER_MID_END` | in `E1:G3` |
| `J2` | blank | `VER_BANNER_MID_END` | in `H1:J3` |

**Row 3 — `ht="33"`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A3` | blank (merge body) | `BANNER_BRAND_BOT` | in `A1:A3` |
| `B3` | `F(/Technical Designer/).label + ':'` → `Technical Designer:` (matches reference verbatim) | `CREDIT_LABEL` | — |
| `C3` | `F(/Technical Designer/).value` (reference `Tuyen Van Bui`) | `CREDIT_VALUE` | `C3:D3` |
| `D3` | blank | `CREDIT_VALUE_END` | in `C3:D3` |
| `E3`,`F3` | blank | `VER_BANNER_B` | in `E1:G3` |
| `G3` | blank | `VER_BANNER_B_END` | in `E1:G3` |
| `H3`,`I3` | blank | `VER_BANNER_B` | in `H1:J3` |
| `J3` | blank | `VER_BANNER_B_END` | in `H1:J3` |

> The reference's `A3` also carries a stray literal `v` in some releases; this
> file's `A3` is empty. Either way nothing is emitted (ADR 0048 §1).

### Rows 4–22 — the field ladder (fields on EVEN rows, spacers on ODD)

Every field row follows one shape:

```
A{r} = label            FIELD_LABEL          (no merge)
B{r} = value            FIELD_VALUE*         merge B{r}:D{r}   (B4:C4 is the exception)
C{r} = blank            FIELD_VALUE_MID      in the merge
D{r} = blank            FIELD_VALUE_END      in the merge
```

and every spacer row:

```
A{r} = blank            SPACER_A
B{r},C{r},D{r} = blank  SPACER_BD
```

**Row 4 — `ht="19.5"` — Product Type**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A4` | `F(/Product Type/).label` → `Product Type - 品类` (identical to reference) | `FIELD_LABEL` | — |
| `B4` | `F(/Product Type/).value` → `Bra` (reference `Bra`) | `FIELD_VALUE_BLUE` | **`B4:C4`** (2 cells wide — the reference's only narrow value box; reproduced, see DEV-6) |
| `C4` | blank | `FIELD_VALUE_END` | in `B4:C4` |
| `D4` | **not emitted.** Reference `D4` carries an empty Calibri **48pt bold** cell — residue. | — | — |
| `E4` | blank — lace well anchor | `WELL_ANCHOR` | `E4:G10` |
| `F4` | blank | `WELL_T` | in `E4:G10` |
| `G4` | blank | `WELL_T_END` | in `E4:G10` |
| `H4` | blank — solid well anchor. Reference holds a single space `' '`; **dropped** (ADR 0048 §1). | `WELL_ANCHOR` | `H4:J10` |
| `I4` | blank | `WELL_T` | in `H4:J10` |
| `J4` | blank | `WELL_T_END` | in `H4:J10` |

**Row 5 — `ht="19.5"` — breakdown captions (the only non-blank odd row)**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A5` | blank | `SPACER_A` | — |
| `B5` | `MP_BREAKDOWN_PARTS[0].head` → `style prefix` (reference `style prefix`) | `BD_CAPTION` | — |
| `C5` | `MP_BREAKDOWN_PARTS[1].head` → `category #:` (reference `category #:`) | `BD_CAPTION` | — |
| `D5` | `MP_BREAKDOWN_PARTS[2].head` → `range no:` (reference `range no: `, trailing space dropped) | `BD_CAPTION` | — |
| `E5` | blank | `WELL_L` | in `E4:G10` |
| `G5` | blank | `WELL_R` | in `E4:G10` |
| `H5` | blank | `WELL_L` | in `H4:J10` |
| `J5` | blank | `WELL_R` | in `H4:J10` |

**Row 6 — `ht="19.5"` — Style No Breakdown (three sub-cells, NOT merged)**

Let `bd = F(/Style No Breakdown/)`; `bd.parts` is authoritative and `bd.value`
is the derived composite (`mpBreakdownValue`) — **the sheet prints the parts,
never the composite**.

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A6` | `bd.label` → `Style No Breakdown - 风格号码分解` (identical to reference) | `FIELD_LABEL` | — |
| `B6` | `bd.parts.prefix` (reference `KiraForm`) | `BD_CELL` | — |
| `C6` | `bd.parts.category` (reference `v.A`) | `BD_CELL_MID` | — |
| `D6` | `bd.parts.rangeNo` (reference numeric `1`; ours is a string — see DEV-8) | `BD_CELL` | — |
| `E6`,`H6` | blank | `WELL_L` | in the wells |
| `G6`,`J6` | blank | `WELL_R` | in the wells |

**Row 7 — `ht="19.5"` — spacer.** `A7` `SPACER_A`; `B7`–`D7` `SPACER_BD`;
`E7`/`H7` `WELL_L`; `G7`/`J7` `WELL_R`.

**Row 8 — `ht="19.5"` — Base Size**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A8` | `F(/Base Size/).label` → `Base Size - 基础尺码` (identical) | `FIELD_LABEL` | — |
| `B8` | `F(/Base Size/).value` (default `TBC`; reference empty). **numFmt `@`** (text) as in the reference. | `FIELD_VALUE_BLUE` with numFmt `@` | `B8:D8` |
| `C8` | blank | `FIELD_VALUE_MID` | in `B8:D8` |
| `D8` | blank | `FIELD_VALUE_END` | in `B8:D8` |
| `E8`,`H8` | blank | `WELL_L` | — |
| `G8`,`J8` | blank | `WELL_R` | — |

**Row 9 — `ht="19.5"` — spacer.** Same as row 7.

**Row 10 — `ht="19.5"` — Size Range (also the well's bottom edge)**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A10` | `F(/Size Range/).label` → `Size Range - 尺寸范围` (identical) | `FIELD_LABEL` | — |
| `B10` | `F(/Size Range/).value` (default `TBC`; reference empty) | `FIELD_VALUE` | `B10:D10` |
| `C10` | blank | `FIELD_VALUE_MID` | in `B10:D10` |
| `D10` | blank | `FIELD_VALUE_END` | in `B10:D10` |
| `E10` | blank | `WELL_BL` | in `E4:G10` |
| `F10` | blank | `WELL_B` | in `E4:G10` |
| `G10` | blank | `WELL_BR` | in `E4:G10` |
| `H10` | blank | `WELL_BL` | in `H4:J10` |
| `I10` | blank | `WELL_B` | in `H4:J10` |
| `J10` | blank | `WELL_BR` | in `H4:J10` |

**Row 11 — `ht="19.5"` — spacer + panel gutter opens**

`A11` `SPACER_A`; `B11`–`D11` `SPACER_BD` (reference `C11`/`D11` carry an
empty blue-bold-10pt style — residue, dropped);
`E11`/`H11` `PANEL_GUTTER_L`; `F11`/`I11` `PANEL_GUTTER_M`;
`G11`/`J11` `PANEL_GUTTER_R`.

**Row 12 — `ht="19.5"` — Style No**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A12` | `F(/Style No\b/).label` → `Style No - 风格号码` (identical). **Bind `/Style No Breakdown/` first**, or this regex claims the breakdown row. | `FIELD_LABEL` | — |
| `B12` | `F(/Style No\b/).value` (default `TBC`; reference empty) | `FIELD_VALUE` | `B12:D12` |
| `C12`,`D12` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B12:D12` |
| `E12`/`H12` | blank | `PANEL_GUTTER_L` | — |
| `F12`/`I12` | blank | `PANEL_GUTTER_M` | — |
| `G12`/`J12` | blank | `PANEL_GUTTER_R` | — |

**Row 13 — `ht="19.5"` — spacer + gutter.** Same cell set as row 11.

**Row 14 — `ht="19.5"` — Garment Description**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A14` | `F(/Garment Description/).label` → `Garment Description - 文胸分类` (identical) | `FIELD_LABEL` | — |
| `B14` | `F(/Garment Description/).value` (reference `Breathable side opening bra `) | `FIELD_VALUE` | `B14:D14` |
| `C14`,`D14` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B14:D14` |
| gutter | as row 11 | | |

**Row 15 — `ht="19.5"` — spacer + gutter.**

**Row 16 — `ht="19.5"` — Range Name**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A16` | `F(/Range Name/).label` → `Range Name - 产品名` (identical) | `FIELD_LABEL` | — |
| `B16` | `F(/Range Name/).value` (default `TBC`; reference empty) | `FIELD_VALUE` | `B16:D16` |
| `C16`,`D16` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B16:D16` |
| gutter | as row 11 | | |

**Row 17 — `ht="19.5"` — spacer + gutter.**

**Row 18 — `ht="19.5"` — Season/Year **and** colorway `Col 1`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A18` | `F(/Season/).label` → `Season/Year - 季节/年` (reference `Season/ Year - 季节/年`; see DEV-7) | `FIELD_LABEL` | — |
| `B18` | `F(/Season/).value` — ours is `SS26`/`AW26` from `mpSeasonOpts()`, a **string**. Reference held numeric `2026`. See DEV-9. | `FIELD_VALUE_BLUE` | `B18:D18` |
| `C18`,`D18` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B18:D18` |
| `E18` | literal `Col 1` | `CW_LABEL` | — |
| `F18` | colorway 1 display string (see §4.1) — reference `Default White` | **`CW_VALUE_1`** — the deeper `FFFCE5CD`, Col 1 only | `F18:G18` |
| `G18` | blank | `CW_VALUE_END` | in `F18:G18` |
| `H18` | literal `Col 1` | `CW_LABEL` | — |
| `I18` | same colorway-1 string — reference `Default White` | `CW_VALUE_1` | `I18:J18` |
| `J18` | blank | `CW_VALUE_END` | in `I18:J18` |

**Row 19 — `ht="19.5"` — spacer + colorway `Col 2`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A19` | blank | `SPACER_A` | — |
| `B19`–`D19` | blank | `SPACER_BD` | — |
| `E19` | literal `Col 2` | `CW_LABEL` | — |
| `F19` | colorway 2 string — reference `Default Black` | `CW_VALUE` | `F19:G19` |
| `G19` | blank | `CW_VALUE_END` | in `F19:G19` |
| `H19` | literal `Col 2` | `CW_LABEL` | — |
| `I19` | colorway 2 string | `CW_VALUE` | `I19:J19` |
| `J19` | blank | `CW_VALUE_END` | in `I19:J19` |

**Row 20 — `ht="19.5"` — Tech Pack Creation date **and** `Col 3`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A20` | `F(/Tech Pack Creation date/).label` → `Tech Pack Creation date` (identical to reference) | `FIELD_LABEL` (reference used Arial 10 with no fill here — DEV-4) | — |
| `B20` | `F(/Tech Pack Creation date/).value` is ISO `YYYY-MM-DD` from `mpIsoToday()`. Emit as a **numeric 1900-system serial** (`(date − 1899-12-30)` in days), i.e. `46331` for 2026-11-05, the reference's own value. | `FIELD_VALUE_DATE` (numFmt `176` = `dd\-mmm\-yy`) — see DG-13 | `B20:D20` |
| `C20`,`D20` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B20:D20` |
| `E20` | literal `Col 3` | `CW_LABEL` | — |
| `F20` | colorway 3 string — reference `14-1212 TCX - Nude Tan CP` | `CW_VALUE` | `F20:G20` |
| `G20` | blank | `CW_VALUE_END` | in `F20:G20` |
| `H20` | literal `Col 3` | `CW_LABEL` | — |
| `I20` | colorway 3 string | `CW_VALUE` | `I20:J20` |
| `J20` | blank | `CW_VALUE_END` | in `I20:J20` |

**Row 21 — `ht="19.5"` — spacer + `Col 4`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A21` | blank | `SPACER_A` | — |
| `B21`–`D21` | blank | `SPACER_BD` | — |
| `E21` | literal `Col 4` | `CW_LABEL` | — |
| `F21` | colorway 4 string — reference `12-1304 TCX - Light Pink CP` | `CW_VALUE` | `F21:G21` |
| `G21` | blank | `CW_VALUE_END` (reference degrades to *thin* right border here — DEV-5) | in `F21:G21` |
| `H21` | literal `Col 4` | `CW_LABEL` (reference drops the left *medium* here — DEV-5) | — |
| `I21` | colorway 4 string | `CW_VALUE` | `I21:J21` |
| `J21` | blank | `CW_VALUE_END` | in `I21:J21` |

**Row 22 — `ht="19.5"` — Block Reference **and** `Col 5`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A22` | `F(/^Block Reference\b/).label` → `Block Reference - 原版品` (reference `Block Reference - 原版品:` — trailing colon; DEV-7) | `FIELD_LABEL` | — |
| `B22` | `F(/^Block Reference\b/).value` (default `TBC`; reference empty) | `FIELD_VALUE` | `B22:D22` |
| `C22`,`D22` | blank | `FIELD_VALUE_MID`, `FIELD_VALUE_END` | in `B22:D22` |
| `E22` | literal `Col 5` | `CW_LABEL` | — |
| `F22` | colorway 5 string — reference `14-4306 TCX - Coral Blue CP` | `CW_VALUE` | `F22:G22` |
| `G22` | blank | `CW_VALUE_END` | in `F22:G22` |
| `H22` | literal `Col 5` | `CW_LABEL` | — |
| `I22` | colorway 5 string | `CW_VALUE` | `I22:J22` |
| `J22` | blank | `CW_VALUE_END` | in `I22:J22` |

**Row 23 — `ht="22.5"` — closing rule + `Col 6`**

| Cell | Content | Style | Merge |
| --- | --- | --- | --- |
| `A23` | blank | `CLOSE_A` | — |
| `B23`,`C23`,`D23` | blank | `CLOSE_BD` | — |
| `E23` | literal `Col 6` | `CW_LABEL_BOT` | — |
| `F23` | colorway 6 string — reference `18-3211 TCX - Dusty Purple CP` | `CW_VALUE` + B thin | `F23:G23` |
| `G23` | blank | `CW_VALUE_END` + B thin | in `F23:G23` |
| `H23` | literal `Col 6` | `CW_LABEL_BOT` | — |
| `I23` | colorway 6 string | `CW_VALUE` + B thin | `I23:J23` |
| `J23` | blank | `CW_VALUE_END` + B thin | in `I23:J23` |

### 4.1 Colorway value string

Rows 18–23 are a **fixed six-row printed form**. For `k = 0…5`:

```js
const cw = (state.mainPage.colorways || [])[k];
// ADR 0048 §8 adds `code` + `name`; `value` remains the composite for old projects.
const text = !cw ? ''
  : (cw.code ? cw.code + ' - ' + cw.name : (cw.name || cw.value || ''));
```

- The `' - '` join is what makes `14-1212 TCX Nude Tan CP` (our
  `MP_COLOR_MASTER` entry) print as the reference's
  `14-1212 TCX - Nude Tan CP`. This is exactly the split ADR 0048 §8 calls
  for; it does not exist in `src/ui/main-page.js` yet (**DG-14**).
- Entries with no code (`Default White`, `Default Black`, `Nude Beige`,
  `Zenchic Pink`, …) print the bare name — matching the reference's rows 18–19.
- The `Col n` label is the **literal** `'Col ' + (k + 1)`, not `cw.col`. Our
  `cw.col` is `'COL n'` (upper case) and is renumbered on delete, so it
  carries nothing the index does not (DEV-10).
- Fewer than 6 colorways → the remaining rows print their `Col n` label with an
  **empty value cell**; the frame must stay intact or the panel does not close.
- More than 6 → rows 7+ have **no cell on this grid** (**DG-17**).
- Both panels print the **same** list: `state.mainPage.colorways` is shared by
  lace and solid (as it is on the page and in both BOM sheets). The reference
  does likewise — `F18:F23` and `I18:I23` are identical strings.

### 4.2 The 14 `MP_DEFAULT_FIELDS` → grid mapping

| # | `MP_DEFAULT_FIELDS` label | Binding regex | Lands on |
| --- | --- | --- | --- |
| 0 | `Brand - 品牌` | `/^\s*Brand\b/i` | `A1` composite, inside merge `A1:A3` |
| 1 | `Fashion Designer` | `/Fashion Designer/i` | `B1` label + `C1:D1` value |
| 2 | `Tech Pack Designer` | `/Tech Pack Designer/i` | `B2` label + `C2:D2` value |
| 3 | `Technical Designer` | `/Technical Designer/i` | `B3` label + `C3:D3` value |
| 4 | `Product Type - 品类` | `/Product Type/i` | `A4` + `B4:C4` |
| 5 | `Style No Breakdown - 风格号码分解` | `/Style No Breakdown/i` | `A6` + `B5:D5` captions + `B6`/`C6`/`D6` parts |
| 6 | `Base Size - 基础尺码` | `/Base Size/i` | `A8` + `B8:D8` |
| 7 | `Size Range - 尺寸范围` | `/Size Range/i` | `A10` + `B10:D10` |
| 8 | `Style No - 风格号码` | `/Style No\b/i` (**after** #5) | `A12` + `B12:D12` |
| 9 | `Garment Description - 文胸分类` | `/Garment Description/i` | `A14` + `B14:D14` |
| 10 | `Range Name - 产品名` | `/Range Name/i` | `A16` + `B16:D16` |
| 11 | `Season/Year - 季节/年` | `/Season/i` | `A18` + `B18:D18` |
| 12 | `Tech Pack Creation date` | `/Tech Pack Creation date/i` | `A20` + `B20:D20` |
| 13 | `Block Reference - 原版品` | `/^Block Reference\b/i` | `A22` + `B22:D22` |

Bind in this order and mark each matched index as taken (the
`mpResolveSpecs()` pattern), so a renamed label cannot double-claim a slot.

**A field a TD adds beyond this roster.** The MAIN PAGE UI has no
"add field" control — `mpRenderFields()` only renders `mp.fields`, and
`ensureMainPage()` only ever *appends* `Block Reference`. A 15th row can
therefore only arrive from a project file (hand-edited, or saved by a future
build with a longer roster). The factory grid has **no cell for it**: rows 4–22
are ten fixed even rows and every odd row is a styled spacer that closes the
ladder. Rule:

1. Emit the 14 bound rows exactly as mapped.
2. Any `mp.fields` row that no regex claimed is **not printed on MAIN PAGE**,
   and the exporter must `console.warn` + surface a `showToast` naming the
   dropped labels — silently losing a TD's field is the failure mode to avoid.
3. It stays in `state.mainPage.fields` and in the saved project, so nothing is
   destroyed; a later story can add rows to `PROTO Direction`.

**Where the two NEW fields must NOT appear.** ADR 0048 §8 adds
`Supplier / Vendors` and `Development Round` **for the `PROTO Direction`
header**. They must **not** be added to `MP_DEFAULT_FIELDS` and must **not**
appear anywhere on `MAIN PAGE` — the reference's MAIN PAGE has neither, and
the grid has no free even row (4–22 are fully allocated; rows 24+ are the
dropped apron). Concretely: they belong in their own state slot
(e.g. `state.protoDirection`), not in `state.mainPage.fields`, precisely so the
MAIN PAGE binder in §4.2 cannot pick them up. If they are ever put into
`mp.fields`, rule 2 above will drop them with a warning — correct behaviour,
but the wrong place to put them.

---

## 5. Merge list

29 merges. The reference has 30; `A26:G27` is dropped (DG-11).

```
A1:A3      C1:D1      C2:D2      C3:D3
B4:C4
B8:D8      B10:D10    B12:D12    B14:D14    B16:D16    B18:D18    B20:D20    B22:D22
E1:G3      H1:J3
E4:G10     H4:J10
F18:G18    F19:G19    F20:G20    F21:G21    F22:G22    F23:G23
I18:J18    I19:J19    I20:J20    I21:J21    I22:J22    I23:J23
```

Not merged, deliberately: `B5`/`C5`/`D5` (captions) and `B6`/`C6`/`D6`
(breakdown parts) are six single cells — the reference has no merge there, and
the three-column sub-grid is the whole point of the row.

---

## 6. Image table

Two pictures, one per version well. Each is a **single composed PNG** holding
that version's FRONT and BACK flats side by side — exactly what the reference
does: `image2.png` (2048 × 637) is one bitmap with the lace front on the left
half and the lace back on the right; `image1.png` (2048 × 644) is the solid
pair. There are no separate front/back pictures and no captions in the well.

Source of our bytes: `mpSketchDataURL(variant, i)` for `i = 0` (FRONT) and
`i = 1` (BACK), which reads `mpSketchDataById` via
`state.mainPage.sketches[variant][i].id`; per-slot aspect is
`state.mainPage.sketches[variant][i].aspect` (measured once in
`mpSetSketch`). Bytes are re-encoded through the existing
`pngBytesFromDataURL(dataURL, 1200)` and drawn into one canvas by a new
`mpComposeWellPng(variant)`.

Composition rule (deterministic, aspect-preserving):

- Working canvas height `H = 640` px (the reference bitmaps are 637/644 px tall).
- `A = max(aspect)` over the **present** slots of that variant.
- Both slots present → canvas is `2 × round(H × A)` wide, two equal half-cells;
  each flat is drawn *contained* in its half, centred, aspect preserved, on an
  opaque white ground.
- One slot present → canvas is `round(H × A)` wide, single cell (no empty gap).
- Neither slot present → **no picture is emitted** for that variant; the well
  is still drawn, framed and empty (the reference frames the well with
  borders, not with the picture).

| # | Render | Variant | Anchor cell | `colOff` | `rowOff` | Display | Aspect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `mpComposeWellPng('lace')` | lace | `E5` (`<xdr:col>4</xdr:col>`, `<xdr:row>4</xdr:row>`) | **11.87 px** = `113030` EMU | **1.67 px** = `15875` EMU | `340 × round(340 / aspect)` px, clamped (below) | preserved — explicit `cx`/`cy` from the composed PNG's own ratio, plus `<a:picLocks noChangeAspect="1"/>` |
| 2 | `mpComposeWellPng('solid')` | solid | `H5` (`<xdr:col>7</xdr:col>`, `<xdr:row>4</xdr:row>`) | **11.87 px** = `113030` EMU | **1.67 px** = `15875` EMU | same rule | same |

Anchor type: `xdr:oneCellAnchor` with an explicit `<xdr:ext>` — the shape
`buildTechPackDrawingXml()` already emits; it needs `colOff`/`rowOff`
parameters added (today it hard-codes `0`).

Measured reference geometry, for the record:

| Reference picture | anchor | colOff | rowOff | ext (EMU) | ext (px) | native | ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `image2.png` → lace well | col 4 / row 4 (`E5`) | `113030` = 11.87 px | `15875` = 1.67 px | `3243580 × 1004570` | 340.53 × 105.47 | 2048 × 637 (3.2151) | 3.2288 |
| `image1.png` → solid well | col 7 / row 4 (`H5`) | `166370` = 17.47 px | `70485` = 7.40 px | `3168015 × 982980` | 332.60 × 103.20 | 2048 × 644 (3.1801) | 3.2229 |

Both wells are the same 354 × 182 px box, so the reference's two different
offsets and two different widths are hand-drag noise. **We use the lace
picture's numbers for both** (11.87 / 1.67 px, 340 px wide) — DEV-11.

Height clamp: anchoring at row 5 puts the picture `26 + 1.67 = 27.67` px below
the well's top, leaving `182 − 27.67 ≈ 154` px. If
`round(340 / aspect) > 152`, set `cy = 152 px` and
`cx = round(152 × aspect)` so a tall composition shrinks instead of spilling
past the well's bottom rule. (Reference heights 105 / 103 px clear this
easily; a single-slot composition of a near-square flat would not.)

Picture names: emit `Image 1` / `Image 2` as `buildTechPackDrawingXml()`
already does. The reference's `image10.png` / `image3.png` `cNvPr` names are
stale leftovers (ADR 0048 §1).

---

## 7. Data gaps

Things on the reference sheet with no source in our state, and the call.

| ID | Reference item | Our source | Recommendation |
| --- | --- | --- | --- |
| DG-1 | `A3` stray literal `v` (reported in FD's copy; empty in this one) | none | **Drop** — ADR 0048 §1 residue. |
| DG-2 | `H4` value `' '` (single space) | none | **Drop** — ADR 0048 §1. |
| DG-3 | `D4` empty cell styled Calibri **48pt bold**, white fill | none | **Drop the cell entirely.** It carries no text; the 48pt is an abandoned title style. |
| DG-4 | `C11` / `D11` empty cells styled Calibri 10 **bold, font `FF0000FF`** | none | **Drop** — residue. |
| DG-5 | Trailing spaces on `B1` `'Fashion Designer: '`, `E1` `'Lace Version '`, `H1` `'Solid Version '`, `D5` `'range no: '`, `B14` `'Breathable side opening bra '`, `C2` `'Nguyễn Thị Hồng Hạnh '` | our values have no trailing space | **Drop** — ADR 0048 §1. |
| DG-6 | `A18` label `'Season/ Year - 季节/年'` (space after the slash) | `MP_DEFAULT_FIELDS[11].label` = `Season/Year - 季节/年` | **Print ours.** The label is TD-editable state; we must not overwrite it to match a typo. See DEV-7. |
| DG-7 | `A22` label `'Block Reference - 原版品:'` (trailing colon) | `MP_DEFAULT_FIELDS[13].label` = `Block Reference - 原版品` | **Print ours** (DEV-7). |
| DG-8 | `A1` composite uses `/` between EN and ZH: `Brand/品牌: Crossian` | `MP_DEFAULT_FIELDS[0]` = label `Brand - 品牌`, value `Crossian` | **Compose from ours**: `label + ': ' + value`. Do not rewrite the separator — it is a TD-editable label. |
| DG-9 | `B1`/`B2`/`B3` credit labels end in `:` | our labels are `Fashion Designer`, `Tech Pack Designer`, `Technical Designer` (no colon) | **Append a single `:`** when the label does not already end in one. Reproduces the grid without inventing text. |
| DG-10 | `E1` `'Lace Version'` / `H1` `'Solid Version'` | no state string — `index.html`'s `.mp-vhead` hard-codes these and `MP_SKETCH_VARIANTS = ['lace','solid']` fixes the order | **Hard-code as factory boilerplate**, derived from the `MP_SKETCH_VARIANTS` order (lace left, solid right — same as the reference). |
| DG-11 | Merged empty apron `A26:G27` (+ styled-empty grid to row 1000, `customHeight` on all of it) | none | **Drop** — ADR 0048 §1. Emit `dimension="A1:J23"` and nothing past row 23. |
| DG-12 | `dataValidation type="list"` on `B8`, `formula1="\"L\""` | `MP_ALPHA_SIZES` is our equivalent roster, offered in the UI picker | **Drop from the export** — ADR 0048 non-goal. The picker already constrains what a TD types. |
| DG-13 | `B20` numeric `46331` under **`numFmtId="58"`** — an East-Asian locale builtin that the workbook never declares in `<numFmts>` (openpyxl reads it as `General`) | `mpIsoToday()` gives ISO `YYYY-MM-DD` | **Convert ISO → 1900-system serial** and format with **`numFmtId="176"`, `formatCode="dd\-mmm\-yy"`** — a code the reference workbook itself declares, unambiguous to a factory reader. Do not reproduce `58`. |
| DG-14 | Colorway strings carry a `CODE - Name` split (`14-1212 TCX - Nude Tan CP`); our `MP_COLOR_MASTER` entries have no dash (`14-1212 TCX Nude Tan CP`) | `state.mainPage.colorways[k]` is `{ col, value, hex }` today — **no `code`/`name`** | **Add state** — this is ADR 0048 §8. Split each `colorways[k]` into `code` + `name` (keep `value` as the composite for back-compat and for readers that still use it), and seed the split by parsing `MP_COLOR_MASTER` on the Pantone-code prefix. Needed by BOM (two lines) as well as here. |
| DG-15 | Reference has no cell for `state.mainPage.provenance` | our free-text note, rendered at `#mp-provenance` | **Do not print it on MAIN PAGE.** Rows 1–23 are full and the only spare space is the dropped apron. It stays on screen and in the project file. (The current exporter's `Provenance` band goes away with the old layout.) |
| DG-16 | Reference has no per-slot FRONT/BACK caption in the wells | our page draws `.mp-sk-tag` labels | **Do not draw the tags** into the composed PNG — the reference well has no captions and the left/right pair reads as front/back. |
| DG-17 | Reference grid has exactly 6 colorway rows | `mp.colorways` is unbounded (`mpAddColor` pushes; no cap) | **Print the first 6**; warn (`showToast`) when there are more, naming the count, and note that BOM prints all of them. Do not silently truncate. |
| DG-18 | Reference `cNvPr` names `image10.png` / `image3.png` | none | **Drop** — stale (ADR 0048 §1). |
| DG-19 | `B8`, `B10`, `B12`, `B16`, `B22` are **empty** in the reference release | ours default to `TBC` | Not a gap — print our values. A factory reader prefers an explicit `TBC` to a blank. |

---

## 8. Deviations

Every place we knowingly differ from the reference sheet, with the reason.

| ID | Deviation | Reason |
| --- | --- | --- |
| DEV-1 | `topLeftCell="A1"` (or omitted) instead of `A14`; no `activeCell`/`selection` | A saved scroll position is not layout; landing a factory reader mid-sheet reads as a bug. |
| DEV-2 | `dimension="A1:J23"`; nothing emitted past row 23 | The reference's rows 24–1000 are a styled-empty apron with `customHeight` on every row (ADR 0048 §1). |
| DEV-3 | Every `theme0` fill becomes solid `FFFFFFFF`; every `theme1` font colour becomes `FF000000` | `theme1.xml` sets `lt1 = FFFFFF` / `dk1 = 000000`, so this renders identically — and shipping `theme1.xml` is an ADR 0048 non-goal. |
| DEV-4 | One `FIELD_LABEL` token for all of `A4`…`A22`, and one `SPACER_A` for all odd rows | The reference uses five different label styles down column A (`xf159` Calibri 12 white-fill; `xf169` + right-thin on `A8`/`A10`; `xf181` + wrap on `A16`/`A18`; `xf188` **Arial 10, no fill** on `A20`; `xf190` no fill on `A21`) — hand-editing drift, not design. Regularised to the majority (Calibri 12, white fill, left thin, right/centre, wrap). |
| DEV-5 | The two version panels get **identical** colorway styling: `CW_LABEL` (left **medium** + thin box) on all of `E18:E23` *and* `H18:H23`, and `CW_VALUE_END` (right **medium**) on all of `G18:G23` *and* `J18:J23` | The reference's panels do not match each other: lace labels (`xf184`) have only a left-medium and **no** top/bottom rules while solid labels (`xf186`) have the full box; `H21`/`H22`/`H23` (`xf191`) **lose** the left medium; `F21:G23`/`I21:J23` (`xf138`) degrade the panel's right edge from medium to thin. Two panels that should be twins looking different is exactly the readability failure parity is meant to fix. |
| DEV-6 | `B4:C4` (2 cells) is reproduced as-is, but `D4` is emitted as **no cell at all** rather than the reference's 48pt-styled blank | The narrow Product Type box is visible layout, so it stays. The 48pt style is residue (DG-3), and dropping the cell leaves `D4` unbordered exactly as the reference renders it. |
| DEV-7 | Labels come from `state.mainPage.fields[i].label`, so `A18` prints `Season/Year - 季节/年` (not `Season/ Year …`) and `A22` prints `Block Reference - 原版品` (not `… 原版品:`) | Labels are TD-editable state. Rewriting them to match the reference's stray space and colon would silently overwrite a TD's own text — and both are cosmetic. |
| DEV-8 | `D6` (`range no:`) is written as an **inline string**, not a number | Reference `D6` is numeric `1`; our `bd.parts.rangeNo` is a free-text string (a TD types `1.0`, `2`, `A1`). Coercing it to a number would lose `1.0` → `1` — the exact class of drift `mpBreakdownValue` exists to prevent. |
| DEV-9 | `B18` (Season/Year) is written as an **inline string** | Reference holds numeric `2026`; `mpSeasonOpts()` produces `SS26`/`AW26`, which encodes the season the bare year drops. ADR 0048 §7 ("where the reference is wrong, we are right"). |
| DEV-10 | Colorway row labels are the literals `Col 1`…`Col 6`, not `state.mainPage.colorways[k].col` | The grid is a fixed six-row printed form. Our `col` is `'COL n'` (upper case) and is auto-renumbered on delete, so it carries no information the row index does not — and printing `COL 1` where the factory expects `Col 1` is a needless difference. |
| DEV-11 | Both pictures use the **same** anchor offsets (11.87 / 1.67 px) and the same 340 px display width | The two wells are the same 354 × 182 px box; the reference's `17.47/7.40 px` + `332.60 px` on the solid picture versus `11.87/1.67 px` + `340.53 px` on the lace one is hand-drag noise. Matching them makes the panels read as twins. |
| DEV-12 | Picture height is **derived** from the composed PNG's aspect and clamped to 152 px, rather than pinned to the reference's 105.47 / 103.20 px | The reference numbers are that pack's flats. Ours must not distort a TD's own artwork, and `slot.aspect` is already measured for exactly this. |
| DEV-13 | An empty version (no FRONT and no BACK flat) still gets its framed, captioned, **empty** well | The frame is drawn by cell borders, not by the picture, so the panel closes either way; a missing well would look like a broken sheet. |
| DEV-14 | Footer `&C&A` is kept | It prints only the sheet name. The third-party legal notice ADR 0048 §2 bans is on `CONSTRUCTION DETAIL`, not here. |
| DEV-15 | Sheet name is `MAIN PAGE` with no leading space | Matches the reference for *this* sheet. (The reference's ` BOM-LACE` leading space is that sheet's business — ADR 0048 §1 keeps it only if free.) |

---

## 9. Verification notes

- Structural diff to run against the reference: sheet name, tab colour,
  `showGridLines`, the 4 `<col>` runs and their widths, the 23 `<row ht>`
  values, the 29 merges, `printOptions`, `pageSetup`, `pageMargins`, and the
  two `oneCellAnchor` from/ext tuples.
- Read-back check: `openpyxl` normalises a merged range's border onto its
  top-left cell on load, so a per-cell border assertion **must** read
  `xl/worksheets/sheet1.xml` directly (or compare `cell._style` indices), not
  `cell.border`. This is how the reference's `E1` appears to carry
  `right=medium, bottom=medium` when `xf155` declares only `top=thin`.
- Visual check per the US-068 lesson: render the sheet (LibreOffice headless →
  PDF) and look at it. Assertions passed on MAIN PAGE while the page looked
  broken; screenshots caught it.
