// POM meaning confirmation popover, reconfirm-meaning context menu,
// and the manage POM meanings picker.
// Source part for app.js. Run `npm run build` after editing.
//
// The popover opens once per (POM 6+ × machine) when the TD labels a line
// whose meaning is not yet confirmed for the current style. Picking a
// suggestion (or naming a new measurement) records a learning sample and
// remembers the POM→meaning binding. The reconfirm context menu lets the
// TD forget the current binding so the popover re-opens; the manage picker
// is the bulk view of every confirmed binding for the current style.

  // ---- POM meaning confirmation popover ----
  // Opens once per (POM 6+ × machine) when the TD labels a line whose
  // meaning hasn't been confirmed. Picking a suggestion (or naming a
  // brand-new measurement) records the learning sample and remembers
  // the POM→meaning binding for every future file. Skip drops the
  // sample without poisoning the bucket.

  let pendingMeaningEval = null;
  let pmpOtherInputEl = null;

  function openPomMeaningPopover(evalResult) {
    if (!el.pomMeaningPopover) return;
    closeAnnContextMenu();
    pendingMeaningEval = evalResult;
    el.pmpPomLabel.textContent = 'POM ' + evalResult.pom;
    renderPomMeaningSuggestions(evalResult);
    resetPomMeaningOtherMode();
    const screen = worldToScreen(evalResult.ann.label.x, evalResult.ann.label.y);
    el.pomMeaningPopover.style.left = screen.x + 'px';
    el.pomMeaningPopover.style.top  = screen.y + 'px';
    el.pomMeaningPopover.style.display = 'block';
  }

  function closePomMeaningPopover() {
    if (!el.pomMeaningPopover) return;
    el.pomMeaningPopover.style.display = 'none';
    el.pmpSuggestions.innerHTML = '';
    resetPomMeaningOtherMode();
    pendingMeaningEval = null;
  }

  function renderPomMeaningSuggestions(evalResult) {
    el.pmpSuggestions.innerHTML = '';
    for (const m of evalResult.suggestions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pmp-suggestion';
      const top = document.createElement('span');
      top.textContent = m.label;
      const sub = document.createElement('span');
      sub.className = 'pmp-anchors';
      sub.textContent = m.start + ' → ' + m.end;
      btn.appendChild(top);
      btn.appendChild(sub);
      btn.addEventListener('click', () => choosePomMeaning(m.id));
      el.pmpSuggestions.appendChild(btn);
    }
    if (evalResult.suggestions.length === 0) {
      const note = document.createElement('div');
      note.className = 'pmp-anchors';
      note.textContent = 'No close matches — add a new measurement below.';
      el.pmpSuggestions.appendChild(note);
    }
  }

  function choosePomMeaning(meaningId) {
    if (!pendingMeaningEval) return;
    const evalResult = pendingMeaningEval;
    const ok = commitMeaningChoice(evalResult, meaningId);
    if (ok) showToast('POM ' + evalResult.ann.learnSamplePom + ' learning sample saved');
    closePomMeaningPopover();
    updateUI();
    requestRender();
  }

  function submitCustomPomMeaning(label) {
    if (!pendingMeaningEval) return;
    const cleanLabel = String(label || '').trim();
    if (!cleanLabel) return;
    const evalResult = pendingMeaningEval;
    const ok = commitMeaningChoiceCustom(evalResult, cleanLabel);
    if (ok) showToast('POM ' + evalResult.ann.learnSamplePom + ' learning sample saved');
    else showToast('Could not match the line to anchors — skipped.');
    closePomMeaningPopover();
    updateUI();
    requestRender();
  }

  function resetPomMeaningOtherMode() {
    if (pmpOtherInputEl) {
      pmpOtherInputEl.remove();
      pmpOtherInputEl = null;
    }
    if (el.pmpOtherBtn) el.pmpOtherBtn.style.display = '';
  }

  function showPomMeaningOtherMode() {
    if (!el.pmpOtherBtn) return;
    el.pmpOtherBtn.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pmp-other-input';
    input.placeholder = 'Name this measurement…';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        submitCustomPomMeaning(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePomMeaningPopover();
      }
    });
    el.pmpOtherBtn.parentNode.appendChild(input);
    pmpOtherInputEl = input;
    requestAnimationFrame(() => input.focus());
  }

  // ---- Reconfirm Meaning context menu ----
  // Right-clicking an annotation in Manual Mode opens a small menu with
  // "Reconfirm Meaning". Picking it forgets the current (style, POM)
  // binding, clears the per-annotation dedup hash so the same line can be
  // re-evaluated, then re-runs evaluateManualPomSample which surfaces the
  // popover again. The line itself is never touched. Disabled for POMs
  // 1/3/5 (fixed) and 2/4 (extension lines) — there is nothing to
  // reconfirm in either case.

  let annContextMenuTargetId = null;

  function isReconfirmableAnn(ann) {
    if (!ann || ann.auto === true) return false;
    if (state.appMode === 'auto') return false;
    const pom = parsePomNumberFromLabel(ann.text);
    if (!pom) return false;
    const n = Number(pom);
    return n >= 6 && n <= POM_LABEL_MAX;
  }

  function onCanvasContextMenu(e) {
    e.preventDefault();
    // Auto Mode owns the canvas — no manual meaning workflow available.
    if (state.appMode === 'auto') { closeAnnContextMenu(); return; }
    // Don't stack a context menu on top of the meaning popover —
    // the popover already owns the next click and the keyboard.
    if (pendingMeaningEval) { closeAnnContextMenu(); return; }
    const screen = getMousePos(e);
    const world = screenToWorld(screen.x, screen.y);
    const hit = hitTestAnnotations(world);
    if (!hit) { closeAnnContextMenu(); return; }
    const ann = getAnnotationById(hit.id);
    if (!ann) { closeAnnContextMenu(); return; }
    setSelection('annotation', ann.id);
    openAnnContextMenu(ann, e.clientX, e.clientY);
  }

  function openAnnContextMenu(ann, clientX, clientY) {
    if (!el.annContextMenu || !el.annCtxReconfirm) return;
    annContextMenuTargetId = ann.id;
    const reconfirmable = isReconfirmableAnn(ann);
    el.annCtxReconfirm.disabled = !reconfirmable;
    el.annCtxReconfirm.title = reconfirmable
      ? 'Forget the current meaning for this POM and re-open the picker.'
      : 'Reconfirm only applies to POM 6+ labelled lines in Manual Mode.';
    // Position relative to the canvas wrapper (which is positioned).
    const wrap = el.annContextMenu.offsetParent || document.body;
    const rect = wrap.getBoundingClientRect();
    el.annContextMenu.style.left = (clientX - rect.left) + 'px';
    el.annContextMenu.style.top  = (clientY - rect.top)  + 'px';
    el.annContextMenu.style.display = 'block';
  }

  function closeAnnContextMenu() {
    if (!el.annContextMenu) return;
    el.annContextMenu.style.display = 'none';
    annContextMenuTargetId = null;
  }

  function reconfirmAnnotationMeaning(annId) {
    const ann = getAnnotationById(annId);
    if (!ann) return;
    if (!isReconfirmableAnn(ann)) {
      showToast('Reconfirm Meaning only applies to POM 6+ lines in Manual Mode.');
      return;
    }
    const pom = parsePomNumberFromLabel(ann.text);
    if (!pom) return;
    // Drop the (currentStyle, POM) binding so resolvePomMeaning returns
    // null and evaluateManualPomSample falls through to the popover path.
    forgetPomMeaning(pom);
    // Clear the per-annotation dedup hash. Without this the next eval
    // short-circuits because endpoint coords haven't changed since the
    // last commit, and the picker would never re-open.
    ann.learnSampleHash = null;
    const evalResult = evaluateManualPomSample(ann);
    if (evalResult.status === 'needsConfirmation') {
      openPomMeaningPopover(evalResult);
    } else if (evalResult.status === 'recorded') {
      // Shouldn't happen for POM 6+ (we just forgot the binding) but
      // covered for safety: the sample was re-recorded because the
      // meaning is fixed. POM 1/3/5 hit this branch in theory, but
      // isReconfirmableAnn already rejected them above.
      showToast('POM ' + evalResult.pom + ' meaning re-confirmed.');
    } else {
      showToast('Re-open the line on a sketch image to reconfirm its meaning.');
    }
  }

  // ---- Manage POM meanings picker ----
  // Lists every confirmed (POM N → meaning) for the current style. Each
  // row has a dropdown to switch to a different meaning, and a Forget
  // button that wipes the binding so the next commit re-asks. Lets the
  // TD recover from a wrong confirmation without nuking everything.
  function openManageMeaningsPicker() {
    const styleId = currentStyleId();
    const styleLabel = styleId === '__default__'
      ? 'default bucket (no style code)'
      : 'style "' + styleId + '"';
    const dialog = buildDialog({
      title: 'POM meanings — ' + styleLabel,
      sub: 'Change a wrong confirmation or forget it so the next POM commit re-asks.',
    });

    const body = document.createElement('div');
    body.className = 'dialog-body manage-meanings-body';

    const rows = listConfirmedMeanings(styleId);
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mm-empty';
      empty.textContent = 'No POM meanings confirmed for this style yet. Label a manual POM 6+ line to add one.';
      body.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'mm-list';
      const catalog = getAllCatalogMeanings();
      for (const row of rows) {
        list.appendChild(buildManageMeaningRow(row, catalog, styleId, dialog, list));
      }
      body.appendChild(list);
    }

    dialog.panel.appendChild(body);
    dialog.open();
  }

  function buildManageMeaningRow(row, catalog, styleId, dialog, listEl) {
    const node = document.createElement('div');
    node.className = 'mm-row';

    const pomEl = document.createElement('div');
    pomEl.className = 'mm-pom';
    pomEl.textContent = 'POM ' + row.pom;
    node.appendChild(pomEl);

    const select = document.createElement('select');
    select.className = 'mm-select';
    for (const m of catalog) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (m.id === row.meaning.id) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      confirmPomMeaning(row.pom, select.value);
      showToast('POM ' + row.pom + ' meaning changed.');
      updateUI();
    });
    node.appendChild(select);

    const forgetBtn = document.createElement('button');
    forgetBtn.type = 'button';
    forgetBtn.className = 'mm-forget';
    forgetBtn.textContent = 'Forget';
    forgetBtn.title = 'Forget this binding. Next POM ' + row.pom + ' commit will re-ask.';
    forgetBtn.addEventListener('click', () => {
      if (!window.confirm('Forget POM ' + row.pom + ' meaning? Next time you label a POM ' + row.pom + ' line, the picker will appear again.')) return;
      forgetPomMeaning(row.pom, styleId);
      node.remove();
      showToast('POM ' + row.pom + ' meaning forgotten.');
      updateUI();
      if (listEl && listEl.children.length === 0) dialog.close();
    });
    node.appendChild(forgetBtn);

    return node;
  }
