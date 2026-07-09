// Export Excel: write the Measurement Spec as a single offline .xlsx —
// title band, styleId + date, one row per visible POM (EN + 中文 + TOL;
// lines hidden via the review × toggle are omitted entirely), the full
// 14-column graded size run (alpha S–5XL from base L, depth M2–5XL2 from
// base L2), and the annotated board embedded as a PNG below the table.
// No library, no template, no network (offline invariant). The ZIP writer
// is the write-side mirror of the reader in src/import/pptx.js.
// Source part for app.js. Run `npm run build` after editing.
//
// Grading follows `Grading rules.md` (from SC.xlsx, Crossian standard):
// two anchored runs — alpha graded from the proto's Size L via per-size
// Δ-from-L columns, depth graded from Size L2 (explicit pomSpecs sizeL2,
// else L + a per-POM offset) via per-size Δ-from-L2 columns. A TD step
// override in state.gradeRules switches that POM to the constant-step
// model in both tiers (the Size Run dialog's model), so the dialog and
// the export can never disagree about an overridden POM. Held POMs stay
// flat across all 14 columns. NOTHING here touches the rule JSON.

  // The 14-size run from the export mock: 8 alpha + 6 depth columns. Kept as
  // data so switching a style to another membership (e.g. the 18-size run, or
  // 4XL2 instead of XL2) is a one-line reviewable edit. `base` is the alpha
  // size a tier-2 column grades around when the constant-step override is on.
  const SPEC_SIZE_RUN = [
    { label: 'S',    base: 'S',   tier: 1 }, { label: 'M',    base: 'M',   tier: 1 },
    { label: 'L',    base: 'L',   tier: 1 }, { label: 'XL',   base: 'XL',  tier: 1 },
    { label: '2XL',  base: '2XL', tier: 1 }, { label: '3XL',  base: '3XL', tier: 1 },
    { label: '4XL',  base: '4XL', tier: 1 }, { label: '5XL',  base: '5XL', tier: 1 },
    { label: 'M2',   base: 'M',   tier: 2 }, { label: 'L2',   base: 'L',   tier: 2 },
    { label: 'XL2',  base: 'XL',  tier: 2 }, { label: '2XL2', base: '2XL', tier: 2 },
    { label: '3XL2', base: '3XL', tier: 2 }, { label: '5XL2', base: '5XL', tier: 2 },
  ];

  // SC-derived alpha deltas from base L, in INCHES, one entry per GRADE_SIZES
  // column (S M L XL 2XL 3XL 4XL 5XL). See Grading rules.md §4. Held POMs
  // (6, 14, 15) are all-zero here and additionally forced flat by their
  // house `hold` flag, so a TD un-holding one starts from a sane rule.
  const SPEC_ALPHA_DELTA_L_IN = {
    '1':  [-1.75, -1.0,  0, 1.0,  2.0,  3.25, 4.25,  5.25],
    '2':  [-2.25, -1.0,  0, 2.0,  3.0,  5.25, 6.25,  8.25],
    '3':  [-2.5,  -1.25, 0, 1.25, 2.5,  3.75, 5.0,   6.25],
    '4':  [-2.5,  -1.25, 0, 1.25, 2.5,  3.75, 5.0,   6.25],
    '5':  [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 0.875, 1.0],
    '6':  [0, 0, 0, 0, 0, 0, 0, 0],
    '7':  [-0.25, -0.125, 0, 0.125, 0.25, 0.375, 0.4375, 0.5],
    '8':  [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 0.875, 1.0],
    '9':  [-0.75, -0.375, 0, 0.375, 0.75, 1.375, 1.75, 2.125],
    '10': [-1.0,  -0.5,  0, 0.5,  1.0,  2.0,  2.5,   3.0],
    '11': [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 0.875, 1.0],
    '12': [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 0.875, 1.0],
    '13': [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 0.875, 1.0],
    '14': [0, 0, 0, 0, 0, 0, 0, 0],
    '15': [0, 0, 0, 0, 0, 0, 0, 0],
    '16': [-0.5,  -0.25, 0, 0.25, 0.5,  0.75, 1.0,   1.25],
  };

  // Depth run: L2 = L + offset (inches; 0 for band and held POMs), then the
  // per-size deltas from L2 for M2 L2 XL2 2XL2 3XL2 5XL2. Grading rules.md
  // §2.1 — explicit values, NOT a copied alpha column (the two runs taper at
  // different absolute sizes near the top).
  const SPEC_DEPTH_OFFSET_IN = {
    '1': 0, '2': 0, '3': 1.25, '4': 1.25, '5': 0.25, '6': 0, '7': 0.125,
    '8': 0.25, '9': 0.375, '10': 0.5, '11': 0.25, '12': 0.25, '13': 0.25,
    '14': 0, '15': 0, '16': 0.25,
  };
  const SPEC_DEPTH_DELTA_L2_IN = {
    '1':  [-1.0,   0, 1.0,   2.0, 3.25,  5.25],
    '2':  [-1.0,   0, 2.0,   3.0, 5.25,  7.25],
    '3':  [-1.25,  0, 1.25,  2.5, 3.75,  6.25],
    '4':  [-1.25,  0, 1.25,  2.5, 3.75,  6.25],
    '5':  [-0.25,  0, 0.25,  0.5, 0.625, 0.75],
    '6':  [0, 0, 0, 0, 0, 0],
    '7':  [-0.125, 0, 0.125, 0.25, 0.375, 0.5],
    '8':  [-0.25,  0, 0.25,  0.5, 0.625, 0.75],
    '9':  [-0.375, 0, 0.375, 1.0, 1.375, 2.125],
    '10': [-0.5,   0, 0.5,   1.5, 2.0,   3.0],
    '11': [-0.25,  0, 0.25,  0.5, 0.625, 0.875],
    '12': [-0.25,  0, 0.25,  0.5, 0.625, 0.875],
    '13': [-0.25,  0, 0.25,  0.5, 0.625, 0.875],
    '14': [0, 0, 0, 0, 0, 0],
    '15': [0, 0, 0, 0, 0, 0],
    '16': [-0.25,  0, 0.25,  0.5, 0.75,  1.25],
  };

  // Effective depth rule for a POM in the project's unit: a TD override in
  // state.depthRules (per-POM L2−L offset) wins; otherwise the SC default
  // converted from inches. Mirrors getGradeRule / state.gradeRules.
  function getDepthRule(pomKey) {
    const key = String(pomKey);
    const unitScale = inchesToUnit(state.calibration.unit);
    const houseOffset = (SPEC_DEPTH_OFFSET_IN[key] || 0) * unitScale;
    const override = (state.depthRules && state.depthRules[key]) || null;
    if (!override || override.offset == null) return { offset: houseOffset, overridden: false };
    return { offset: Number(override.offset), overridden: true };
  }

  // The 14 graded values for one POM, in the project's unit, aligned with
  // SPEC_SIZE_RUN. Returns nulls when the POM has no base (no Size L and no
  // measured line) — the writer leaves those cells blank.
  function buildFullSizeRun(pomKey, annByPom) {
    const key = String(pomKey);
    const baseInfo = gradeBaseValue(key, annByPom);
    if (baseInfo.value == null) return SPEC_SIZE_RUN.map(() => null);
    const protoL = baseInfo.value;
    const rule = getGradeRule(key);
    const unitScale = inchesToUnit(state.calibration.unit);
    const alphaDeltas = SPEC_ALPHA_DELTA_L_IN[key] || null;
    const baseIdx = GRADE_SIZES.indexOf(GRADE_BASE_SIZE);

    const alphaValue = (sizeLabel) => {
      if (rule.hold) return protoL;
      const i = GRADE_SIZES.indexOf(sizeLabel);
      if (rule.overridden || !alphaDeltas) return protoL + (i - baseIdx) * rule.step;
      return protoL + alphaDeltas[i] * unitScale;
    };

    // L2 anchor: an explicit Size L2 wins; else derive from L. Under a TD
    // constant-step override the derivation is "one step up" (the standard's
    // offset = the L→XL step); otherwise the SC per-POM offset.
    const explicitL2 = parseSpecNumber(getPomSpec(key).sizeL2);
    const depthRule = getDepthRule(key);
    const derivedOffset = rule.hold ? 0
      : (rule.overridden && !depthRule.overridden ? rule.step : depthRule.offset);
    const protoL2 = explicitL2 != null ? explicitL2 : protoL + derivedOffset;
    const depthDeltas = SPEC_DEPTH_DELTA_L2_IN[key] || null;
    const depthLabels = SPEC_SIZE_RUN.filter(c => c.tier === 2).map(c => c.label);

    const depthValue = (col) => {
      if (rule.hold) return protoL;
      if (rule.overridden || !depthDeltas) {
        return protoL2 + (GRADE_SIZES.indexOf(col.base) - baseIdx) * rule.step;
      }
      return protoL2 + depthDeltas[depthLabels.indexOf(col.label)] * unitScale;
    };

    return SPEC_SIZE_RUN.map(col => (col.tier === 1 ? alphaValue(col.label) : depthValue(col)));
  }

  // ---- Offline .xlsx writer (ZIP, method 0 = STORE) ----

  const SPEC_XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Build a STORE-method ZIP from [{ name, bytes }]. `stamp` (a Date) feeds
  // every DOS timestamp so the same inputs yield byte-identical archives —
  // the export determinism the test suite asserts.
  function zipStore(files, stamp) {
    const encoder = new TextEncoder();
    const dosTime = (stamp.getHours() << 11) | (stamp.getMinutes() << 5) | Math.floor(stamp.getSeconds() / 2);
    const dosDate = (Math.max(0, stamp.getFullYear() - 1980) << 9) | ((stamp.getMonth() + 1) << 5) | stamp.getDate();
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const data = file.bytes;
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);          // version needed
      lv.setUint16(6, 0, true);           // flags
      lv.setUint16(8, 0, true);           // method 0 = STORE
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); // compressed size
      lv.setUint32(22, data.length, true); // uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);          // extra length
      local.set(nameBytes, 30);
      local.set(data, 30 + nameBytes.length);
      locals.push(local);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);          // version made by
      cv.setUint16(6, 20, true);          // version needed
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);          // method
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, offset, true);     // local header offset
      central.set(nameBytes, 46);
      centrals.push(central);

      offset += local.length;
    }

    const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    const total = offset + centralSize + eocd.length;
    const out = new Uint8Array(total);
    let p = 0;
    for (const chunk of locals.concat(centrals, [eocd])) {
      out.set(chunk, p);
      p += chunk.length;
    }
    return out;
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // Column letters for the fixed 18-column grid (A..R): 4 label columns +
  // the 14 SPEC_SIZE_RUN columns.
  const SPEC_XLSX_COLS = 4 + SPEC_SIZE_RUN.length;
  function specColLetter(index) {
    let s = '';
    let n = index;
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s;
  }

  // Graded values as clean decimals (no float noise), written as numeric
  // cells so Excel treats them as numbers. TOL stays text — Excel would
  // coerce "1/2" to a date (known standard pitfall).
  function specNumberText(value) {
    return String(Math.round(value * 10000) / 10000);
  }

  function formatSpecDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(date.getDate()).padStart(2, '0');
    return dd + '.' + months[date.getMonth()] + '.' + String(date.getFullYear() % 100).padStart(2, '0');
  }

  // Header fills from the export mock. Order defines fill ids 2.. in
  // styles.xml (0 = none, 1 = gray125 are mandatory).
  const SPEC_XLSX_FILLS = [
    'DCE6F1', // 2 title band — light blue
    'E4DFEC', // 3 style/date row — light purple
    'D9D9D9', // 4 label headers (POM / EN / 中文) — gray
    'B8CCE4', // 5 TOL header — blue
    'FCD5B4', // 6 alpha size headers S–5XL — peach
    'C4D79B', // 7 M2 — green
    'FABF8F', // 8 L2 — orange
    'B7DEE8', // 9 XL2 — cyan
    'CCC0DA', // 10 2XL2 — violet
    'FFFF99', // 11 3XL2 — yellow
    '92CDDC', // 12 5XL2 — teal
  ];

  // cellXfs indexes (see buildSpecStylesXml): 0 default · 1 title · 2 style
  // row · 3 label header · 4 TOL header · 5 alpha header · 6..11 depth
  // headers (M2..5XL2) · 12 text cell · 13 centered text cell · 14 number
  // cell · 15 centered number cell (POM column).
  const SPEC_XF = {
    title: 1, styleRow: 2, headLabel: 3, headTol: 4, headAlpha: 5, headDepth0: 6,
    text: 12, textCenter: 13, number: 14, pom: 15,
  };

  function buildSpecStylesXml() {
    const fills = ['<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>']
      .concat(SPEC_XLSX_FILLS.map(rgb =>
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' + rgb + '"/><bgColor indexed="64"/></patternFill></fill>'));
    const headerXf = (fillId) =>
      '<xf numFmtId="0" fontId="1" fillId="' + fillId + '" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
      + '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>';
    const cellXfs = [
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
      // 1 title band
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
        + '<alignment horizontal="center" vertical="center"/></xf>',
      // 2 style/date row
      '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
        + '<alignment horizontal="center" vertical="center"/></xf>',
      headerXf(4), headerXf(5), headerXf(6),
      headerXf(7), headerXf(8), headerXf(9), headerXf(10), headerXf(11), headerXf(12),
      // 12 text cell
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">'
        + '<alignment vertical="center" wrapText="1"/></xf>',
      // 13 centered text cell (TOL)
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">'
        + '<alignment horizontal="center" vertical="center"/></xf>',
      // 14 number cell
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">'
        + '<alignment horizontal="right" vertical="center"/></xf>',
      // 15 POM number cell
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">'
        + '<alignment horizontal="center" vertical="center"/></xf>',
    ];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="3">'
      + '<font><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="14"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="' + fills.length + '">' + fills.join('') + '</fills>'
      + '<borders count="2">'
      + '<border><left/><right/><top/><bottom/><diagonal/></border>'
      + '<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>'
      + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="' + cellXfs.length + '">' + cellXfs.join('') + '</cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>';
  }

  function specInlineStrCell(ref, styleId, text) {
    return '<c r="' + ref + '" s="' + styleId + '" t="inlineStr"><is><t xml:space="preserve">'
      + xmlEscape(text) + '</t></is></c>';
  }

  function specNumberCell(ref, styleId, value) {
    return '<c r="' + ref + '" s="' + styleId + '"><v>' + specNumberText(value) + '</v></c>';
  }

  function specBlankCell(ref, styleId) {
    return '<c r="' + ref + '" s="' + styleId + '"/>';
  }

  function buildSpecSheetXml(rowsData, hasDrawing) {
    const lastCol = specColLetter(SPEC_XLSX_COLS - 1);
    const cols = '<cols>'
      + '<col min="1" max="1" width="6" customWidth="1"/>'
      + '<col min="2" max="2" width="42" customWidth="1"/>'
      + '<col min="3" max="3" width="28" customWidth="1"/>'
      + '<col min="4" max="4" width="9" customWidth="1"/>'
      + '<col min="5" max="' + SPEC_XLSX_COLS + '" width="7.5" customWidth="1"/>'
      + '</cols>';
    const rows = rowsData.map(row =>
      '<row r="' + row.r + '"' + (row.ht ? ' ht="' + row.ht + '" customHeight="1"' : '') + '>'
      + row.cells.join('') + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<dimension ref="A1:' + lastCol + rowsData[rowsData.length - 1].r + '"/>'
      + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
      + cols
      + '<sheetData>' + rows + '</sheetData>'
      + '<mergeCells count="2"><mergeCell ref="A1:' + lastCol + '1"/><mergeCell ref="A2:' + lastCol + '2"/></mergeCells>'
      + (hasDrawing ? '<drawing r:id="rId1"/>' : '')
      + '</worksheet>';
  }

  // oneCellAnchor with an explicit EMU extent keeps the sketch's aspect
  // ratio identical across Excel / Sheets / Numbers (column-width-based
  // twoCellAnchor sizing drifts between viewers). 1 px = 9525 EMU.
  function buildSpecDrawingXml(anchorRow, widthPx, heightPx) {
    const cx = Math.round(widthPx * 9525);
    const cy = Math.round(heightPx * 9525);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"'
      + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<xdr:oneCellAnchor>'
      + '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff>'
      + '<xdr:row>' + anchorRow + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
      + '<xdr:ext cx="' + cx + '" cy="' + cy + '"/>'
      + '<xdr:pic>'
      + '<xdr:nvPicPr><xdr:cNvPr id="2" name="Annotated sketch"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
      + '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
      + '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
      + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
      + '</xdr:pic>'
      + '<xdr:clientData/>'
      + '</xdr:oneCellAnchor>'
      + '</xdr:wsDr>';
  }

  // Assemble every workbook part and ZIP them. `image` is optional
  // ({ bytes, width, height }); without it the sheet is table-only.
  // `now` feeds the header date and the ZIP timestamps — pass a fixed date
  // to get byte-identical output (determinism tests).
  function buildSpecWorkbookXlsx(now, image) {
    const encoder = new TextEncoder();
    const annByPom = new Map();
    for (const ann of state.annotations) annByPom.set(getLabelText(ann), ann);
    const allPomKeys = Object.keys(POM_TEMPLATE).sort((a, b) => Number(a) - Number(b));

    // A POM line the TD hid via the review × toggle (state.hiddenAnnIds) is
    // omitted from the exported spec entirely — its row and every measurement
    // for it. Paired POMs (1/2, 3/4) share one drawn line, so hiding it drops
    // both halves of the pair. Hidden state is session-only (not persisted),
    // so the export mirrors the current review view, just like the board.
    const hiddenPomKeys = new Set();
    for (const ann of state.annotations) {
      if (isAnnHidden(ann.id)) hiddenPomKeys.add(String(getLabelText(ann)));
    }
    for (const key of Array.from(hiddenPomKeys)) {
      const pairing = POM_TEMPLATE[key] && POM_TEMPLATE[key].pairing;
      const partner = pairing && (pairing.partner || pairing.primary);
      if (partner != null) hiddenPomKeys.add(String(partner));
    }
    const pomKeys = allPomKeys.filter(key => !hiddenPomKeys.has(String(key)));

    const styleLabel = (state.styleId || '').trim() || 'Untitled';
    const rowsData = [];
    // Merged band rows: the anchor cell carries the text; the remaining
    // columns still need styled blanks (in column order) so the band's
    // fill + border span the full merge in every viewer.
    const bandRow = (r, styleId, text) => ({
      r,
      ht: r === 1 ? 26 : 18,
      cells: [specInlineStrCell('A' + r, styleId, text)].concat(
        Array.from({ length: SPEC_XLSX_COLS - 1 }, (_, i) => specBlankCell(specColLetter(1 + i) + r, styleId))
      ),
    });
    rowsData.push(bandRow(1, SPEC_XF.title, 'Measurement Spec'));
    rowsData.push(bandRow(2, SPEC_XF.styleRow, styleLabel + ' - ' + formatSpecDate(now)));

    const depthLabels = SPEC_SIZE_RUN.filter(c => c.tier === 2).map(c => c.label);
    const headCells = [
      specInlineStrCell('A3', SPEC_XF.headLabel, 'POM'),
      specInlineStrCell('B3', SPEC_XF.headLabel, 'Description - English'),
      specInlineStrCell('C3', SPEC_XF.headLabel, 'Description - Chinese'),
      specInlineStrCell('D3', SPEC_XF.headTol, 'TOL'),
    ];
    SPEC_SIZE_RUN.forEach((col, i) => {
      const styleId = col.tier === 1 ? SPEC_XF.headAlpha : SPEC_XF.headDepth0 + depthLabels.indexOf(col.label);
      headCells.push(specInlineStrCell(specColLetter(4 + i) + '3', styleId, col.label));
    });
    rowsData.push({ r: 3, ht: 20, cells: headCells });

    for (let i = 0; i < pomKeys.length; i += 1) {
      const key = pomKeys[i];
      const r = 4 + i;
      const spec = getPomSpec(key);
      const run = buildFullSizeRun(key, annByPom);
      const cells = [
        specNumberCell('A' + r, SPEC_XF.pom, Number(key)),
        specInlineStrCell('B' + r, SPEC_XF.text, spec.en),
        specInlineStrCell('C' + r, SPEC_XF.text, spec.zh),
        spec.tol ? specInlineStrCell('D' + r, SPEC_XF.textCenter, spec.tol) : specBlankCell('D' + r, SPEC_XF.textCenter),
      ];
      run.forEach((value, c) => {
        const ref = specColLetter(4 + c) + r;
        cells.push(value != null ? specNumberCell(ref, SPEC_XF.number, value) : specBlankCell(ref, SPEC_XF.number));
      });
      rowsData.push({ r, cells });
    }

    const hasImage = !!(image && image.bytes && image.bytes.length);
    const sheetXml = buildSpecSheetXml(rowsData, hasImage);

    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + (hasImage ? '<Default Extension="png" ContentType="image/png"/>' : '')
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + (hasImage ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '')
      + '</Types>';

    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>';

    const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
      + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets><sheet name="Measurement Spec" sheetId="1" r:id="rId1"/></sheets>'
      + '</workbook>';

    const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>';

    const files = [
      { name: '[Content_Types].xml', bytes: encoder.encode(contentTypes) },
      { name: '_rels/.rels', bytes: encoder.encode(rootRels) },
      { name: 'xl/workbook.xml', bytes: encoder.encode(workbookXml) },
      { name: 'xl/_rels/workbook.xml.rels', bytes: encoder.encode(workbookRels) },
      { name: 'xl/styles.xml', bytes: encoder.encode(buildSpecStylesXml()) },
      { name: 'xl/worksheets/sheet1.xml', bytes: encoder.encode(sheetXml) },
    ];

    if (hasImage) {
      // Display the sketch at a readable width (~the table's width) while
      // keeping the full-resolution PNG bytes; anchored two rows below the
      // last POM row (rows are 0-based in drawingml).
      const displayWidth = Math.min(image.width, 1100);
      const displayHeight = Math.round(image.height * (displayWidth / image.width));
      const anchorRow = 3 + pomKeys.length + 2;
      const sheetRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
        + '</Relationships>';
      const drawingRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
        + '</Relationships>';
      files.push(
        { name: 'xl/worksheets/_rels/sheet1.xml.rels', bytes: encoder.encode(sheetRels) },
        { name: 'xl/drawings/drawing1.xml', bytes: encoder.encode(buildSpecDrawingXml(anchorRow, displayWidth, displayHeight)) },
        { name: 'xl/drawings/_rels/drawing1.xml.rels', bytes: encoder.encode(drawingRels) },
        { name: 'xl/media/image1.png', bytes: image.bytes },
      );
    }

    return zipStore(files, now);
  }

  function makeSpecXlsxFileName(now) {
    const pad = (v) => String(v).padStart(2, '0');
    const styleSlug = ((state.styleId || '').trim() || 'untitled').replace(/[^\w\-]+/g, '_');
    return 'measurement-spec-' + styleSlug + '-'
      + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.xlsx';
  }

  async function specBoardPngBytes() {
    const bounds = getContentBounds();
    if (!bounds) return null;
    const canvas = renderBoardRegionToCanvas(bounds);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('canvas.toBlob produced no data'))),
        'image/png'
      );
    });
    const buffer = await blob.arrayBuffer();
    return { bytes: new Uint8Array(buffer), width: canvas.width, height: canvas.height };
  }

  async function exportSpecXlsx() {
    const bounds = getContentBounds();
    if (!bounds) {
      showToast('Nothing to export yet. Paste an image or draw annotations first.');
      return;
    }
    try {
      const now = new Date();
      const image = await specBoardPngBytes();
      const zipBytes = buildSpecWorkbookXlsx(now, image);
      downloadBlob(new Blob([zipBytes], { type: SPEC_XLSX_MIME }), makeSpecXlsxFileName(now));
      showToast('Excel spec exported — 16 POMs, full size run, sketch embedded.');
    } catch (error) {
      console.error('[Export Excel] failed:', error);
      showToast('Excel export failed. Please try again after reducing image size.', 4200);
    }
  }

  // Test hooks for scripts/export-xlsx-tests.mjs: build the workbook with a
  // frozen date (determinism) and hand the bytes back as base64 — headless
  // Chrome can't observe a real download. Attached here (this part loads
  // after debug-api.js) so the export surface stays in one file.
  if (typeof window !== 'undefined' && window.__braAutoModeDebug) {
    window.__braAutoModeDebug.exportSpecXlsxBase64 = async (isoDate, options) => {
      const now = isoDate ? new Date(isoDate) : new Date();
      const withImage = !options || options.image !== false;
      const image = withImage ? await specBoardPngBytes() : null;
      return bytesToBase64(buildSpecWorkbookXlsx(now, image));
    };
    window.__braAutoModeDebug.buildFullSizeRun = (pomKey) => {
      const annByPom = new Map();
      for (const ann of state.annotations) annByPom.set(getLabelText(ann), ann);
      return buildFullSizeRun(pomKey, annByPom);
    };
  }
