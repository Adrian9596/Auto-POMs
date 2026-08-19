# Design — the xlsx style engine

US-081, ADR 0048. This is the foundation layer: nothing else in US-081 (MAIN
PAGE, CONSTRUCTION DETAIL, the two BOM sheets, PROTO Direction) can be built
until a sheet builder can say *"this cell is bold Arial 12, centered, on a
CCCCCC band, with a medium top rule"* and get an `xf` id back.

It is a **new source part**, `src/render/xlsx-style-engine.js`, registered in
`scripts/source-parts.mjs` immediately **before** `'src/render/export-xlsx.js'`
(parts share one IIFE scope, so the engine must load first). No new file is
added to `index.html`; `npm run build` concatenates it into `app.js`.

---

## 1. What the reference actually declares

Measured from `3916.KiraForm vA 1.0 17.05.2025(1).xlsx` (`xl/styles.xml`,
67 566 bytes):

| block | count | note |
| --- | --- | --- |
| `numFmts` | 8 | ids 41–44 (accounting, unused by content), `176 dd\-mmm\-yy`, `177 #\ ??/??`, `178 #\ ?/?`, `179 m/d` |
| `fonts` | 45 | 0–24 are content fonts (Arial/Calibri/`宋体-简`, `charset="134"`); 25–44 are dragged in by the 49 builtin `cellStyles` |
| `fills` | 49 | 22 distinct solid `fgColor rgb`; the rest are theme-tinted builtins |
| `borders` | 56 | **0–47 are content borders**; 48–55 belong to builtin cell styles |
| `cellStyleXfs` | 49 | the builtin named-style table |
| `cellXfs` | 199 | the real working set |
| `dxfs` | 35 | all from builtin table/cell styles — no rule the factory reads |

Content border vocabulary — only `thin`, `medium` (and `double`, only in
builtins) — every edge carries an explicit `<color rgb="FF000000"/>`, and
absent edges are still emitted as empty self-closing elements in the order
`left, right, top, bottom, diagonal`:

```xml
<border><left style="medium"><color rgb="FF000000"/></left><right/>
        <top style="medium"><color rgb="FF000000"/></top>
        <bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
```

Alignment vocabulary is tiny: `horizontal` (111 uses), `vertical` (89),
`wrapText` (37). No `textRotation`, no `indent`, no `shrinkToFit`.

Distinct solid fills, all 8-digit `FFrrggbb`, with `bgColor` set to **the same
rgb** (not `indexed="64"`):

```
FFFFFF  F3F3F3  D8D8D8  CCCCCC  B7B7B7        greys / paper
C9DAF8  92CDDC                                blues
D9EAD3                                        green
FFF2CC  FFFF00  FDE9D9  FCE5CD  FBD4B4        creams / peaches
EAD1DC                                        pink
0000FF                                        a literal blue swatch
```

Sheet-level facts (all five sheets):

| feature | value |
| --- | --- |
| `sheetPr` | present on all five; `tabColor` `FF548DD4` (MAIN PAGE), `FF95B3D7` (CONSTRUCTION DETAIL), `FFB8CCE4` (both BOMs), none on PROTO Direction |
| `sheetView` | `showGridLines="0"` on sheets 1–4, **on** for PROTO Direction; `topLeftCell` is scroll residue (`A14`, `A11`, `G32`…) — drop it, emit `A1`; no `pane`/freeze anywhere |
| `sheetFormatPr` | `defaultColWidth="12.6339285714286" defaultRowHeight="15" customHeight="1"` on all five |
| `pageSetup` | `paperSize="9"` (A4) on sheets 1–4; MAIN PAGE `scale="93" orientation="landscape"`, CONSTRUCTION DETAIL + BOMs `orientation="portrait"`; PROTO Direction is `paperSize="1"` (US Letter) landscape — **we normalise it to A4** |
| `pageMargins` | MAIN PAGE all-zero; CONSTRUCTION/BOM `left/right 0.236220472440945`, `top/bottom 0.748031496062992`, `header/footer 0` |
| `printOptions` | MAIN PAGE `horizontalCentered="1" verticalCentered="1"`; both BOMs `horizontalCentered="1"`; none on 2 and 5 |
| `headerFooter` | MAIN PAGE `<oddFooter>&C&A</oddFooter>` (centred sheet name); CONSTRUCTION DETAIL carries the customer's *"B Pty Ltd"* legal notice — **never emit that** |
| row geometry | every row `ht=… customHeight="1"`; distinct heights include `13.5 15.75 16.5 19.5 22.5 23.25 33 35.25 100.5 408.75` |
| merges | 30 / 20 / 8 / 8 / 9 |
| drawings | 100 % `oneCellAnchor` with **non-zero** `colOff`/`rowOff`; `<xdr:cNvPicPr preferRelativeResize="0"/>` and **no `picLocks`** (aspect unlocked); `<a:blip cstate="print"/>`; `<xdr:clientData fLocksWithSheet="0"/>` |
| shapes | two `xdr:sp` txBox captions per BOM sheet ("Shape 3/4", "Shape 5/6") — we do not reproduce shape XML (§9) |

### The merge discipline, confirmed cell-by-cell

`CONSTRUCTION DETAIL` row 1 is the merge `A1:Z1`. Its cells:

| cell | xf | font | fill | border |
| --- | --- | --- | --- | --- |
| `A1` (anchor) | 136 | 8 (Calibri 18 b) | **12 = CCCCCC** | 13 = left `medium` + top `medium` + bottom `thin` |
| `B1`…`Y1` | 28 | 6 (filler) | **0 = none** | 14 = top `medium` + bottom `thin` |
| `Z1` | 29 | 6 | **0 = none** | 15 = right `medium` + top `medium` + bottom `thin` |

So: **the anchor owns the fill, the alignment, the font and the corner of the
box; the continuation cells own nothing but their slice of the frame.** That is
the rule the engine must encode. Our current writer does the opposite — it
copies the anchor's *full thin box* onto every continuation cell, which draws
interior rules straight through every band. That defect disappears with §6.

---

## 2. Contracts the engine must not break

From `scripts/export-xlsx-tests.mjs` (the Board's `Export Excel`, all
assertions stay green — this is the byte-identity gate):

1. **STORE only.** `unzipStore` throws `expected STORE method for …` on any
   entry with method ≠ 0. Deflate is permanently out.
2. **Determinism.** Two exports with a frozen date must be byte-identical.
3. **Exactly these 10 parts**, at these paths, for the single-sheet file.
4. `xl/styles.xml` must contain the literal string
   `<numFmt numFmtId="164" formatCode="# ??/??"/>`.
5. The suite locates styles by *scanning*, not by index:
   - `fracXf` = **first** `<xf>` with `numFmtId="164"` **and**
     `applyNumberFormat="1"` → must resolve to **17**.
   - `plainNumXf` = **first** `<xf>` with `numFmtId="0"` **and**
     `horizontal="right"` → must resolve to **15**.
   - `cellStyle(sheet,'G'+r)` and the XL2 formula cell must both equal
     `fracXf`.

   → **A second `numFmtId="164"` xf, or a second right-aligned plain-number xf
   inserted before index 15/17, silently breaks this suite.** The Board file
   therefore must contain *only* the 18 seeded xfs (§7).
6. Header row text, `A1`/`A2` band text, `<mergeCell ref="A1:S1"/>` /
   `"A1:E1"`, live formulas (`=G{r}±Δ`, `=N{r}±Δ`), cached `<v>` decimals, TOL
   written verbatim as `inlineStr`, 18 POM rows, custom POM 19.

From `scripts/preview-check.mjs`:

7. STORE again; tech-pack determinism for a frozen date.
8. `unzip -t` exits 0, and **openpyxl loads the workbook and returns the sheet
   names in order**. openpyxl is the strictest reader in the loop — treat it as
   the schema police (see §8 on element ordering and custom `numFmtId ≥ 165`).
9. The test-hook `enabledPages` override must not leak into state.
10. Assertions that US-081/ADR 0048 deliberately retires or rewrites — list
    them in `validation.md`, do not leave them failing:
    - six `sheet{1..6}.xml` parts, and the 6-name order array;
    - `packPomSheet === singleSheet` (POM byte-identity) — retired by ADR 0048
      decision 3, replaced by (a) the Board-side byte assertion and (b) a new
      assertion that PROTO Direction's measurement block comes from the shared
      row model (§7.9);
    - `drawing1.xml` absent / present rules, the `image1.png`-is-Construction
      assumption, and the `mainSheet.includes('COLORWAYS')` /
      `'style prefix'` / `'Block Reference'` text probes, which move to the new
      MAIN PAGE grid;
    - the 4-name subset array.

---

## 3. Public authoring API

Two objects. A **StyleBook** is workbook-scoped (there is exactly one
`xl/styles.xml`). A **SheetWriter** is sheet-scoped and holds a reference to
the book.

```js
/**
 * @typedef {Object} StyleOpts            // every field optional
 * @property {string|FontSpec}   [font]   // palette name or inline spec
 * @property {string|FillSpec}   [fill]   // palette name, 'RRGGBB', or spec
 * @property {string|BorderSpec} [border] // preset name or per-side spec
 * @property {string|AlignSpec}  [align]  // shorthand or spec (see below)
 * @property {boolean}           [wrap]   // sugar for align.wrap
 * @property {string|number}     [numFmt] // preset name, format code, or id
 */

/**
 * @typedef {Object} FontSpec
 * @property {string}  [name='Arial']
 * @property {number}  [size=10]
 * @property {boolean} [bold=false]
 * @property {boolean} [italic=false]
 * @property {boolean} [underline=false]
 * @property {string}  [color='000000']  // 6-hex; NEVER a theme index (§9)
 * @property {number|null} [charset=134] // null omits <charset/>
 */

/**
 * @typedef {Object} FillSpec
 * @property {string} rgb                // 6-hex, e.g. 'CCCCCC'
 * @property {string} [pattern='solid']  // 'solid' | 'none' | 'gray125'
 */

/**
 * @typedef {Object} BorderSpec          // per side: 'thin'|'medium'|'thick'|
 *                                       // 'double'|'hair'|'dashed'|null
 * @property {string|null} [left]
 * @property {string|null} [right]
 * @property {string|null} [top]
 * @property {string|null} [bottom]
 * @property {string}      [color='000000']
 */

/**
 * @typedef {Object} AlignSpec
 * @property {'left'|'center'|'right'|'justify'|null} [h]
 * @property {'top'|'center'|'bottom'|null}           [v='center']
 * @property {boolean} [wrap=false]
 * @property {number}  [indent]          // emitted only when > 0
 */
```

`align` shorthand strings expand as follows — this is the whole shorthand
grammar, nothing else parses:

| shorthand | expands to |
| --- | --- |
| `'center'` | `{h:'center', v:'center'}` |
| `'left'` | `{h:'left', v:'center'}` |
| `'right'` | `{h:'right', v:'center'}` |
| `'centerTop'` | `{h:'center', v:'top'}` |
| `'leftTop'` | `{h:'left', v:'top'}` |
| `'middle'` | `{v:'center'}` (no horizontal) |

### 3.1 StyleBook

```js
function createStyleBook() → StyleBook
```

| method | signature | returns |
| --- | --- | --- |
| `xf` | `(opts: StyleOpts) → number` | interned `cellXfs` index |
| `font` | `(spec: string\|FontSpec) → number` | `fonts` index |
| `fill` | `(spec: string\|FillSpec\|null) → number` | `fills` index |
| `border` | `(spec: string\|BorderSpec\|null) → number` | `borders` index |
| `numFmt` | `(spec: string\|number\|null) → number` | `numFmtId` |
| `stylesXml` | `() → string` | the whole `xl/styles.xml` |
| `stats` | `() → {fonts,fills,borders,numFmts,xfs}` | counts, for tests |

`xf({})` always returns `0` (the seeded default). `fill(null)` → `0`,
`border(null)` → `0`, `numFmt(null)` → `0`.

### 3.2 SheetWriter

```js
function createSheet(book: StyleBook, opts: {
  name: string,                        // worksheet name, verbatim (leading
                                       // space allowed: ' BOM-LACE')
  cols?: Array<{min:number, max:number, width:number}>
       | Array<number>,                // shorthand: width per column from A
  defaultColWidth?: number,            // default 12.6339285714286
  defaultRowHeight?: number,           // default 15
  fillerFont?: string,                 // font for framed continuation cells;
                                       // default 'arial10'
}) → SheetWriter
```

Content:

| method | signature | notes |
| --- | --- | --- |
| `cell` | `(ref: string, value: any, opts?: StyleOpts) → void` | type inferred: `number`→numeric, `Date`→serial + date numFmt, `null`/`''`→styled blank, else `inlineStr` |
| `text` | `(ref, s: string, opts?) → void` | always `inlineStr`; `\n` becomes `&#10;` |
| `num` | `(ref, n: number, opts?) → void` | never coerced; `NaN`/`Infinity` → blank + a dev-mode warning |
| `date` | `(ref, d: Date\|string, opts?) → void` | writes the serial (§10) and defaults `numFmt:'date'` |
| `formula` | `(ref, f: string, cached: number\|string, opts?) → void` | `<f>` + cached `<v>`; `f` without the leading `=` |
| `blank` | `(ref, opts?) → void` | styled empty `<c r=… s=…/>` |
| `row` | `(r: number, o: {ht?: number, style?: StyleOpts}) → void` | `ht` emits `ht="…" customHeight="1"`; `style` is applied to every cell later written in that row **that does not override it** |
| `rows` | `(from: number, to: number, o) → void` | same, inclusive range |

Structure:

| method | signature | notes |
| --- | --- | --- |
| `merge` | `(range: string, o?: MergeOpts) → void` | see §6 |
| `frame` | `(range: string, o?: FrameOpts) → void` | border-only, no merge, no fill; see §6 |
| `band` | `(range, value, o?: StyleOpts & FrameOpts) → void` | the one-call *"merged, filled, framed, captioned strip"* — merge + anchor style + frame + text |
| `well` | `(range, o?: StyleOpts & FrameOpts) → Geometry` | a merged, framed, empty picture well; returns its EMU geometry (§8) so an image can be centred inside it |

Sheet chrome (each may be called at most once; a second call throws in
dev mode):

| method | signature |
| --- | --- |
| `view` | `({showGridLines?: boolean, tabSelected?: boolean, topLeftCell?: string, freeze?: {xSplit?: number, ySplit?: number, topLeftCell?: string}}) → void` |
| `tabColor` | `(rgb: string) → void` |
| `page` | `({paperSize?: number, orientation?: 'portrait'\|'landscape', scale?: number, fitToPage?: {width?: number, height?: number}}) → void` |
| `margins` | `({left,right,top,bottom,header,footer}: Record<string,number>) → void` |
| `print` | `({horizontalCentered?: boolean, verticalCentered?: boolean}) → void` |
| `headerFooter` | `({oddHeader?: string, oddFooter?: string}) → void` |
| `image` | `(img: ImageAnchor) → void` (§8) |
| `toXml` | `() → string` |
| `part` | `() → {name, sheetXml, images}` — the shape `assembleTechPackZip` already consumes |

### 3.3 What a sheet builder looks like

```js
const book = createStyleBook();
const sh = createSheet(book, {
  name: 'CONSTRUCTION DETAIL',
  cols: [{ min: 1, max: 18, width: 13.3839285714286 },
         { min: 19, max: 26, width: 12.1339285714286 }],
});
sh.view({ showGridLines: false });
sh.tabColor('95B3D7');
sh.page({ paperSize: 9, orientation: 'portrait', fitToPage: { width: 1 } });
sh.margins({ left: 0.236220472440945, right: 0.236220472440945,
             top: 0.748031496062992, bottom: 0.748031496062992,
             header: 0, footer: 0 });

sh.row(1, { ht: 35.25 });
sh.band('A1:Z1', 'LACE — CONSTRUCTION DETAIL', {
  font: 'calibri18b', fill: 'bandGray', align: 'center',
  box: { left: 'medium', right: 'medium', top: 'medium', bottom: 'thin' },
});

sh.rows(2, 2, { ht: 22.5 });
sh.band('A2:I2',  'OUTER',                  { font: 'arial14b', fill: 'mintGreen', align: 'center', box: 'boxThin' });
sh.band('J2:R2',  'INNER',                  { font: 'arial14b', fill: 'mintGreen', align: 'center', box: 'boxThin' });
sh.band('S2:Z2',  'ADDITIONAL INFORMATION', { font: 'arial14b', fill: 'mintGreen', align: 'center', box: 'boxThin' });

sh.rows(3, 23, { ht: 22.5 });
const outer = sh.well('A3:I23', { box: 'boxMedium' });
sh.image({ ...pngOuter, fitInside: outer, stretch: false });
```

Nothing above computes an `xf` index, an `s=` attribute, or a border id.

---

## 4. Interning

### 4.1 Key derivation

Every registry uses **the emitted XML fragment as its own intern key**. That is
the whole trick, and it makes the invariant *"identical XML ⇒ identical id,
different XML ⇒ different id"* true by construction, with no separate key
function to drift out of sync with the emitter.

```js
function makeRegistry(seedFragments) {
  const list = seedFragments.slice();          // frozen prefix, order matters
  const index = new Map();                     // fragment → id
  list.forEach((frag, i) => { if (!index.has(frag)) index.set(frag, i); });
  return {
    intern(fragment) {
      const hit = index.get(fragment);
      if (hit !== undefined) return hit;
      const id = list.length;
      list.push(fragment);
      index.set(fragment, id);
      return id;
    },
    fragments: () => list,
    size: () => list.length,
  };
}
```

`xf(opts)` is a two-stage intern: first normalise → resolve the four child ids
→ emit the `<xf>` fragment → intern that fragment.

```js
function xf(opts) {
  const o          = normalizeStyleOpts(opts);   // fills every default, sorts nothing away
  const numFmtId   = numFmt(o.numFmt);
  const fontId     = font(o.font);
  const fillId     = fill(o.fill);
  const borderId   = border(o.border);
  return xfs.intern(renderXf({ numFmtId, fontId, fillId, borderId, align: o.align }));
}
```

`normalizeStyleOpts` is the only place ambiguity is resolved, and it must be
total:

1. `wrap: true` folds into `align.wrap`; if `align` is absent it becomes
   `{v: 'center', wrap: true}`.
2. A string `align` expands via the §3 shorthand table.
3. A string `font`/`fill`/`border` resolves through the palette tables (§5).
4. A bare 6-hex string in `fill` is `{rgb, pattern: 'solid'}`.
5. `align.v` defaults to `'center'` **only when an `align` key was supplied at
   all**. `xf({font:'arial10'})` emits no `<alignment>` — otherwise every
   legacy-shaped xf would gain one.
6. Absent → absent. There is no implicit border, no implicit fill.

`renderXf` emits attributes in a fixed order and sets the `apply*` flags
exactly as Excel does:

```js
function renderXf({ numFmtId, fontId, fillId, borderId, align }) {
  let s = '<xf numFmtId="' + numFmtId + '" fontId="' + fontId
        + '" fillId="' + fillId + '" borderId="' + borderId + '" xfId="0"';
  if (numFmtId !== 0) s += ' applyNumberFormat="1"';
  if (fontId   !== 0) s += ' applyFont="1"';
  if (fillId   !== 0) s += ' applyFill="1"';
  if (borderId !== 0) s += ' applyBorder="1"';
  if (align)          s += ' applyAlignment="1"';
  if (!align) return s + '/>';
  return s + '>' + renderAlignment(align) + '</xf>';
}

function renderAlignment(a) {           // attribute order is load-bearing
  let s = '<alignment';
  if (a.h)      s += ' horizontal="' + a.h + '"';
  if (a.v)      s += ' vertical="' + a.v + '"';
  if (a.indent) s += ' indent="' + a.indent + '"';
  if (a.wrap)   s += ' wrapText="1"';
  return s + '/>';
}
```

> The legacy xf fragments (§7) do **not** all follow these flag rules — e.g.
> seeded xf 13 has `applyBorder="1" applyAlignment="1"` but no `applyFont`
> despite `fontId="0"`, which happens to agree, and xf 0 has no `apply*` at
> all. They agree because the legacy strings were written by the same
> convention. Verify with the golden test in §7.4 rather than by reading; if
> any seeded fragment disagrees with `renderXf`, keep the **verbatim seed
> string** and let `renderXf` produce a *new* id for a re-request. That is
> correct behaviour, not a bug — see §5.4.

### 4.2 Stable ordering

Ids are assigned in **first-use order**, starting after the frozen seed
prefix. Determinism follows from two facts, and both must be stated in the code
comment because they are the tested contract:

1. **The seed prefix is a literal array of literal strings.** Ids `0..17`
   (xfs), `0..2` (fonts), `0..13` (fills), `0..1` (borders) and `numFmtId 164`
   never move, whatever a sheet builder asks for.
2. **Sheet builders are deterministic for identical input.** They iterate
   arrays and object keys the app already orders deterministically (the same
   property the existing determinism assertions rely on), so the *sequence* of
   `xf()` calls is fixed, so first-use order is fixed, so `stylesXml()` is
   byte-identical for identical input.

What this forbids:

- **No iteration over an unordered set/Map built from user text** in a sheet
  builder without sorting first.
- **No `Date.now()`, no `Math.random()`, no locale-dependent formatting** in
  any style key path. Dates enter only as an explicit `now` argument (already
  the convention) and are converted through §10.
- **No sorting or de-duplicating of the registries at emit time.** Sorting
  would be a second ordering rule that can disagree with the ids already
  handed to cells. Emit `fragments()` in id order, full stop.
- **No lazily-added registry entries after `stylesXml()` has been called.** In
  dev mode, `stylesXml()` seals the book; a later `xf()` throws.

`stylesXml()` emits blocks in the OOXML-required order, matching today's
output exactly:

```
<?xml …?>\n<styleSheet xmlns=…>
  <numFmts count=…>      … omitted entirely when only builtins are used
  <fonts count=…>
  <fills count=…>
  <borders count=…>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count=…>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
```

`count` is always `registry.size()` — never a hand-maintained literal.

---

## 5. Palette

### 5.1 Fills

Named entries produce the reference's convention — `fgColor` and `bgColor`
both set to the same explicit rgb:

```js
const FILL_XML = (rgb) =>
  '<fill><patternFill patternType="solid">'
  + '<fgColor rgb="FF' + rgb + '"/><bgColor rgb="FF' + rgb + '"/>'
  + '</patternFill></fill>';
```

| name | rgb | used by |
| --- | --- | --- |
| `white` | `FFFFFF` | opaque paper behind framed wells |
| `paperGray` | `F3F3F3` | faint alternating rows |
| `lightGray` | `D8D8D8` | sub-headers, caption rows |
| `bandGray` | `CCCCCC` | full-width title bars |
| `midGray` | `B7B7B7` | section bands, the darker header strip |
| `keyBlue` | `C9DAF8` | MAIN PAGE credit grid, BOM column headers |
| `teal` | `92CDDC` | size-split / secondary headers |
| `mintGreen` | `D9EAD3` | board caption rows (OUTER / INNER / ADDITIONAL) |
| `cream` | `FFF2CC` | editable-value cells |
| `yellow` | `FFFF00` | TD attention cells |
| `blush` | `FDE9D9` | BOM alternating fabric rows |
| `apricot` | `FCE5CD` | BOM trim rows |
| `peach` | `FBD4B4` | MATERIAL IMAGES band |
| `pink` | `EAD1DC` | colorway header cells |
| `swatchBlue` | `0000FF` | the literal blue swatch cell |

`white` (`FFFFFF`) and `paperGray` (`F3F3F3`) are not in the ADR's 13-colour
list but are present in the reference and cheap; include them.

An unnamed colour is still reachable: `fill: 'A1B2C3'` interns the same
fragment shape. Any 6-hex string that *is* a palette name is treated as the
name (names are alphabetic, so there is no collision).

### 5.2 Fonts

```js
const FONT_XML = (f) =>
  '<font>' + (f.bold ? '<b/>' : '') + (f.italic ? '<i/>' : '')
  + (f.underline ? '<u/>' : '')
  + '<sz val="' + f.size + '"/>'
  + '<color rgb="FF' + f.color + '"/>'
  + '<name val="' + xmlEscape(f.name) + '"/>'
  + (f.charset == null ? '' : '<charset val="' + f.charset + '"/>')
  + '</font>';
```

Child order (`b, i, u, sz, color, name, charset`) is the `CT_Font` sequence and
must not be reordered. **No `<scheme val="minor"/>`** — see §9.

Naming convention: `arial<size>` + `b` for bold + a colour tag when the colour
is not black. Every entry carries `charset="134"` so a Chinese glyph in a
description renders in the factory's Windows build:

| name | spec |
| --- | --- |
| `arial10`, `arial10b` | Arial 10 regular / bold, `000000` |
| `arial11`, `arial11b` | Arial 11 |
| `arial12`, `arial12b` | Arial 12 |
| `arial13b` | Arial 13 bold |
| `arial14`, `arial14b` | Arial 14 |
| `arial18b` | Arial 18 bold |
| `arial10bBlue` | Arial 10 bold, `0000FF` |
| `arial12bRed` | Arial 12 bold, `FF0000` |
| `arial14bWhite` | Arial 14 bold, `FFFFFF` — for text on `midGray`/`swatchBlue` |
| `arial10Lilac` | Arial 10, `CC99FF` — the reference's faint note text |
| `calibri18b` | Calibri 18 bold — the reference's own title-bar font |
| `cjk12` | `宋体-简` 12, `charset 134` — only where the reference uses it |

`calibri11`, `calibri11b`, `calibri14b` also exist, but **only as the seeded
ids 0/1/2** (§5.4).

### 5.3 Borders

```js
const EDGES = ['left', 'right', 'top', 'bottom'];   // OOXML order
const BORDER_XML = (b) =>
  '<border>'
  + EDGES.map(e => b[e]
      ? '<' + e + ' style="' + b[e] + '"><color rgb="FF' + b.color + '"/></' + e + '>'
      : '<' + e + '/>').join('')
  + '<diagonal/></border>';
```

Presets:

| name | left / right / top / bottom |
| --- | --- |
| `boxThin` | thin · thin · thin · thin |
| `boxMedium` | medium · medium · medium · medium |
| `boxThinMediumTop` | thin · thin · **medium** · thin |
| `boxThinMediumBottom` | thin · thin · thin · **medium** |
| `ruleTop` | – · – · thin · – |
| `ruleBottom` | – · – · – · thin |
| `ruleBottomMedium` | – · – · – · medium |
| `sidesThin` | thin · thin · – · – |
| `sidesMedium` | medium · medium · – · – |

Anything else is an inline `BorderSpec`:
`border: { left: 'medium', top: 'medium', bottom: 'thin' }`.

### 5.4 The legacy-vs-palette collision (read this twice)

Legacy fill 13 is `92CDDC` written with `<bgColor indexed="64"/>`. Palette
`teal` is `92CDDC` written with `<bgColor rgb="FF92CDDC"/>`. **These are
different fragments, so they intern to different ids — 13 and 14+.** That is
the intended behaviour:

- the legacy fragment must stay byte-verbatim at id 13 for the Board file;
- the palette must produce the reference's convention on tech-pack sheets.

Same story for fonts: `calibri11` is seeded at id 0 as
`<font><sz val="11"/><name val="Calibri"/></font>` — no `<color>`, no
`<charset>` — which `FONT_XML` would never produce. **Palette lookups must
never be routed to a seeded id by rgb/name matching.** The seeded ids are
reachable only through `SPEC_XF` / `LEGACY_FILL` (§7.5). Handling this the
other way round — "reuse the existing 92CDDC fill" — is exactly how
byte-identity dies silently.

---

## 6. Merges and framing

### 6.1 Option shapes

```js
/**
 * @typedef {Object} FrameOpts
 * @property {string|BorderSpec} [box='boxThin']  // the OUTER frame
 * @property {Object|null} [inner=null]           // interior rules, or null
 * @property {string|null} inner.vertical         // e.g. 'thin' between columns
 * @property {string|null} inner.horizontal
 * @property {'anchor'|'repeat'} [continuationFill='anchor']
 */

/** @typedef {StyleOpts & FrameOpts & {value?: any}} MergeOpts */
```

### 6.2 The frame algorithm

For a range `r1c1:r2c2`, for each cell at row `r`, column `c`:

```js
function edgesFor(pos, box, inner) {
  return {
    left:   pos.first_c ? box.left   : (inner && inner.vertical)   || null,
    right:  pos.last_c  ? box.right  : (inner && inner.vertical)   || null,
    top:    pos.first_r ? box.top    : (inner && inner.horizontal) || null,
    bottom: pos.last_r  ? box.bottom : (inner && inner.horizontal) || null,
    color:  box.color || '000000',
  };
}
```

With `inner = null` (the default) a 26-wide band produces exactly the three
border fragments the reference uses — `left+top+bottom`, `top+bottom`,
`right+top+bottom` — and nothing more. Interning collapses the 24 middle cells
onto one id.

### 6.3 `merge(range, opts)` — the anchor / continuation split

```
1. push range onto this.merges (dev mode: assert it overlaps no existing merge)
2. anchor = top-left cell of range
     style = { font, fill, align, wrap, numFmt from opts,
                border: edgesFor(anchorPos, box, inner) }
     write value (opts.value) with that xf
3. for every other cell in range, in ROW-MAJOR order:
     style = { font: sheet.fillerFont,
               fill: opts.continuationFill === 'repeat' ? opts.fill : null,
               align: undefined, numFmt: undefined,
               border: edgesFor(cellPos, box, inner) }
     write a styled blank with that xf
```

Row-major continuation order is part of the determinism contract (it fixes the
first-use order of the three or four frame xfs).

`continuationFill` defaults to `'anchor'`, matching the reference: Excel,
LibreOffice, Google Sheets and Numbers all paint a merged range with the
anchor's fill. `'repeat'` exists as a documented escape hatch if the
LibreOffice render check in `validation.md` ever shows a gap; flipping it
changes only which fill id the continuation cells carry.

Cells must be emitted in column order within a row (`<row>` children are
ordered by `r`), so the writer buffers per-row cells in a `Map` keyed by column
index and sorts numerically at `toXml()` time. That also lets `merge()` and
`frame()` be called before or after the cells they touch.

### 6.4 `frame(range, opts)` — "frame this range" in one call

Same edge algorithm, but it **only sets borders**: it does not merge, does not
fill, and does not clobber a value or an alignment already written to a cell.
Implementation: for each cell, take the existing `StyleOpts` recorded for that
cell (or the row style, or empty), override only `border`, re-intern. This is
what draws the box around a multi-row field ladder whose cells were authored
independently.

### 6.5 `band` and `well`

- `band(range, value, o)` = `merge(range, {...o, value})`. This is the caption
  row, the section band, the title bar.
- `well(range, o)` = `merge(range, {value: null, fill: o.fill || 'white',
  box: o.box || 'boxMedium'})`, and returns the range's `Geometry` (§8) so an
  image can be centred inside it. A picture well is a merged framed cell; the
  picture floats over it.

---

## 7. Migration: keeping the Board export byte-identical

### 7.1 Capture the golden first

**Before editing a single line**, capture today's bytes:

```sh
npm run build && npm run export-xlsx      # confirm green on the current tree
# then, from a headless run, write the two goldens:
#   scripts/fixtures/legacy-styles.xml     ← xl/styles.xml verbatim
#   scripts/fixtures/legacy-spec-sheet.xml ← xl/worksheets/sheet1.xml verbatim
```

A tiny node script that drives `exportSpecXlsxBase64('2026-07-08T10:00:00')`
with the suite's own fixture project, unzips, and writes those two files. The
fixtures are the contract; commit them in the same commit that adds the engine.

### 7.2 Seed order is normative

`src/render/xlsx-style-engine.js` contains four literal arrays. **Every string
is copy-pasted from today's `buildSpecStylesXml()` — never regenerated by the
new emitters.**

`SEED_NUMFMTS` (one entry, id 164):

```
<numFmt numFmtId="164" formatCode="# ??/??"/>
```

`SEED_FONTS` (ids 0–2), verbatim:

```
0  <font><sz val="11"/><name val="Calibri"/></font>
1  <font><b/><sz val="11"/><name val="Calibri"/></font>
2  <font><b/><sz val="14"/><name val="Calibri"/></font>
```

`SEED_FILLS` (ids 0–13): `none`, `gray125`, then the twelve
`SPEC_XLSX_FILLS` entries in their existing order —
`DCE6F1 E4DFEC D9D9D9 B8CCE4 FCD5B4 C4D79B FABF8F B7DEE8 CCC0DA FFFF99 E6B8B7 92CDDC`
— each rendered by the **existing** legacy template with
`<bgColor indexed="64"/>`.

`SEED_BORDERS` (ids 0–1): the existing empty border and the existing
all-thin box, **including its `<diagonal/>` and its lack of `<color>`
children**.

`SEED_XFS` (ids 0–17): the current `cellXfs` array, string for string,
including the six `headerXf(fillId)` expansions for ids 3–12 and the trailing
fraction xf at 17.

Keep the seed arrays adjacent to a comment that says: *these strings are a
frozen wire format; `scripts/style-engine-tests.mjs` compares them against
`scripts/fixtures/legacy-styles.xml`; do not reformat, re-indent or
"modernise" them.*

### 7.3 One StyleBook per export, never shared

```js
function buildSpecWorkbookXlsx(now, image) {        // Board — unchanged output
  const book = createStyleBook();                  // seed only; nothing appends
  …
  { name: 'xl/styles.xml', bytes: encoder.encode(book.stylesXml()) },
}
```

Because the Board path never calls `book.xf(...)`, the book stays at exactly
18 xfs / 3 fonts / 14 fills / 2 borders / 1 numFmt, and `stylesXml()` is the
legacy string. The tech-pack path constructs its own book per export.

Never memoise a module-level book. A shared book would leak tech-pack styles
into the Board file the moment a user exported the pack first — the classic
"works in tests, breaks in the app" failure.

### 7.4 The one assertion that guards all of it

New suite `scripts/style-engine-tests.mjs` (registered in `package.json` and
`TESTING.md`), asserting in this order:

1. `createStyleBook().stylesXml() === readFile('scripts/fixtures/legacy-styles.xml')`
   — the seed reproduces today's bytes exactly.
2. `SPEC_XF` maps to the documented indexes: `title 1, styleRow 2, headLabel 3,
   headTol 4, headAlpha 5, headDepth0 6, text 13, textCenter 14, number 15,
   pom 16, numberFrac 17`.
3. `book.stats()` for a seed-only book is `{fonts:3, fills:14, borders:2,
   numFmts:1, xfs:18}`.
4. Re-requesting a palette style that *looks* like a legacy one appends
   instead of reusing: `book.fill('teal') === 14` and
   `book.font({name:'Calibri', size:11}) === 3`. (Pins §5.4.)
5. Interning is idempotent and order-stable: authoring the same call sequence
   twice on two fresh books yields identical `stylesXml()`; authoring a
   permuted sequence is *allowed* to differ (documenting that ids are
   first-use, not content-sorted).
6. The frame algorithm on `A1:Z1` produces exactly three distinct border ids,
   with the anchor holding the fill and the continuations holding `fillId 0`.
7. Excel-order sanity: `toXml()` output matches a fixed element-order regex
   (§8.4) for a sheet exercising every chrome method.

### 7.5 `SPEC_XF` survives as a frozen alias

```js
// Frozen aliases onto the SEEDED cellXfs indexes (see SEED_XFS). These 18 ids
// are wire format: scripts/export-xlsx-tests.mjs discovers 15 and 17 by
// scanning styles.xml, so nothing may be inserted before them.
const SPEC_XF = Object.freeze({
  title: 1, styleRow: 2, headLabel: 3, headTol: 4, headAlpha: 5, headDepth0: 6,
  text: 13, textCenter: 14, number: 15, pom: 16, numberFrac: 17,
});
const LEGACY_FILL = Object.freeze({ titleBand: 2, styleRow: 3, /* … */ teal: 13 });
```

Every existing call site keeps working untouched. New tech-pack code uses
`book.xf({...})` and never mentions `SPEC_XF`.

### 7.6 What stays frozen in `export-xlsx.js`

Do **not** retrofit the engine into any of these — the Board path must keep its
own byte-stable writers:

- `buildSpecStylesXml()` → becomes a one-liner
  `return createStyleBook().stylesXml();` and nothing else.
- `buildSpecSheetXml`, `buildSpecDrawingXml`
- `specInlineStrCell`, `specNumberCell`, `specFormulaCell`, `specBlankCell`
- `specColLetter`, `specNumberText`, `formatSpecDate`, `xmlEscape`, `zipStore`,
  `crc32`
- `buildSpecWorkbookXlsx`, `makeSpecXlsxFileName`, `runSpecXlsxExport`

### 7.7 What the tech pack stops using

`buildTechPackSheetXml` and `buildTechPackDrawingXml` are **replaced** by
`SheetWriter.toXml()` and the new drawing emitter (§8). Delete them once the
last tech-pack sheet builder has migrated — not before, so the migration can
land one sheet at a time with the suite green between steps (execplan phase 4).

### 7.8 Migration order

1. Land the engine + `style-engine-tests` + the two fixtures. `export-xlsx`
   and `preview-check` must both still be green: at this point nothing calls
   the engine except `buildSpecStylesXml`, whose output is unchanged.
2. Then, per execplan phase 4, one sheet at a time.

### 7.9 The `specRowModel` extraction (needed by PROTO Direction)

ADR 0048 decision 3 moves the measurement block into PROTO Direction, so that
sheet needs the spec **data**, not `buildSpecSheetRows`' pre-rendered XML cell
strings. Split it:

```js
// data only — no XML, no style ids
function specRowModel(now) → {
  pomKeys: string[],
  layout: Array<{label, base, tier}>,
  styleLabel: string,
  dateText: string,
  rows: Array<{
    pom: number, en: string, zh: string, tol: string|null,
    cells: Array<{ value: number|null, formula: string|null }>,
  }>,
}

// unchanged rendering of that model into the LEGACY cell strings
function buildSpecSheetRows(now) → { rowsData, colCount, pomKeys }
```

`buildSpecSheetRows` becomes `specRowModel` + the existing emission loop, and
must still produce `scripts/fixtures/legacy-spec-sheet.xml` byte for byte —
assert that in `style-engine-tests` too. PROTO Direction renders the same
model through the engine. This is how the retired byte-identity assertion is
*replaced* rather than dropped (hard gate in `execplan.md`).

---

## 8. Sheets and drawings

### 8.1 Sub-cell picture offsets and aspect-free stretch

```js
/**
 * @typedef {Object} ImageAnchor
 * @property {Uint8Array} bytes
 * @property {number} width  // native px, for aspect math
 * @property {number} height
 * @property {{col:number, colOff:number, row:number, rowOff:number}} from
 *           // col/row are 0-based; *Off are EMU
 * @property {{cx:number, cy:number}} [ext]      // explicit EMU extent
 * @property {number} [displayWidth]             // px; ext derived from aspect
 * @property {Geometry} [fitInside]              // centre inside a well (§8.3)
 * @property {boolean} [stretch=false]           // true ⇒ aspect-free
 * @property {string}  [name]                    // xdr:cNvPr name
 */
```

Emitter, mirroring the reference's picture shape:

```js
'<xdr:oneCellAnchor>'
+ '<xdr:from><xdr:col>' + col + '</xdr:col><xdr:colOff>' + colOff + '</xdr:colOff>'
+ '<xdr:row>' + row + '</xdr:row><xdr:rowOff>' + rowOff + '</xdr:rowOff></xdr:from>'
+ '<xdr:ext cx="' + cx + '" cy="' + cy + '"/>'
+ '<xdr:pic>'
+ '<xdr:nvPicPr><xdr:cNvPr id="' + (i + 2) + '" name="' + xmlEscape(name) + '" title="Image"/>'
+ '<xdr:cNvPicPr' + (stretch ? ' preferRelativeResize="0"' : '')
+ (stretch ? '/>' : '><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>')
+ '</xdr:nvPicPr>'
+ '<xdr:blipFill><a:blip r:embed="rId' + (i + 1) + '" cstate="print"/>'
+ '<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
+ '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
+ '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr>'
+ '</xdr:pic>'
+ '<xdr:clientData fLocksWithSheet="0"/>'
+ '</xdr:oneCellAnchor>'
```

Differences from today's `buildTechPackDrawingXml`, all deliberate:

- `colOff`/`rowOff` are real values, no longer hard zero — this is what lets a
  board sit *inside* its framed well instead of on its top-left corner.
- `stretch:true` drops `picLocks noChangeAspect` and adds
  `preferRelativeResize="0"`, so `cx`/`cy` may disagree with the native aspect.
  Use it only for a board deliberately filled to a well; **default stays
  `false`** so the POM sketch and every flat keep the aspect guarantee the
  existing comment in `buildSpecDrawingXml` explains.
- `name` defaults to `'image' + (i+1) + '.png'` — a *derived* name. Never carry
  a stale name from the reference (ADR 0048 drops stale picture names).
- `cstate="print"` and `fLocksWithSheet="0"` match the reference and are free.

`oneCellAnchor` stays the anchor of choice; a `twoCellAnchor` would let Excel
re-derive the size from column widths, which is exactly the cross-viewer drift
the existing code avoids.

### 8.2 Geometry conversions

```js
const EMU_PER_PX = 9525;
const EMU_PER_PT = 12700;
const MDW = 7;                                    // max digit width, px

// Excel column width (characters) → px
function colWidthPx(w) {
  return Math.floor(((256 * w + Math.floor(128 / MDW)) / 256) * MDW);
}
// row height (points) → px, at 96 dpi
function rowHeightPx(pt) { return Math.round(pt * 96 / 72); }
```

### 8.3 `Geometry` and `fitInside`

```js
/** @typedef {Object} Geometry
 *  @property {number} col, row        // 0-based top-left
 *  @property {number} widthEmu, heightEmu
 */
```

`well(range)` computes `widthEmu`/`heightEmu` by summing `colWidthPx` over the
range's columns and `rowHeightPx` over its rows (using the sheet's declared
`cols`/`row` heights, falling back to `defaultColWidth`/`defaultRowHeight`).

`fitInside: geometry` then, with `pad = 2 * EMU_PER_PX` on each side:

```
availW = geometry.widthEmu  - 2*pad
availH = geometry.heightEmu - 2*pad
scale  = Math.min(availW / (width*EMU_PER_PX), availH / (height*EMU_PER_PX))
cx     = Math.round(width  * EMU_PER_PX * scale)
cy     = Math.round(height * EMU_PER_PX * scale)
from   = { col: geometry.col, colOff: pad + Math.round((availW - cx) / 2),
           row: geometry.row, rowOff: pad + Math.round((availH - cy) / 2) }
```

The picture is centred in its frame and never clips. `colWidthPx` carries a few
px of font-metric error, which lands in the padding — harmless, and the reason
for the 2 px pad rather than 0.

A dev-mode `assertFitsOnA4(sheet)` sums the printable width against the paper
(A4 portrait at `0.2362"` side margins ⇒ `8.27 - 0.472 = 7.80"` ≈ 749 px at
96 dpi; landscape at `scale 93` ⇒ `11.69"`) and warns when a sheet's declared
columns overflow. This is the execplan's stop condition *"row geometry cannot
frame an image without clipping it at A4"*, made mechanical.

### 8.4 Worksheet element order

`CT_Worksheet` is a **sequence**; Excel and openpyxl both reject a
mis-ordered worksheet. `toXml()` emits, in exactly this order, skipping what
was not declared:

```
sheetPr            ← tabColor then pageSetUpPr (CT_SheetPr order)
dimension
sheetViews         ← sheetView[@showGridLines,@tabSelected,@topLeftCell] > pane?
sheetFormatPr
cols
sheetData
mergeCells
printOptions
pageMargins
pageSetup
headerFooter
drawing
```

Notes:

- `fitToPage` requires **both** `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
  and `<pageSetup fitToWidth="…" fitToHeight="…"/>`. `page({fitToPage:{width:1}})`
  emits `fitToWidth="1" fitToHeight="0"` (0 = unlimited pages tall) and sets
  the `sheetPr` flag. `scale` and `fitToPage` are mutually exclusive in Excel:
  the setter throws in dev mode if both are given.
- `freeze` emits
  `<pane xSplit="…" ySplit="…" topLeftCell="…" activePane="bottomRight" state="frozen"/>`
  as the first child of `sheetView`. No reference sheet freezes, so this exists
  for our own convenience only.
- `topLeftCell` defaults to `A1`. Never copy the reference's scroll residue.
- `<headerFooter>` may be emitted empty (`<headerFooter/>`) to match the
  reference's sheets 3–5; `oddFooter: '&C&A'` reproduces MAIN PAGE's centred
  sheet name. **The `"B Pty Ltd"` notice is another company's legal text and is
  never emitted, under any option.**
- Inline strings keep `xml:space="preserve"`; a `\n` in a value is emitted as
  `&#10;` (unambiguous under any parser's whitespace handling) and requires
  `wrap: true` on the cell to render as a line break.

---

## 9. numFmts and dates

Three custom formats. Custom ids must be **≥ 165** — 0–163 are reserved
builtins and openpyxl treats a collision as a hard error:

| id | code | name | use |
| --- | --- | --- | --- |
| 164 | `# ??/??` | `frac2` | **seeded, frozen**; graded size values (`3.75` → `3 3/4`) |
| 165 | `# ?/?` | `frac1` | single-digit fractions where the reference uses `#\ ?/?` (its numFmt 178) |
| 166 | `dd\-mmm\-yy` | `date` | the creation-date serial (`17-May-25`) |

The reference writes `#\ ??/??` (backslash-escaped space) where we write
`# ??/??`. Both render identically; **keep ours** — id 164's format code is a
tested literal (contract 4 in §2).

Builtin ids reachable by name without a `numFmts` entry: `text` → `49`
(`@`), `int` → `1`, `dec2` → `3`. `numFmt('# ?/?')` (a raw format code) is
also accepted and interns a fresh id from 165 upward, in first-use order.

ISO / `Date` → Excel serial:

```js
// Excel's epoch is 1899-12-30 because of the fictional 1900-02-29. Local
// calendar fields, so the serial matches the date the TD sees on screen and
// the text formatSpecDate() already prints.
function excelSerialFromDate(date, includeTime) {
  const days = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
     - Date.UTC(1899, 11, 30)) / 86400000);
  if (!includeTime) return days;
  const secs = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  return days + secs / 86400;
}
function excelSerialFromISO(iso, includeTime) {
  return excelSerialFromDate(new Date(iso), includeTime);
}
```

`sh.date(ref, d)` writes `<c r=… s=…><v>45794</v></c>` with `numFmt:'date'`.
Round-trip check for the suite: `excelSerialFromISO('2025-05-17') === 45794`.

**TOL is not a number.** It stays an `inlineStr` written verbatim
(`'1/2'`, `'-'`, `'± 3/4'`). The reference coerced its TOL column to date
serials; ADR 0048 declines to reproduce that, and
`scripts/export-xlsx-tests.mjs` asserts the verbatim text. `sh.cell()` must
never auto-coerce a string that *looks* like a fraction or a date — only an
actual `Date` instance takes the date path.

---

## 10. What we deliberately do not build

### The caption deviation (explicit)

The reference draws the board captions on the two BOM sheets as floating
`xdr:sp` text boxes (`Shape 3/4`, `Shape 5/6`) — `txBox="1"`, `spAutoFit`, a
25 400-EMU `schemeClr dk1` outline, and a full `a:txBody` / `a:bodyPr` /
`a:lstStyle` / `a:pPr` / `a:rPr` paragraph tree.

**We emit those captions as merged, filled, framed cell rows instead.** Stated
as a deviation, with three reasons:

1. Shape XML is a large, brittle surface for a hand-written writer, and its
   text is invisible to every reader we validate with (`openpyxl` skips
   shapes).
2. A floating shape is not cell-addressable, so the HTML Preview & Export page
   — which mirrors *cells* — could not preview it. The preview must show what
   the workbook contains.
3. `schemeClr dk1` is a theme reference, and we do not ship a theme (below).

Visually the merged caption row is the stronger result: it aligns to the grid,
prints predictably, and survives a column-width change.

### Not built, with the argument

| omitted | why it is not required for readable parity |
| --- | --- |
| `xl/sharedStrings.xml` | `t="inlineStr"` is schema-valid and read by Excel, LibreOffice, Numbers, Sheets and openpyxl. The reference uses shared strings only because its authoring app does. Inline strings keep the writer single-pass, keep the emitted XML greppable by the suites (which match `<t xml:space="preserve">…`), and remove a whole part plus its dedup table from the determinism surface. Cost is file size in XML, which is negligible next to the embedded PNGs. |
| deflate | `unzipStore` in **both** suites throws on any non-STORE entry, and STORE is what makes fixed DOS timestamps sufficient for byte-determinism. Adding a deflate implementation would put a compressor's exact output in the determinism contract for no reader benefit. Permanently out. |
| `dxfs` + `conditionalFormatting` | the reference's 35 `dxfs` all belong to builtin cell/table styles; no conditional rule carries meaning a factory reads. Nothing in the five sheets needs one. |
| `dataValidations` | the pack is a print-facing document, not a data-entry form. Any list constraint would be TD tooling, and TD tooling lives on the HTML pages. |
| `xl/theme/theme1.xml` | **only** needed if a style references a theme colour. So the engine has a hard rule: **never emit `color theme="…"`, `schemeClr`, `tint`, or `<scheme val="minor"/>` — always explicit `rgb`.** The reference's `theme="1"` colours all resolve to black and become `FF000000`; its `<scheme val="minor"/>` fonts become plain `Arial`. With no theme reference anywhere, the part is genuinely unnecessary rather than merely omitted. This rule is checked by an assertion in `style-engine-tests`: `stylesXml()` must not match `/theme="|schemeClr|scheme val=/`. |
| `xl/tables/*.xml` + `<tableParts>` | the reference's 8 ListObjects are orphans over data that no longer exists (ADR 0048 drops them). A ListObject also imposes header-row semantics that fight the merged bands. |
| `docProps/app.xml`, `core.xml`, `custom.xml` | not required by the format; Excel opens the file without them, and `core.xml` would carry a creation timestamp — a determinism hazard for zero reader benefit. |
| `xl/calcChain.xml` | Excel rebuilds it; the existing formula cells already ship without one and cache `<v>` for non-recalculating viewers. |
| `cellStyles` beyond `Normal` | named styles exist so a human can re-apply formatting in Excel. The factory reads, it does not restyle. |
| `sheetProtection` | not in the reference, and it would block the TD's own edits. |
| `<xdr:sp>` shapes | see the caption deviation above. |
| the reference's file-specific residue | ADR 0048 decision 1: the stray `v` in construction A3, the lone backtick in the BOM image column, the single space in MAIN PAGE H4, trailing spaces, the 1000-row `customHeight` grids, styled-empty aprons, stale picture names, orphan ListObjects, and the `"B Pty Ltd"` footer. The `' BOM-LACE'` leading space **is** kept — it is one character in `workbook.xml` and costs nothing. |

---

## 11. Implementation checklist

- [ ] Capture `scripts/fixtures/legacy-styles.xml` and
      `legacy-spec-sheet.xml` from the **current** build (§7.1).
- [ ] Add `src/render/xlsx-style-engine.js`; register it in
      `scripts/source-parts.mjs` directly before `src/render/export-xlsx.js`.
- [ ] Seed arrays copy-pasted verbatim; frozen-wire-format comment in place.
- [ ] `createStyleBook`, `createSheet` per §3; `normalizeStyleOpts` total.
- [ ] Palette tables (§5) — including the §5.4 rule that palette lookups never
      resolve to a seeded id.
- [ ] Merge / frame / band / well per §6, row-major continuations.
- [ ] Sheet chrome in `CT_Worksheet` order (§8.4); `fitToPage` sets both flags.
- [ ] Drawing emitter with `colOff`/`rowOff`, optional `stretch`, derived names.
- [ ] numFmts 165/166 and `excelSerialFromDate` (§9).
- [ ] `buildSpecStylesXml()` → `createStyleBook().stylesXml()`; `SPEC_XF`
      frozen alias; every other legacy writer untouched (§7.6).
- [ ] `specRowModel` extracted; `buildSpecSheetRows` still byte-identical (§7.9).
- [ ] `scripts/style-engine-tests.mjs` with the seven assertions of §7.4,
      plus the no-theme regex and the `45794` serial check.
- [ ] `npm run build && npm run check && npm run export-xlsx && npm run preview-check`
      — `export-xlsx` must be green *before* any sheet is migrated.
- [ ] Register the new suite in `package.json` and `TESTING.md`.
