// Measurement / spec panel rendering and the calibration commands it owns.
// Source part for app.js. Run `npm run build` after editing.
//
// renderSpecPanel rebuilds the table on the right side of the board. It
// renders the Auto Mode draft review section (if drafts are present),
// then walks the 16 POM template slots in order — using a drawn
// annotation when the label matches, or a read-only template row when
// nothing has been drawn yet — pairing primary/secondary POMs into one
// row where the schema defines a pair. Every row exposes editable Size L
// and TOL inputs so the TD can enter spec-sheet targets even before a
// line is drawn; those values live on state.pomSpecs (per POM label) and
// persist through save/load + undo/redo. Cell builders here are paired
// helpers; setScaleFromSelection / clearScale drive the calibration row
// shown above the table.

  // ---- Per-POM visibility (review overlay) ----
  // Hide toggles let the TD isolate one POM line at a time on the canvas so
  // they can eyeball whether Auto Mode picked the right anchors. Kept as
  // arrays on state (serialization-friendly); the helpers below normalize
  // to a set-like lookup. Session-only, not persisted.
  function isAnnHidden(id) {
    if (id == null) return false;
    const ids = state.hiddenAnnIds;
    if (!Array.isArray(ids)) return false;
    return ids.indexOf(id) !== -1;
  }

  function isDraftHidden(id) {
    if (id == null) return false;
    const ids = state.hiddenDraftIds;
    if (!Array.isArray(ids)) return false;
    return ids.indexOf(id) !== -1;
  }

  function toggleAnnHidden(id) {
    if (id == null) return;
    if (!Array.isArray(state.hiddenAnnIds)) state.hiddenAnnIds = [];
    const idx = state.hiddenAnnIds.indexOf(id);
    if (idx === -1) state.hiddenAnnIds.push(id);
    else state.hiddenAnnIds.splice(idx, 1);
    renderSpecPanel();
    requestRender();
  }

  function toggleDraftHidden(id) {
    if (id == null) return;
    if (!Array.isArray(state.hiddenDraftIds)) state.hiddenDraftIds = [];
    const idx = state.hiddenDraftIds.indexOf(id);
    if (idx === -1) state.hiddenDraftIds.push(id);
    else state.hiddenDraftIds.splice(idx, 1);
    renderSpecPanel();
    requestRender();
  }

  function hiddenPomCount() {
    const a = Array.isArray(state.hiddenAnnIds) ? state.hiddenAnnIds.length : 0;
    const d = Array.isArray(state.hiddenDraftIds) ? state.hiddenDraftIds.length : 0;
    return a + d;
  }

  // How many POM lines can be toggled at all: drawn annotations plus (in Auto
  // Mode) outstanding drafts. Template rows with no line drawn yet are not
  // hideable, so they don't count. Drives whether the visibility control row
  // renders and whether "Hide all" has anything to act on.
  function hideablePomCount() {
    let n = Array.isArray(state.annotations) ? state.annotations.length : 0;
    if (state.appMode === 'auto' && state.autoMode && Array.isArray(state.autoMode.draftAnnotations)) {
      n += state.autoMode.draftAnnotations.length;
    }
    return n;
  }

  function showAllPoms() {
    let changed = false;
    if (Array.isArray(state.hiddenAnnIds) && state.hiddenAnnIds.length > 0) {
      state.hiddenAnnIds = [];
      changed = true;
    }
    if (Array.isArray(state.hiddenDraftIds) && state.hiddenDraftIds.length > 0) {
      state.hiddenDraftIds = [];
      changed = true;
    }
    if (!changed) return;
    renderSpecPanel();
    requestRender();
  }

  // Inverse of showAllPoms: hide every visible POM line at once so the TD can
  // clear the sketch and reveal lines one at a time. Mirrors showAllPoms'
  // ann + draft handling so the two stay symmetric.
  function hideAllPoms() {
    let changed = false;
    if (!Array.isArray(state.hiddenAnnIds)) state.hiddenAnnIds = [];
    for (const ann of state.annotations) {
      if (ann && ann.id != null && state.hiddenAnnIds.indexOf(ann.id) === -1) {
        state.hiddenAnnIds.push(ann.id);
        changed = true;
      }
    }
    if (state.appMode === 'auto' && state.autoMode && Array.isArray(state.autoMode.draftAnnotations)) {
      if (!Array.isArray(state.hiddenDraftIds)) state.hiddenDraftIds = [];
      for (const draft of state.autoMode.draftAnnotations) {
        if (draft && draft.id != null && state.hiddenDraftIds.indexOf(draft.id) === -1) {
          state.hiddenDraftIds.push(draft.id);
          changed = true;
        }
      }
    }
    if (!changed) return;
    renderSpecPanel();
    requestRender();
  }

  // Small × / + toggle used in each POM row. Text intentionally kept to a
  // single glyph so the button stays out of the row's way.
  function buildVisibilityToggleButton(hidden, onToggle, opts) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pom-vis-btn' + (hidden ? ' is-hidden' : '');
    btn.textContent = hidden ? '+' : '×';
    btn.title = hidden
      ? 'Show this POM line on the sketch'
      : 'Hide this POM line so you can review other lines alone';
    btn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    if (opts && opts.disabled) {
      btn.disabled = true;
      btn.title = opts.disabledTitle || 'Nothing drawn yet for this POM.';
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      onToggle();
    });
    return btn;
  }

  // ---- Calibration ----
  function setScaleFromSelection() {
    const ann = getSelectedAnnotation();
    if (!ann) {
      showToast('Select a line first, then click Set Scale to calibrate by its real length.');
      return;
    }
    const px = lineLength(ann);
    if (px <= 0) {
      showToast('That line is too short to calibrate.');
      return;
    }
    openScaleDialog(px);
  }

  function clearScale() {
    if (state.calibration.unitsPerPx == null) return;
    state.calibration = { unitsPerPx: null, unit: state.calibration.unit };
    pushHistoryIfChanged();
    showToast('Scale cleared. Values are now manual only.');
    updateUI();
    requestRender();
  }

  // ---- Measurement table panel ----
  // Total column count in the spec table:
  //   POM | Description | 中文 | Value | Size L | Size L2 | TOL.
  // Value is the measured length of the drawn line (the connection back to
  // the sketch); Size L is the spec target and TOL its allowed variance.
  // Size L2 is the optional second sample base that anchors the depth tier
  // (M2–5XL2) in the Excel export — blank derives L2 = L + offset.
  const SPEC_COL_COUNT = 7;

  function renderSpecPanel() {
    renderSpecCalNote();
    // Only preserve focus when the user is mid-edit in a text field inside
    // the panel — annotation rows, template rows, and paired rows all
    // qualify. Draft rows have no editable inputs, so Approve / R/O buttons
    // must always allow a full rebuild — otherwise row badges and the
    // review-header counts go stale (e.g. Approved/Edited badges, the
    // "N approved" line in the panel header).
    const active = document.activeElement;
    const editingPanelField = active
      && el.specBody.contains(active)
      && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
      && !!(active.closest('tr[data-ann-id]') || active.closest('tr[data-pom-key]'));
    if (editingPanelField) {
      updateSpecHighlightOnly();
      return;
    }
    el.specBody.innerHTML = '';

    // Sticky visibility control row: renders whenever there is at least one
    // hideable line, offering "Hide all" (isolate the sketch) and, once
    // anything is hidden, "Show all" — each a one-click toggle so the TD can
    // reveal and re-hide lines while checking evidence.
    if (hideablePomCount() > 0) {
      el.specBody.appendChild(buildVisibilityControlRow());
    }

    // Auto Mode: render the 16-row draft review section first.
    const draftPomKeys = new Set();
    if (state.appMode === 'auto') {
      renderAutoReviewHeader();
      const drafts = state.autoMode.draftAnnotations
        .slice()
        .sort((a, b) => (a.seq || 0) - (b.seq || 0));
      for (const draft of drafts) {
        el.specBody.appendChild(buildDraftRow(draft));
        const draftKey = String(draft.text != null ? draft.text : draft.seq);
        if (draftKey) draftPomKeys.add(draftKey);
      }
    }

    // Panel is now pre-populated with the 16 POM template rows, so the
    // "No measurements yet" placeholder is redundant.
    el.specEmpty.style.display = 'none';

    // Lookup by effective POM label so each slot can find its annotation.
    const anns = state.annotations.slice();
    const annByPom = new Map();
    for (const ann of anns) annByPom.set(getLabelText(ann), ann);

    // Render one row per POM slot in POM order — every POM gets its own row,
    // including the band (1 & 2) and chest (3 & 4) pairs, which each show
    // their own description, 中文, TOL and Size L. Pairing still lives in the
    // rule data (it drives the POM 2/4 extension-stub geometry) but is no
    // longer merged into a single panel row. Uses the annotation when one
    // exists, else a template row so 中文 / TOL / Size L stay editable. In
    // Auto Mode, POMs covered by an outstanding draft skip their template row
    // so the draft review section is not duplicated.
    const renderedAnnIds = new Set();
    const templateOrder = Object.keys(POM_TEMPLATE).sort((a, b) => Number(a) - Number(b));
    for (const pomKey of templateOrder) {
      const ann = annByPom.get(pomKey) || null;
      if (ann) {
        el.specBody.appendChild(buildSingleSpecRow(ann));
        renderedAnnIds.add(ann.id);
      } else if (!draftPomKeys.has(pomKey)) {
        el.specBody.appendChild(buildTemplateSpecRow(pomKey));
      }
    }

    // Any additional user-labeled annotations that fall outside 1..16
    // (custom POMs, renamed labels) render after the template block in
    // POM-numerical order.
    const extras = anns
      .filter(a => !renderedAnnIds.has(a.id))
      .sort((a, b) => labelSortKey(a) - labelSortKey(b) || a.seq - b.seq);
    for (const ann of extras) {
      if (renderedAnnIds.has(ann.id)) continue;
      el.specBody.appendChild(buildSingleSpecRow(ann));
      renderedAnnIds.add(ann.id);
    }
  }

  // ---- Size L / TOL cell helpers ----
  // Values are stored per POM label in state.pomSpecs, so a paired row can
  // hold two independent Size L / TOL values (e.g. POM 1 Relax vs POM 2
  // Extend) even though only the primary row is visible.
  // Built-in labels for a POM (from POM_TEMPLATE), used as defaults for the
  // editable Description (English) and 中文 columns when the project has no
  // per-POM override.
  function builtinPomZh(pomKey) {
    return getPomInfo(String(pomKey == null ? '' : pomKey).trim()).zh || '';
  }
  function builtinPomEn(pomKey) {
    return getPomInfo(String(pomKey == null ? '' : pomKey).trim()).desc || '';
  }

  // ---- Library-value suggestions (Tier-0 measurement layer) ----
  // Each POM may carry a corpus-derived Size L suggestion (median + range +
  // default TOL + confidence) loaded from auto_mode_rules/sizeL-suggestions.json
  // and exposed as POM_SUGGESTIONS. These are PRE-FILLED as TD-owned defaults:
  // shown muted with a "library" badge, used for tolerance + export until the
  // TD types an override, and never persisted into state.pomSpecs — so a
  // regenerated corpus updates every POM the TD has not touched. Values are
  // stored in inches (the corpus unit); we only convert for display when the TD
  // has switched the working scale to cm (docs/decisions/0009-*).
  function getPomSuggestion(pomKey) {
    const key = String(pomKey == null ? '' : pomKey).trim();
    if (!key || !POM_SUGGESTIONS) return null;
    const s = POM_SUGGESTIONS[key];
    return s && typeof s === 'object' ? s : null;
  }

  // True when the POM has a usable library median (corpus data exists).
  function hasSuggestedValue(pomKey) {
    const s = getPomSuggestion(pomKey);
    return !!(s && s.median != null && s.n > 0);
  }

  // Corpus inches -> active display unit (no-op for the default 'in').
  function suggestionToDisplay(inchValue) {
    if (inchValue == null) return null;
    return state.calibration.unit === 'cm' ? inchValue * 2.54 : inchValue;
  }

  // Precision-preserving formatter (formatMeasure rounds to 0.1, too coarse for
  // eighth-inch specs like 3.75 or a 1/8 tolerance). Keeps up to 3 decimals.
  function formatSuggestion(inchValue) {
    const v = suggestionToDisplay(inchValue);
    if (v == null) return '';
    return String(Math.round(v * 1000) / 1000);
  }

  // Parse a fraction / mixed-number / decimal string ('1/4', '5 1/2', '0.25').
  // TOL defaults arrive as fractions but the tool's inputs are decimal.
  function fractionToNumber(raw) {
    if (raw == null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    const frac = str.match(/^(\d+)\/(\d+)$/);
    if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : null;
  }

  // Formatted Size L suggestion ('' when the POM has no library data).
  function suggestedSizeL(pomKey) {
    const s = getPomSuggestion(pomKey);
    if (!s || s.median == null || !(s.n > 0)) return '';
    return formatSuggestion(s.median);
  }

  // Formatted default-TOL suggestion as a decimal in the active unit.
  function suggestedTol(pomKey) {
    const s = getPomSuggestion(pomKey);
    if (!s || !s.tol) return '';
    const n = fractionToNumber(s.tol);
    return n == null ? '' : formatSuggestion(n);
  }

  function getPomSpec(pomKey) {
    const key = String(pomKey == null ? '' : pomKey).trim();
    if (!key) return { sizeL: '', sizeL2: '', tol: '', zh: '', en: '' };
    const raw = (state.pomSpecs && state.pomSpecs[key]) || {};
    return {
      // sizeL / tol fall back to the library suggestion when the TD has no
      // override (mirrors how en / zh fall back to the built-in name). This is
      // what pre-fills the panel and drives tolerance + Excel export.
      sizeL: raw.sizeL != null ? String(raw.sizeL) : suggestedSizeL(key),
      sizeL2: raw.sizeL2 != null ? String(raw.sizeL2) : '',
      tol: raw.tol != null ? String(raw.tol) : suggestedTol(key),
      // en / zh fall back to the built-in name so every row shows a label
      // without the TD typing one; only edits that differ are persisted.
      zh: raw.zh != null ? String(raw.zh) : builtinPomZh(key),
      en: raw.en != null ? String(raw.en) : builtinPomEn(key),
    };
  }

  function setPomSpec(pomKey, field, rawValue) {
    const key = String(pomKey == null ? '' : pomKey).trim();
    if (!key) return false;
    if (field !== 'sizeL' && field !== 'sizeL2' && field !== 'tol' && field !== 'zh' && field !== 'en') return false;
    if (!state.pomSpecs || typeof state.pomSpecs !== 'object') state.pomSpecs = {};
    const trimmed = String(rawValue == null ? '' : rawValue).trim();
    const current = state.pomSpecs[key] || {};
    const next = { ...current };
    // en / 中文 are name fields: a blank value OR one equal to the built-in
    // default stores no override (so the built-in can still evolve); anything
    // else is a per-project override. sizeL / tol just clear on blank.
    let clears;
    if (field === 'zh') clears = (trimmed === '' || trimmed === builtinPomZh(key));
    else if (field === 'en') clears = (trimmed === '' || trimmed === builtinPomEn(key));
    // sizeL / tol store no override when blank OR equal to the library
    // suggestion, so an accepted suggestion stays live and a regenerated corpus
    // can still evolve it (matches en / zh handling above).
    else if (field === 'sizeL') clears = (trimmed === '' || trimmed === suggestedSizeL(key));
    else if (field === 'tol') clears = (trimmed === '' || trimmed === suggestedTol(key));
    else clears = (trimmed === '');
    if (clears) {
      if (next[field] == null) return false;
      delete next[field];
    } else {
      if (next[field] === trimmed) return false;
      next[field] = trimmed;
    }
    if (Object.keys(next).length === 0) {
      if (!state.pomSpecs[key]) return false;
      delete state.pomSpecs[key];
    } else {
      state.pomSpecs[key] = next;
    }
    return true;
  }

  function specFieldTdClass(field) {
    if (field === 'sizeL' || field === 'sizeL2') return 'spec-td-size';
    if (field === 'zh') return 'spec-td-zh';
    return 'spec-td-tol';
  }

  function buildSpecInputCell(pomKey, field, placeholder) {
    const td = document.createElement('td');
    td.className = specFieldTdClass(field);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = field === 'zh' ? 'spec-zh' : 'spec-val';
    input.value = getPomSpec(pomKey)[field];
    input.placeholder = placeholder || '';
    input.addEventListener('change', () => {
      if (setPomSpec(pomKey, field, input.value)) pushHistoryIfChanged();
    });
    td.appendChild(input);
    return td;
  }

  function appendSuggestBadge(td, text, cls, title) {
    const badge = document.createElement('div');
    badge.className = 'spec-conf spec-suggest-badge ' + cls;
    badge.textContent = text;
    if (title) badge.title = title;
    td.appendChild(badge);
  }

  // Decorate a Size L / TOL cell to show it holds a library suggestion (not a
  // TD entry): mute the input and, for Size L, add a "library · <confidence>"
  // provenance badge — or a "no data" badge for POMs with no corpus value
  // (15 back-straps distance, 16 front apex). Skipped once the TD overrides.
  function decorateSuggestedCell(td, pomKey, field) {
    const key = String(pomKey == null ? '' : pomKey).trim();
    const sug = getPomSuggestion(key);
    if (!sug) return;
    const raw = (state.pomSpecs && state.pomSpecs[key]) || {};
    const hasOverride = raw[field] != null;
    if (hasOverride) return;

    if (field === 'sizeL' && !hasSuggestedValue(key)) {
      appendSuggestBadge(td, 'no data', 'very_low',
        'No library value for this POM — enter Size L manually.');
      return;
    }
    const suggested = field === 'sizeL' ? suggestedSizeL(key) : suggestedTol(key);
    if (!suggested) return;
    const input = td.querySelector('input');
    if (input) input.classList.add('is-suggested');
    if (field === 'sizeL') {
      const conf = sug.confidence || 'very_low';
      const rangeIn = (sug.min != null && sug.max != null) ? ' · range ' + sug.min + '–' + sug.max + ' in' : '';
      appendSuggestBadge(td, 'library · ' + conf, 'library',
        'Library suggestion — median of ' + sug.n + ' Size-L samples' + rangeIn
        + ' · source: corpus. Type to override.');
    }
  }

  // Editable English Description cell (mirrors the 中文 column): a textarea
  // pre-filled with the built-in POM name, editable, with per-POM overrides
  // persisted in state.pomSpecs[pom].en. Used on both template and applied
  // rows so the TD can rename any POM's English term. `ann` (optional) links
  // focus to the annotation so clicking the field selects its line.
  function buildEnDescCell(pomKey, ann) {
    const td = document.createElement('td');
    const input = document.createElement('textarea');
    input.className = 'spec-desc';
    input.rows = 2;
    input.value = getPomSpec(pomKey).en;
    input.placeholder = builtinPomEn(pomKey) || '—';
    const refreshTitle = () => { input.title = input.value || input.placeholder || ''; };
    refreshTitle();
    if (ann) input.addEventListener('focus', () => setSelection('annotation', ann.id));
    input.addEventListener('input', refreshTitle);
    input.addEventListener('change', () => {
      if (setPomSpec(pomKey, 'en', input.value)) pushHistoryIfChanged();
      refreshTitle();
    });
    td.appendChild(input);
    return td;
  }

  // Sticky control row at the top of the panel. Shows "Hide all POMs" while any
  // line is still visible and "Show all POMs (N hidden)" while any line is
  // hidden — both together when the sketch is partially hidden.
  function buildVisibilityControlRow() {
    const tr = document.createElement('tr');
    tr.className = 'spec-show-all-row';
    const td = document.createElement('td');
    td.colSpan = SPEC_COL_COUNT;
    const wrap = document.createElement('div');
    wrap.className = 'spec-vis-actions';

    const hiddenCount = hiddenPomCount();
    const visibleCount = hideablePomCount() - hiddenCount;

    if (visibleCount > 0) {
      const hideBtn = document.createElement('button');
      hideBtn.type = 'button';
      hideBtn.className = 'spec-hide-all-btn';
      hideBtn.textContent = 'Hide all POMs';
      hideBtn.title = 'Hide every POM line on the sketch so you can reveal them one at a time.';
      hideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideAllPoms();
      });
      wrap.appendChild(hideBtn);
    }
    if (hiddenCount > 0) {
      const showBtn = document.createElement('button');
      showBtn.type = 'button';
      showBtn.className = 'spec-show-all-btn';
      showBtn.textContent = 'Show all POMs (' + hiddenCount + ' hidden)';
      showBtn.title = 'Restore visibility for every hidden POM line on the sketch.';
      showBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showAllPoms();
      });
      wrap.appendChild(showBtn);
    }
    td.appendChild(wrap);
    tr.appendChild(td);
    return tr;
  }

  function appendVisibilityToggle(td, opts) {
    const btn = buildVisibilityToggleButton(!!opts.hidden, opts.onToggle, {
      disabled: !!opts.disabled,
      disabledTitle: opts.disabledTitle,
    });
    td.appendChild(btn);
  }

  // Rich hover tooltip for a POM badge. Surfaces the JSON contract data
  // (view, required + optional anchors, expected confidence tier) so the
  // TD reviewing evidence can see at a glance what a POM is supposed to
  // depend on. Falls back to the standard description for anything not
  // in the POM_TEMPLATE (e.g. custom-labeled annotations).
  function getPomTooltip(pomKey) {
    const key = String(pomKey == null ? '' : pomKey).trim();
    if (!key) return '';
    const entry = POM_TEMPLATE && POM_TEMPLATE[key];
    if (!entry) return getPomInfo(key).desc || '';
    const bits = [];
    bits.push('POM ' + key + ' — ' + entry.desc);
    if (entry.viewRole) bits.push('View: ' + prettyView(entry.viewRole));
    if (Array.isArray(entry.requiredAnchors) && entry.requiredAnchors.length) {
      bits.push('Anchors: ' + entry.requiredAnchors.join(' ↔ '));
    }
    if (Array.isArray(entry.optionalAnchors) && entry.optionalAnchors.length) {
      bits.push('Optional: ' + entry.optionalAnchors.join(', '));
    }
    if (entry.expected_confidence_tier) {
      bits.push('Expected confidence: ' + entry.expected_confidence_tier);
    }
    return bits.join('\n');
  }

  function prettyView(viewRole) {
    if (viewRole === 'front_outer') return 'front outer';
    if (viewRole === 'front_inner') return 'front inner';
    if (viewRole === 'back') return 'back';
    return String(viewRole);
  }

  // Read-only measured value for a drawn line: its length in the calibrated
  // unit when a scale is set, else raw board pixels. This is the connection
  // from the detected / adjusted geometry back to a usable number — Size L is
  // the target, TOL the allowed variance, and this is what the sketch is.
  function measuredValueText(ann) {
    if (!ann || !ann.start || !ann.end) return '';
    const lengthPx = lineLength(ann);
    if (!(lengthPx > 0)) return '';
    if (state.calibration.unitsPerPx != null) {
      return formatMeasure(lengthPx * state.calibration.unitsPerPx) + ' ' + state.calibration.unit;
    }
    return Math.round(lengthPx) + ' px';
  }

  // Tolerant numeric parse for a Size L / TOL field (leading number wins;
  // blank / non-numeric → null so the caller can treat it as "not set").
  function parseSpecNumber(raw) {
    if (raw == null) return null;
    const n = parseFloat(String(raw).trim());
    return Number.isFinite(n) ? n : null;
  }

  // Compare a drawn line's measured length against its Size L ± TOL target.
  // Only meaningful when a real-unit scale is set (Size L / TOL are entered in
  // the calibrated unit; an uncalibrated px value can't be compared to cm/in).
  // status: 'in' (within TOL) | 'out' (outside TOL) | 'delta' (target set, no
  // TOL — show the difference only) | null (cannot compare).
  function evaluateSpecTolerance(ann, pomKey) {
    const out = { measured: null, target: null, tol: null, delta: null, status: null };
    if (!ann || state.calibration.unitsPerPx == null) return out;
    const lengthPx = lineLength(ann);
    if (!(lengthPx > 0)) return out;
    out.measured = lengthPx * state.calibration.unitsPerPx;
    const target = parseSpecNumber(getPomSpec(pomKey).sizeL);
    if (target == null) return out;
    out.target = target;
    out.delta = out.measured - target;
    const tol = parseSpecNumber(getPomSpec(pomKey).tol);
    if (tol == null) { out.status = 'delta'; return out; }
    out.tol = Math.abs(tol);
    out.status = Math.abs(out.delta) <= out.tol + 1e-9 ? 'in' : 'out';
    return out;
  }

  function buildMeasuredValueCell(ann, pomKey) {
    const td = document.createElement('td');
    td.className = 'spec-td-value';
    const text = measuredValueText(ann);
    if (!text) {
      td.textContent = '—';
      td.title = 'No line drawn for this POM yet.';
      return td;
    }
    const measuredEl = document.createElement('span');
    measuredEl.className = 'spec-measured';
    measuredEl.textContent = text;
    td.appendChild(measuredEl);

    const unit = state.calibration.unit;
    const ev = evaluateSpecTolerance(ann, pomKey);
    if (ev.status) {
      const signed = (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '±') + formatMeasure(Math.abs(ev.delta));
      const chip = document.createElement('span');
      chip.className = 'spec-delta spec-delta-' + (ev.status === 'in' ? 'in' : ev.status === 'out' ? 'out' : 'neutral');
      chip.textContent = ev.status === 'in' ? signed + ' ✓' : ev.status === 'out' ? signed + ' ✗' : signed;
      td.appendChild(chip);
      if (ev.status === 'in') td.classList.add('spec-in');
      else if (ev.status === 'out') td.classList.add('spec-out');
      td.title = ev.status === 'delta'
        ? `Measured ${formatMeasure(ev.measured)} ${unit} · target ${formatMeasure(ev.target)} ${unit} · Δ ${signed} (no TOL set)`
        : `Measured ${formatMeasure(ev.measured)} ${unit} · target ${formatMeasure(ev.target)} ± ${formatMeasure(ev.tol)} ${unit} · Δ ${signed} · ${ev.status === 'in' ? 'in tolerance' : 'OUT of tolerance'}`;
    } else {
      td.title = state.calibration.unitsPerPx != null
        ? 'Measured from the line on the sketch. Enter Size L (+ TOL) to check tolerance.'
        : 'Measured length in pixels — use Set Scale to show real ' + state.calibration.unit + '.';
    }

    // Per-row calibration shortcut: because a line exists here (measuredValueText
    // was non-empty), the TD can set the board scale straight from this POM —
    // type its real length and every POM re-estimates. Reuses the Set Scale
    // engine (openScaleDialog), so it stays one global, undoable scale.
    const refPx = lineLength(ann);
    if (refPx > 0) {
      const entry = POM_TEMPLATE && POM_TEMPLATE[String(pomKey)];
      const refLabel = entry && entry.desc ? ('POM ' + pomKey + ' — ' + entry.desc) : null;
      const scaleBtn = document.createElement('button');
      scaleBtn.type = 'button';
      scaleBtn.className = 'spec-scale-ref';
      scaleBtn.textContent = '📏';
      scaleBtn.title = state.calibration.unitsPerPx == null
        ? 'Set scale from this line — type its real length and every POM switches to real units.'
        : 'Re-calibrate scale from this line — type its real length and every POM re-estimates.';
      scaleBtn.style.cssText = 'margin-left:6px;border:none;background:none;cursor:pointer;font-size:11px;line-height:1;padding:0;opacity:0.5;';
      scaleBtn.addEventListener('mouseenter', () => { scaleBtn.style.opacity = '1'; });
      scaleBtn.addEventListener('mouseleave', () => { scaleBtn.style.opacity = '0.5'; });
      scaleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openScaleDialog(refPx, refLabel);
      });
      td.appendChild(scaleBtn);
    }
    return td;
  }

  // Relationship hint so the split band/chest rows still show that POM 2/4
  // (Extend) are derived from POM 1/3 (Relax). Reads the pairing that still
  // drives the extension-stub geometry in the rule data.
  function pomPairHint(pomKey) {
    const entry = POM_TEMPLATE && POM_TEMPLATE[String(pomKey)];
    const pairing = entry && entry.pairing;
    if (!pairing) return '';
    if (pairing.role === 'primary') {
      return (pairing.primaryLabel || 'Primary') + ' · pairs with POM ' + pairing.partner;
    }
    if (pairing.role === 'secondary') {
      const primaryEntry = POM_TEMPLATE[String(pairing.primary)];
      const label = (primaryEntry && primaryEntry.pairing && primaryEntry.pairing.secondaryLabel) || 'Extend';
      return label + ' · derived from POM ' + pairing.primary;
    }
    return '';
  }

  function appendPairHint(descTd, pomKey) {
    const hint = pomPairHint(pomKey);
    if (!hint) return;
    const hintEl = document.createElement('div');
    hintEl.className = 'spec-pair-hint';
    hintEl.textContent = hint;
    descTd.appendChild(hintEl);
  }

  // Template row: no annotation exists yet for this POM. Shows the POM
  // number and description as read-only text plus editable Size L / TOL
  // cells so the TD can enter spec-sheet targets before drawing anything.
  function buildTemplateSpecRow(pomKey) {
    const tr = document.createElement('tr');
    tr.classList.add('template-row');
    tr.dataset.pomKey = pomKey;

    const pomTd = document.createElement('td');
    const pomBadge = document.createElement('span');
    pomBadge.className = 'spec-pom';
    pomBadge.textContent = pomKey;
    pomBadge.title = getPomTooltip(pomKey);
    pomTd.appendChild(pomBadge);
    appendVisibilityToggle(pomTd, {
      hidden: false,
      disabled: true,
      disabledTitle: 'Draw or apply a line labeled ' + pomKey + ' first.',
      onToggle: () => {},
    });

    const descTd = buildEnDescCell(pomKey, null);
    appendPairHint(descTd, pomKey);

    tr.appendChild(pomTd);
    tr.appendChild(descTd);
    tr.appendChild(buildSpecInputCell(pomKey, 'zh', ''));
    tr.appendChild(buildMeasuredValueCell(null, pomKey));
    const sizeTd = buildSpecInputCell(pomKey, 'sizeL', '');
    decorateSuggestedCell(sizeTd, pomKey, 'sizeL');
    tr.appendChild(sizeTd);
    tr.appendChild(buildSpecInputCell(pomKey, 'sizeL2', ''));
    const tolTd = buildSpecInputCell(pomKey, 'tol', '');
    decorateSuggestedCell(tolTd, pomKey, 'tol');
    tr.appendChild(tolTd);
    return tr;
  }

  // Standard one-annotation spec row
  // (POM | Description | 中文 | Value | Size L | TOL).
  function buildSingleSpecRow(ann) {
    const tr = document.createElement('tr');
    tr.dataset.annId = ann.id;
    const specKey = getLabelText(ann);
    tr.dataset.pomKey = specKey;
    if (state.selection.kind === 'annotation' && state.selection.id === ann.id) {
      tr.className = 'selected';
    }
    if (isAnnHidden(ann.id)) tr.classList.add('pom-hidden');
    tr.addEventListener('click', () => setSelection('annotation', ann.id));

    const { td: pomTd } = buildPomCell(ann);
    const descTd = buildEnDescCell(specKey, ann);
    appendPairHint(descTd, specKey);
    const zhTd = buildSpecInputCell(specKey, 'zh', '');
    const valueTd = buildMeasuredValueCell(ann, specKey);
    const sizeTd = buildSpecInputCell(specKey, 'sizeL', '');
    decorateSuggestedCell(sizeTd, specKey, 'sizeL');
    const sizeL2Td = buildSpecInputCell(specKey, 'sizeL2', '');
    const tolTd = buildSpecInputCell(specKey, 'tol', '');
    decorateSuggestedCell(tolTd, specKey, 'tol');

    tr.appendChild(pomTd);
    tr.appendChild(descTd);
    tr.appendChild(zhTd);
    tr.appendChild(valueTd);
    tr.appendChild(sizeTd);
    tr.appendChild(sizeL2Td);
    tr.appendChild(tolTd);
    return tr;
  }

  function buildPomCell(ann) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'spec-pom';
    input.value = ann.text != null ? ann.text : '';
    input.placeholder = String(ann.seq);
    const refreshPomTooltip = () => {
      const key = input.value.trim() || String(ann.seq);
      const tip = getPomTooltip(key);
      input.title = tip || '';
      td.title = tip || '';
    };
    refreshPomTooltip();
    input.addEventListener('focus', () => setSelection('annotation', ann.id));
    input.addEventListener('input', refreshPomTooltip);
    input.addEventListener('change', () => {
      const v = input.value.trim();
      const next = v === '' ? null : v;
      if (ann.text !== next) { ann.text = next; pushHistoryIfChanged(); requestRender(); }
      refreshPomTooltip();
    });
    td.appendChild(input);
    appendVisibilityToggle(td, {
      hidden: isAnnHidden(ann.id),
      onToggle: () => toggleAnnHidden(ann.id),
    });
    // No metadata badges here (TD request 2026-07-10: the POM-number cell
    // shows only the number). Confidence/drawability/accepted state remain
    // visible in the Auto Mode draft-review rows.
    return { td, getValue: () => input.value.trim() };
  }

  function labelSortKey(ann) {
    const m = String(getLabelText(ann)).match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 9999;
  }

  function renderSpecCalNote() {
    let note = 'Label a callout with its <b>POM number</b> (e.g. 8) to auto-fill its description and standard size-L value. Values are editable per style.';
    if (state.appMode === 'auto') {
      const det = state.autoMode.detection;
      const anchors = state.autoMode.anchors;
      const drafts = state.autoMode.draftAnnotations;
      if (drafts.length > 0) {
        note = 'Auto Mode — <b>review drafts</b>: approve, mark review-only, or drag endpoints to edit. Then <i>Apply Approved Lines</i>.';
      } else if (anchors.length > 0 && state.autoMode.anchorsHidden) {
        note = '<b>Auto Mode — POM lines applied.</b> Anchors are hidden. Click <b>Reset Anchors</b> to show and re-tune them, or <b>Detect</b> to start over.';
      } else if (anchors.length > 0) {
        const edited = anchors.filter(a => !a.autoFilled).length;
        note = '<b>Auto Mode — anchors placed.</b> ' + anchors.length + ' anchors' +
          (edited > 0 ? ' (' + edited + ' adjusted)' : ' (all auto-seeded)') +
          '. Drag any that look wrong, then click <b>Generate POM Drafts</b>.';
      } else if (det) {
        const pct = (det.coverage * 100).toFixed(1);
        const features = [];
        features.push('band');
        if (det.chestY != null) features.push('chest');
        if (det.cradleY != null) features.push('cradle');
        if (det.sideLeftX != null) features.push('seam L');
        if (det.sideRightX != null) features.push('seam R');
        if (det.apexLeft) features.push('apex L');
        if (det.apexRight) features.push('apex R');
        if (det.strapTop && det.strapBottom) features.push('strap');
        if (det.back && det.back.top && det.back.bottom) features.push('back center');
        const sym = det.symmetry != null ? ' • sym ' + Math.round(det.symmetry * 100) + '%' : '';
        const fit = det.quality != null
          ? ' • fit ' + (det.quality >= 0.65 ? 'A' : (det.quality >= 0.40 ? 'B' : 'C'))
          : '';
        let views = '';
        if (det.viewBoxes && det.viewBoxes.length > 1) {
          const frontOuter = det.viewBoxes.find(v => v && (v.viewRole === 'front_outer' || v.role === 'front'));
          const frontInner = det.viewBoxes.find(v => v && v.viewRole === 'front_inner');
          const back  = det.viewBoxes.find(v => v && (v.viewRole === 'back' || v.role === 'back'));
          if (frontOuter && back && frontInner) {
            views = ' • front outer + back + front inner identified';
          } else if (frontOuter && back) {
            views = ' • front outer + back identified';
          } else if (frontOuter) {
            views = ' • ' + det.viewBoxes.length + ' views, front outer identified';
          } else {
            views = ' • ' + det.viewBoxes.length + ' views, using #' + ((det.primaryViewIndex || 0) + 1);
          }
          if (det.viewRoleReviewRequired) views += ' • roles need review';
        }
        note = '<b>Auto Mode — detected sketch.</b> ' + det.sampleWidth + '×' + det.sampleHeight +
          ' • local offline vision' + views + ' • ' + pct + '% coverage' + sym + fit +
          (det.durationMs != null ? ' • ' + det.durationMs + 'ms' : '') +
          '<br><span class="muted">Features: ' + features.join(', ') +
          '</span>. Next: drag any wrong anchors, then <i>Generate POM Drafts</i>.';
      } else {
        note = 'Auto Mode — click <b>Detect Sketch</b> to estimate the bra shape, then anchors, then POM drafts.';
      }
    }
    // Scale status applies in every mode, so append it last — the Auto Mode
    // branch above rebuilds `note` from scratch and would otherwise drop it.
    if (state.calibration.unitsPerPx != null) {
      note += ' <b>Scale set</b> — Value shown in <b>' + state.calibration.unit + '</b>.';
    } else {
      note += ' <span class="muted">Value in px — use <b>Set Scale</b> for real units.</span>';
    }
    el.specCal.innerHTML = note;
  }

  function renderAutoReviewHeader() {
    const auto = state.autoMode;
    const drafts = auto.draftAnnotations;
    const hasDrafts = drafts.length > 0;
    const hasErrors = !!(auto.validation && auto.validation.errors && auto.validation.errors.length);
    const hasWarnings = !!(auto.validation && auto.validation.warnings && auto.validation.warnings.length);
    const hasLastError = !!auto.lastError;
    // Nothing to review and nothing to report — skip the section entirely so
    // the applied board isn't cluttered with an empty "0 rows" header.
    if (!hasDrafts && !hasErrors && !hasWarnings && !hasLastError) return;

    const approvable = drafts.filter(d => !isReviewOnlyDraft(d) && !d.tdApproved);
    const highApprovable = approvable.filter(d => d.confidence === 'high');
    const approved = drafts.filter(d => d.tdApproved && !isReviewOnlyDraft(d)).length;
    const reviewOnly = drafts.filter(d => isReviewOnlyDraft(d)).length;

    const headerTr = document.createElement('tr');
    headerTr.className = 'draft-row';
    headerTr.style.background = 'transparent';
    const headerTd = document.createElement('td');
    headerTd.colSpan = SPEC_COL_COUNT;
    // Draft-review summary + bulk actions only when drafts are outstanding;
    // the error / warning blocks below render on their own.
    let html = '';
    if (hasDrafts) {
      html += '<div class="auto-review-head">' +
        '<b>Auto Mode draft review</b> — ' + drafts.length + ' row' + (drafts.length === 1 ? '' : 's') + ' • ' +
        approved + ' approved • ' + reviewOnly + ' review-only' +
        (auto.runId ? '<br><span style="font-weight:400">Run: ' + auto.runId + '</span>' : '') +
        '<div class="auto-review-bulk">' +
          '<button type="button" class="auto-bulk-btn" data-bulk="approve-all"' +
            (approvable.length === 0 ? ' disabled' : '') + '>' +
            'Approve all (' + approvable.length + ')' +
          '</button>' +
          '<button type="button" class="auto-bulk-btn" data-bulk="approve-high"' +
            (highApprovable.length === 0 ? ' disabled' : '') + '>' +
            'Approve high-confidence (' + highApprovable.length + ')' +
          '</button>' +
        '</div>' +
        '</div>';
    }

    if (auto.validation && auto.validation.errors && auto.validation.errors.length) {
      html += '<div class="auto-review-errors"><b>Validation errors</b><ul>' +
        auto.validation.errors.map(e => '<li>' + escapeHtml(e) + '</li>').join('') +
        '</ul></div>';
    }
    if (auto.validation && auto.validation.warnings && auto.validation.warnings.length) {
      html += '<div class="auto-review-errors" style="background:#fffbeb;border-color:#fde68a;color:#854d0e"><b>Warnings</b><ul>' +
        auto.validation.warnings.map(w => '<li>' + escapeHtml(w) + '</li>').join('') +
        '</ul></div>';
    }
    if (auto.lastError) {
      html += '<div class="auto-review-errors"><b>Last error</b><br>' +
        escapeHtml(auto.lastError) + '</div>';
    }
    headerTd.innerHTML = html;
    headerTd.querySelectorAll('[data-bulk]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-bulk');
        const targets = mode === 'approve-high' ? highApprovable : approvable;
        if (targets.length === 0) return;
        for (const d of targets) approveDraftAnnotation(d);
        pushHistoryIfChanged();
        updateUI();
        requestRender();
        showToast('Approved ' + targets.length + ' draft' + (targets.length === 1 ? '' : 's') + '.');
      });
    });
    headerTr.appendChild(headerTd);
    el.specBody.appendChild(headerTr);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildDraftRow(draft) {
    const tr = document.createElement('tr');
    tr.dataset.draftId = draft.id;
    tr.classList.add('draft-row');
    if (isReviewOnlyDraft(draft)) tr.classList.add('review-only');
    if (draft.tdApproved) tr.classList.add('approved');
    if (state.selection.kind === 'draft' && state.selection.id === draft.id) {
      tr.classList.add('selected');
    }
    if (isDraftHidden(draft.id)) tr.classList.add('pom-hidden');
    tr.addEventListener('click', () => setSelection('draft', draft.id));

    const pomTd = document.createElement('td');
    const pomLabel = document.createElement('span');
    const draftKey = draft.text != null ? String(draft.text) : String(draft.seq);
    pomLabel.textContent = draftKey;
    pomLabel.style.fontWeight = '700';
    pomLabel.title = getPomTooltip(draftKey);
    pomTd.appendChild(pomLabel);
    appendVisibilityToggle(pomTd, {
      hidden: isDraftHidden(draft.id),
      onToggle: () => toggleDraftHidden(draft.id),
    });
    const status = document.createElement('span');
    status.className = 'draft-status';
    if (isReviewOnlyDraft(draft)) status.textContent = 'Review-only';
    else if (draft.tdApproved) status.textContent = 'Approved';
    else if (draft.tdEdited) status.textContent = 'Edited';
    else status.textContent = draft.drawability === 'APPROXIMATE' ? 'Approx' : 'Draft';
    pomTd.appendChild(status);

    const descTd = document.createElement('td');
    const descBody = document.createElement('div');
    descBody.className = 'spec-desc-text';
    const standardDesc = getPomInfo(draft.text || draft.seq).desc || '—';
    descBody.textContent = standardDesc;
    descBody.title = standardDesc;
    descTd.appendChild(descBody);
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:10.5px;color:#6b7280;margin-top:2px;line-height:1.35';
    const metaBits = [];
    if (draft.confidence) metaBits.push('conf: ' + draft.confidence);
    if (draft.reason) metaBits.push(draft.reason);
    if (draft.uncertainty && isReviewOnlyDraft(draft)) metaBits.push(draft.uncertainty);
    // Phase 7: the landmark-QA explanations behind a review-only demotion
    // (missing seam, no back view, inferred cup, …) so the TD sees the "why"
    // without opening the debug payload.
    if (isReviewOnlyDraft(draft) && Array.isArray(draft.reviewNotes)) {
      for (const note of draft.reviewNotes) metaBits.push(note);
    }
    if (metaBits.length) meta.textContent = metaBits.join(' • ');
    descTd.appendChild(meta);

    const actionsTd = document.createElement('td');
    actionsTd.colSpan = SPEC_COL_COUNT - 2;
    actionsTd.style.cssText = 'white-space:nowrap';

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.textContent = draft.tdApproved ? 'Approved' : 'Approve';
    approveBtn.disabled = isReviewOnlyDraft(draft) || draft.tdApproved;
    approveBtn.style.cssText = 'padding:3px 8px;font-size:11px;margin-right:4px';
    approveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      blurActivePanelField();
      setSelection('draft', draft.id);
      approveDraftAnnotation(draft);
      pushHistoryIfChanged();
      updateUI();
      requestRender();
    });
    actionsTd.appendChild(approveBtn);

    const reviewBtn = document.createElement('button');
    reviewBtn.type = 'button';
    reviewBtn.textContent = 'R/O';
    reviewBtn.title = 'Mark this row REVIEW_ONLY';
    reviewBtn.disabled = isReviewOnlyDraft(draft);
    reviewBtn.style.cssText = 'padding:3px 8px;font-size:11px';
    reviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      blurActivePanelField();
      setSelection('draft', draft.id);
      markDraftReviewOnly(draft);
      pushHistoryIfChanged();
      updateUI();
      requestRender();
    });
    actionsTd.appendChild(reviewBtn);

    tr.appendChild(pomTd);
    tr.appendChild(descTd);
    tr.appendChild(actionsTd);
    return tr;
  }

  function blurActivePanelField() {
    // Drop focus off any input/button inside the spec panel so the next
    // renderSpecPanel pass is free to rebuild rows (Approve / R/O state).
    const active = document.activeElement;
    if (active && el.specBody.contains(active) && typeof active.blur === 'function') {
      active.blur();
    }
  }

  function updateSpecHighlightOnly() {
    const rows = el.specBody.querySelectorAll('tr');
    rows.forEach((tr) => {
      const selId = state.selection.kind === 'annotation' ? String(state.selection.id) : null;
      const isAnnSel = selId != null
        && (selId === tr.dataset.annId || selId === tr.dataset.pairAnnId);
      const isDraftSel = state.selection.kind === 'draft' && String(state.selection.id) === tr.dataset.draftId;
      tr.classList.toggle('selected', isAnnSel || isDraftSel);
    });
  }

