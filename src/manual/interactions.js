// Mouse/keyboard interactions, selection helpers, draw/drag/erase
// dispatch. Source part for app.js. Run `npm run build` after editing.
//
// onMouseDown/Move/Up own the canvas pointer state, including pan, draw,
// erase, anchor drag, image drag, and label drag. setSelection is the
// single funnel for switching what is selected (annotation, image, or
// nothing) so the spec panel, tool defaults, and label editor stay in
// sync. handleDrawToolClick implements the click-twice-to-draw flow,
// including the extension-line detection that splits a near-collinear
// follow-up click into its own POM annotation.

function setSelection(kind, id) {
    state.selection = kind && id != null ? { kind, id } : { kind: null, id: null };
    if (kind === 'annotation') {
      const ann = getAnnotationById(id);
      if (ann) {
        state.drawStyle = ann.style || state.drawStyle;
        state.drawColor = normalizeColorKey(ann.color);
        state.arrowType = getArrowType(ann);
      }
    }
    updateUI();
    requestRender();
  }

  function clearSelection() {
    setSelection(null, null);
  }

  function getSelectedAnnotation() {
    return state.selection.kind === 'annotation'
      ? state.annotations.find(a => a.id === state.selection.id) || null
      : null;
  }

  function getSelectedImage() {
    return state.selection.kind === 'image'
      ? state.images.find(image => image.id === state.selection.id) || null
      : null;
  }

  function toggleSelectedImageLock() {
    const image = getSelectedImage();
    if (!image) {
      showToast('Select an image first.');
      return;
    }
    image.locked = !image.locked;
    pushHistoryIfChanged();
    updateUI();
    requestRender();
    showToast(image.locked
      ? 'Image locked. Lines and annotations are unaffected.'
      : 'Image unlocked.');
  }

  // If any image is unlocked, lock all; otherwise unlock all. Bound to the L
  // key for a single-tap lock/unlock of every photo on the board.
  function toggleAllImagesLock() {
    if (!state.images.length) {
      showToast('No images on the board.');
      return;
    }
    const anyUnlocked = state.images.some(img => !img.locked);
    state.images.forEach(img => { img.locked = anyUnlocked; });
    pushHistoryIfChanged();
    updateUI();
    requestRender();
    showToast(anyUnlocked
      ? `Locked all ${state.images.length} image${state.images.length === 1 ? '' : 's'}.`
      : `Unlocked all ${state.images.length} image${state.images.length === 1 ? '' : 's'}.`);
  }

  function onMouseDown(e) {
    const isPanButton = state.spacePan || e.button === 1 || e.button === 2;
    if (isPanButton) {
      startPanInteraction(e);
      return;
    }
    if (e.button !== 0) return;

    const screen = getMousePos(e);
    const world = screenToWorld(screen.x, screen.y);

    // Auto Mode: only drafts + anchors are interactive. Project annotations
    // are locked, and tool creation / erasing is disabled (see updateUI).
    if (state.appMode === 'auto') {
      // Anchors always win: a TD must be able to grab a wrong anchor even
      // if a draft line crosses through it.
      const anchorHit = hitTestAnchors(world);
      if (anchorHit) {
        state.autoMode.anchorSelectedId = anchorHit.id;
        // Clear any draft selection so the spec panel stops highlighting it.
        if (state.selection.kind === 'draft') {
          state.selection = { kind: null, id: null };
        }
        startAnchorDrag(anchorHit.id, world);
        updateUI();
        requestRender();
        return;
      }

      const selectedDraft = getSelectedDraft();
      const draftHandleHit = selectedDraft && !isReviewOnlyDraft(selectedDraft)
        ? hitTestSelectedHandles(world, selectedDraft) : null;
      if (draftHandleHit) {
        startHandleDrag(selectedDraft.id, draftHandleHit.part, world);
        return;
      }
      const draftHit = hitTestAutoDraftAnnotations(world);
      if (draftHit) {
        setSelection('draft', draftHit.id);
        if (draftHit.part === 'label') {
          startLabelDrag(draftHit.id, world);
        } else {
          startAnnotationDrag(draftHit.id, world);
        }
        return;
      }
      // Empty space — drop any current selection (draft or anchor).
      if (state.selection.kind === 'draft' || state.autoMode.anchorSelectedId != null) {
        state.autoMode.anchorSelectedId = null;
        if (state.selection.kind === 'draft') {
          state.selection = { kind: null, id: null };
        }
        updateUI();
        requestRender();
      }
      return;
    }

    if (state.tool === 'straight' || state.tool === 'curved') {
      handleDrawToolClick(world);
      return;
    }

    if (state.tool === 'eraser') {
      beginEraseStroke(world);
      return;
    }

    const selectedAnnotation = getSelectedAnnotation();
    const handleHit = selectedAnnotation ? hitTestSelectedHandles(world, selectedAnnotation) : null;
    if (handleHit) {
      startHandleDrag(selectedAnnotation.id, handleHit.part, world);
      return;
    }

    const selectedImage = getSelectedImage();
    const imageHandleHit = selectedImage && !selectedImage.locked
      ? hitTestSelectedImageHandles(world, selectedImage) : null;
    if (imageHandleHit) {
      startImageResize(selectedImage.id, imageHandleHit.corner);
      return;
    }

    const annotationHit = hitTestAnnotations(world);
    if (annotationHit) {
      setSelection('annotation', annotationHit.id);
      if (annotationHit.part === 'label') {
        startLabelDrag(annotationHit.id, world);
      } else {
        startAnnotationDrag(annotationHit.id, world);
      }
      return;
    }

    const imageHit = hitTestImages(world);
    if (imageHit) {
      setSelection('image', imageHit.id);
      const hitImage = getImageById(imageHit.id);
      if (hitImage && !hitImage.locked) {
        startImageDrag(imageHit.id, world);
      }
      return;
    }

    if (state.selection.kind != null) {
      clearSelection();
    }
  }

  function onMouseMove(e) {
    const screen = getMousePos(e);
    const world = screenToWorld(screen.x, screen.y);

    if (state.drawSession) {
      state.drawSession.current = world;
      requestRender();
    }

    if (state.eraseSession) {
      appendErasePoint(world);
    }

    const interaction = state.interaction;
    if (!interaction) return;

    if (interaction.type === 'pan') {
      const dx = screen.x - interaction.startScreen.x;
      const dy = screen.y - interaction.startScreen.y;
      state.panX = interaction.startPan.x + dx;
      state.panY = interaction.startPan.y + dy;
      updateUI();
      requestRender();
      return;
    }

    if (interaction.type === 'drag-annotation') {
      const ann = getAnnotationById(interaction.id);
      if (!ann) return;
      const dx = world.x - interaction.prevWorld.x;
      const dy = world.y - interaction.prevWorld.y;
      if (dx || dy) {
        moveAnnotation(ann, dx, dy);
        if (isAutoDraft(ann)) markDraftTouchedByTD(ann);
        interaction.changed = true;
        interaction.prevWorld = world;
        requestRender();
      }
      return;
    }

    if (interaction.type === 'drag-label') {
      const ann = getAnnotationById(interaction.id);
      if (!ann || !ann.label) return;
      const dx = world.x - interaction.prevWorld.x;
      const dy = world.y - interaction.prevWorld.y;
      if (dx || dy) {
        ann.label.x += dx;
        ann.label.y += dy;
        ann.labelManual = true;
        if (isAutoDraft(ann) && state.appMode === 'auto') markDraftTouchedByTD(ann);
        interaction.changed = true;
        interaction.prevWorld = world;
        requestRender();
      }
      return;
    }

    if (interaction.type === 'drag-handle') {
      const ann = getAnnotationById(interaction.id);
      if (!ann) return;
      dragHandle(ann, interaction.part, world, interaction.prevWorld);
      if (isAutoDraft(ann)) markDraftTouchedByTD(ann);
      interaction.changed = true;
      interaction.prevWorld = world;
      requestRender();
      return;
    }

    if (interaction.type === 'drag-image') {
      const image = getImageById(interaction.id);
      if (!image) return;
      const dx = world.x - interaction.prevWorld.x;
      const dy = world.y - interaction.prevWorld.y;
      if (dx || dy) {
        image.x += dx;
        image.y += dy;
        if (interaction.groupedAnnotationIds) {
          for (const annId of interaction.groupedAnnotationIds) {
            const ann = getAnnotationById(annId);
            if (ann) moveAnnotation(ann, dx, dy);
          }
        }
        interaction.changed = true;
        interaction.prevWorld = world;
        requestRender();
      }
      return;
    }

    if (interaction.type === 'drag-image-resize') {
      const image = getImageById(interaction.id);
      if (!image) return;
      resizeImageFromCorner(image, interaction.corner, interaction.anchor, interaction.aspect, world);
      interaction.changed = true;
      interaction.prevWorld = world;
      requestRender();
      return;
    }

    if (interaction.type === 'drag-anchor') {
      const anchor = getAnchorById(interaction.id);
      if (!anchor) return;
      const image = getImageById(anchor.sourceImageId);
      if (!image || !image.width || !image.height) return;
      // Convert world delta into the source image's normalized space; the
      // pin/cascade/draft-sync side effects live in moveAnchorBy, shared
      // with the keyboard nudge and snap-to-ink paths.
      const dx = (world.x - interaction.prevWorld.x) / image.width;
      const dy = (world.y - interaction.prevWorld.y) / image.height;
      if (dx || dy) {
        interaction.prevWorld = world;
        if (moveAnchorBy(anchor, dx, dy)) interaction.changed = true;
      }
    }
  }

  function onMouseUp(e) {
    if (state.eraseSession) {
      commitEraseStroke();
    }

    const interaction = state.interaction;
    if (!interaction) return;

    document.body.classList.remove('grabbing');

    if (interaction.type !== 'pan' && interaction.changed) {
      if (interaction.type === 'drag-anchor') {
        const anchor = getAnchorById(interaction.id);
        // U2: pull the released anchor onto the nearest sketch ink, unless
        // the TD holds ⌥ to place it freely. Snap BEFORE the residual
        // capture below so the learning loop sees the final position.
        if (anchor && !(e && e.altKey)) {
          const snapped = snapAnchorToInk(anchor);
          if (snapped && moveAnchorBy(anchor, snapped.x - anchor.x, snapped.y - anchor.y)) {
            maybeToastSnapHint();
          }
        }
        // Learning-loop capture: log the (origin → final) anchor residual
        // exactly once per drag commit. We do this here, not on every
        // mousemove, so micro-jitter and aborted drags never reach the
        // bucket. recordAnchorResidual self-filters sub-1px deltas.
        // Gated on interaction.changed, NOT on the snapshot fingerprint:
        // anchors are not part of history snapshots, so a pure anchor drag
        // never changes the fingerprint and the old gate silently dropped
        // every residual and anchor_dragged event.
        if (interaction.learnOrigin) {
          if (anchor && anchor.kind === interaction.learnOrigin.kind) {
            recordAnchorResidual(
              anchor.kind,
              anchor.x - interaction.learnOrigin.x,
              anchor.y - interaction.learnOrigin.y,
              anchor
            );
            recordAutoTelemetryEvent('anchor_dragged', {
              sourceImageId: anchor.sourceImageId,
              anchor_id: anchor.id,
              anchor_kind: anchor.kind,
            });
          }
        }
      }
      const before = interaction.beforeFingerprint;
      const after = snapshotFingerprint(makeSnapshot());
      if (before !== after) {
        const changedAnn = interaction.id != null ? getAnnotationById(interaction.id) : null;
        pushHistoryIfChanged();
        if (state.appMode === 'manual'
            && changedAnn
            && isAutoDraft(changedAnn)
            && (interaction.type === 'drag-annotation' || interaction.type === 'drag-handle')) {
          const evalResult = evaluateManualPomSample(changedAnn, { allowAuto: true });
          if (evalResult.status === 'recorded') {
            showToast('POM ' + evalResult.pom + ' learning sample saved from TD edit.');
            updateUI();
          } else if (evalResult.status === 'needsConfirmation') {
            openPomMeaningPopover(evalResult);
          }
        }
      }
    }

    state.interaction = null;
  }

function onWheel(e) {
  e.preventDefault();

  if (e.shiftKey) {
    state.panX -= normalizeWheelDelta(e) * 0.45;
    updateUI();
    requestRender();
    return;
  }

  const mouse = getMousePos(e);
  const sensitivity = e.altKey ? PRECISE_ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
  const factor = Math.exp(-normalizeWheelDelta(e) * sensitivity);
  zoomAtScreenPoint(state.zoom * factor, mouse.x, mouse.y);
}

  function onKeyDown(e) {
    const target = e.target;
    const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Meaning popover owns the keyboard while open. ESC closes it (when
    // no input is focused — the inline "Other…" input handles its own
    // ESC). Every other non-field key is swallowed so canvas shortcuts
    // (S/B/0/F/etc.) don't fire under the TD while they pick a meaning.
    if (pendingMeaningEval) {
      if (e.key === 'Escape' && !inField) {
        e.preventDefault();
        closePomMeaningPopover();
        return;
      }
      if (inField) return;       // popover's own input handles its keys
      return;                    // swallow everything else
    }

    // A modal (Help, Set Scale, PPTX picker) is open — let it own the keyboard.
    if (document.querySelector('.picker-overlay')) {
      return;
    }
    const isMeta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Undo / redo work everywhere, INCLUDING while a spec-panel field
    // (Size L / TOL / 中文 / description) is focused. Blur first so any
    // pending edit commits to history, then it is undone as a single step.
    if (isMeta && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (inField && typeof target.blur === 'function') target.blur();
      void undo();
      return;
    }
    if (isMeta && ((key === 'z' && e.shiftKey) || key === 'y')) {
      e.preventDefault();
      if (inField && typeof target.blur === 'function') target.blur();
      void redo();
      return;
    }

    // Everything below is a canvas-level shortcut — ignore while typing.
    if (inField) return;

    // U1: arrow keys nudge the selected Auto-Mode anchor by one source-image
    // pixel (Shift = 10) — the precise landing tool after a rough drag.
    // Handled before the letter shortcuts so a selected pin owns the arrows;
    // with no pin selected they fall through untouched.
    if (!isMeta && state.appMode === 'auto' && state.autoMode.anchorSelectedId != null
        && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const step = e.shiftKey ? 10 : 1;
      const dxPx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dyPx = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (nudgeSelectedAnchor(dxPx, dyPx)) {
        e.preventDefault();
        return;
      }
    }

    if (e.code === 'Space' && !state.spacePan) {
      state.spacePan = true;
      document.body.classList.add('space-pan');
      e.preventDefault();
    }

    // Cmd/Ctrl+Shift+C — copy the whole board as a PNG image. Checked
    // before the plain Cmd/Ctrl+C copy-line branch so the Shift chord never
    // falls through to it. Manual-only, matching the Copy Image button.
    if (isMeta && e.shiftKey && key === 'c' && state.appMode !== 'auto') {
      e.preventDefault();
      void copyBoardImageToClipboard();
      return;
    }

    // Copy/paste/reflect for the selected line. Cmd/Ctrl-V intercept also
    // suppresses the paste event for image data — acceptable since the
    // user just explicitly asked to paste a line.
    if (isMeta && key === 'c' && state.selection.kind === 'annotation' && state.appMode !== 'auto') {
      e.preventDefault();
      copySelectedAnnotation();
      return;
    }
    if (isMeta && key === 'v' && hasLineClipboard() && state.appMode !== 'auto') {
      e.preventDefault();
      pasteLineFromClipboard();
      return;
    }
    if (!isMeta && key === 'm' && state.selection.kind === 'annotation' && state.appMode !== 'auto') {
      e.preventDefault();
      reflectSelectedAnnotation();
      return;
    }

    if ((isMeta && key === '0') || (!isMeta && key === 'f')) {
      e.preventDefault();
      fitSelectionOrAll();
      return;
    }

    if (!isMeta && key === 's') {
      e.preventDefault();
      setTool('select');
      return;
    }

    // L locks/unlocks every photo at once — works in both modes since
    // locking is purely an image-state concern.
    if (!isMeta && key === 'l') {
      e.preventDefault();
      toggleAllImagesLock();
      return;
    }

    // Board-level clears — both work in Auto Mode (this is an auto-only
    // build) and are one history step, so Undo restores what they remove.
    //   R — reset the whole working board (photo + lines + drafts). Same as
    //       the Reset Board button; it keeps its own confirm dialog.
    //   D — delete every POM line (applied + drafts) but keep the photo, so
    //       the TD can re-Generate on the same sketch.
    if (!isMeta && key === 'r') {
      e.preventDefault();
      resetWorkingBoard();
      return;
    }
    if (!isMeta && key === 'd') {
      e.preventDefault();
      clearAllLinesKeepImage();
      return;
    }

    // In Auto Mode, manual creation/eraser shortcuts must not steal the
    // tool away from select. The project annotations are locked.
    if (state.appMode !== 'auto') {
      if (!isMeta && key === '0') {
        e.preventDefault();
        setTool('straight');
        return;
      }

      if (!isMeta && (key === 'b' || key === 'c')) {
        e.preventDefault();
        setTool('curved');
        return;
      }

      if (!isMeta && key === 'e' && state.images.length > 0) {
        e.preventDefault();
        setTool('eraser');
        return;
      }
    }

    if (!isMeta && key === 'n') {
      e.preventDefault();
      toggleLabels();
      return;
    }

    if (!isMeta && state.tool === 'eraser' && (key === '[' || key === ']')) {
      e.preventDefault();
      const factor = key === ']' ? 1.18 : 1 / 1.18;
      state.brushSize = Math.max(4, Math.min(200, Math.round(state.brushSize * factor)));
      showToast('Brush size: ' + state.brushSize + ' px');
      updateUI();
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection.kind != null) {
      // In Auto Mode, project annotations are locked; Delete on a draft also
      // does nothing (use Discard Drafts or Mark Review-Only instead).
      if (state.appMode === 'auto') return;
      e.preventDefault();
      deleteSelected();
      return;
    }

    if (e.key === 'Escape') {
      if (!el.stitchesMenu.hidden) {
        closeLineStyleMenu();
      } else if (state.drawSession) {
        state.drawSession = null;
        state.tool = 'select';
        showToast('Drawing canceled.');
        updateUI();
        requestRender();
      } else if (state.eraseSession) {
        state.eraseSession = null;
        showToast('Erase canceled.');
        updateUI();
        requestRender();
      } else if (state.tool === 'straight' || state.tool === 'curved' || state.tool === 'eraser') {
        setTool('select');
      } else if (state.selection.kind != null) {
        clearSelection();
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      state.spacePan = false;
      document.body.classList.remove('space-pan');
      document.body.classList.remove('grabbing');
    }
  }

  function startPanInteraction(e) {
    const startScreen = getMousePos(e);
    state.interaction = {
      type: 'pan',
      startScreen,
      startPan: { x: state.panX, y: state.panY },
      changed: false,
    };
    document.body.classList.add('grabbing');
  }

function beginTrackedInteraction(type, payload) {
  state.interaction = {
    type,
    changed: false,
    beforeFingerprint: snapshotFingerprint(makeSnapshot()),
    ...payload,
  };
}

function startAnnotationDrag(id, world) {
  beginTrackedInteraction('drag-annotation', { id, prevWorld: world });
}

function startLabelDrag(id, world) {
  beginTrackedInteraction('drag-label', { id, prevWorld: world });
}

function startHandleDrag(id, part, world) {
  beginTrackedInteraction('drag-handle', { id, part, prevWorld: world });
}

function startImageDrag(id, world) {
  const image = getImageById(id);
  const groupedAnnotationIds = image ? getAnnotationsOnImage(image).map(ann => ann.id) : [];
  beginTrackedInteraction('drag-image', { id, prevWorld: world, groupedAnnotationIds });
}

function startImageResize(id, corner) {
  const image = getImageById(id);
  if (!image) return;
  beginTrackedInteraction('drag-image-resize', {
    id,
    corner,
    anchor: getOppositeImageCorner(image, corner),
    aspect: image.width / Math.max(1, image.height),
  });
}

  // ---- Eraser ----
  // Strokes live in image-local pixel coordinates so they automatically follow
  // their parent image when it is moved or resized. Rendering clips to the
  // image rect so strokes never bleed onto the white canvas background.
  function beginEraseStroke(world) {
    const imageHit = hitTestImages(world);
    if (!imageHit) return;
    const image = getImageById(imageHit.id);
    if (!image || !image.img) return;
    const local = worldToImageLocal(image, world);
    // brushSize is user-facing world pixels; convert to image-local px so the
    // stroke visually keeps that width regardless of the image's natural
    // resolution, and also scales correctly if the image is resized later.
    const naturalW = image.img.naturalWidth || image.width;
    const localSize = state.brushSize * (naturalW / image.width);
    state.eraseSession = {
      imageId: image.id,
      size: localSize,
      points: [local],
    };
    updateUI();
    requestRender();
  }

  function appendErasePoint(world) {
    const session = state.eraseSession;
    if (!session) return;
    const image = getImageById(session.imageId);
    if (!image || !image.img) return;
    const local = worldToImageLocal(image, world);
    const last = session.points[session.points.length - 1];
    const dx = local.x - last.x;
    const dy = local.y - last.y;
    // 2px (image-local) threshold trims jitter without losing curve fidelity
    if (dx * dx + dy * dy < 4) return;
    session.points.push(local);
    requestRender();
  }

  function commitEraseStroke() {
    const session = state.eraseSession;
    state.eraseSession = null;
    if (!session || !session.points.length) {
      updateUI();
      requestRender();
      return;
    }
    state.eraseStrokes.push({
      id: state.idCounter++,
      imageId: session.imageId,
      size: session.size,
      points: session.points,
    });
    pushHistoryIfChanged();
    updateUI();
    requestRender();
  }

  function worldToImageLocal(image, world) {
    const naturalW = image.img.naturalWidth || image.width;
    const naturalH = image.img.naturalHeight || image.height;
    return {
      x: (world.x - image.x) * (naturalW / image.width),
      y: (world.y - image.y) * (naturalH / image.height),
    };
  }

  function handleDrawToolClick(world) {
    // Extension follow-up: a straight line was just committed and the tool is
    // offering an optional collinear dashed extension. A click within the axis
    // snap zone commits it as its own annotation (separate seq number); a click
    // off-axis falls through and starts a fresh straight line at this point.
    if (state.drawSession && state.drawSession.type === 'extension-followup') {
      const proj = projectionOnAxis(world, state.drawSession.prevEnd, state.drawSession.prevDir);
      if (proj.qualifies) {
        const tip = {
          x: state.drawSession.prevEnd.x + state.drawSession.prevDir.x * proj.distance,
          y: state.drawSession.prevEnd.y + state.drawSession.prevDir.y * proj.distance,
        };
        const ann = createStraightAnnotation(
          state.drawSession.prevEnd,
          tip,
          'dashed',
          state.drawSession.color,
          'single',
          state.drawSession.lineWidth,
        );
        state.annotations.push(ann);
        state.selection = { kind: 'annotation', id: ann.id };
        state.nextSequence += 1;
        state.drawSession = null;
        pushHistoryIfChanged();
        updateUI();
        requestRender();
        return;
      }
      // Off-axis click — drop follow-up and treat as start of a new line.
      state.drawSession = null;
    }

    if (!state.drawSession) {
      state.drawSession = {
        type: state.tool,
        style: state.drawStyle,
        color: state.drawColor,
        arrowType: state.arrowType,
        lineWidth: state.lineWidth,
        start: world,
        current: world,
      };
      updateUI();
      requestRender();
      return;
    }

    // Curved lines take THREE clicks: start, middle, end. The middle click
    // records the point the curve must pass through; the curve is committed on
    // the third click. (Straight lines stay two clicks.)
    if (state.drawSession.type === 'curved') {
      const sess = state.drawSession;
      if (sess.mid == null) {
        if (distance(sess.start, world) < (4 / state.zoom)) return;
        sess.mid = clonePoint(world);
        sess.current = clonePoint(world);
        updateUI();
        requestRender();
        return;
      }
      if (distance(sess.mid, world) < (4 / state.zoom)) return;
      const curveAnn = createCurvedAnnotation(sess.start, world, sess.style, sess.color, sess.arrowType, sess.lineWidth, sess.mid);
      state.annotations.push(curveAnn);
      state.selection = { kind: 'annotation', id: curveAnn.id };
      state.nextSequence += 1;
      state.drawSession = null;
      pushHistoryIfChanged();
      updateUI();
      requestRender();
      return;
    }

    const start = state.drawSession.start;
    const end = world;
    const drawSettings = state.drawSession;
    if (distance(start, end) < (4 / state.zoom)) {
      return;
    }

    if (state.tool === 'straight') {
      const ann = createStraightAnnotation(start, end, drawSettings.style, drawSettings.color, drawSettings.arrowType, drawSettings.lineWidth);
      state.annotations.push(ann);
      state.selection = { kind: 'annotation', id: ann.id };
      state.nextSequence += 1;

      // Stay armed for an optional collinear dashed extension. The next click
      // along the line's axis commits a separate annotation with its own seq;
      // a click off-axis (or Esc / tool change) drops this state and starts a
      // fresh line. Only armed for solid lines in measurement (POM) mode —
      // not when drawing stitch styles where dashed has a different meaning.
      if (!isStitchMode() && drawSettings.style === 'solid') {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.max(0.0001, Math.hypot(dx, dy));
        state.drawSession = {
          type: 'extension-followup',
          color: drawSettings.color,
          lineWidth: drawSettings.lineWidth,
          prevEnd: clonePoint(end),
          prevDir: { x: dx / len, y: dy / len },
          current: clonePoint(end),
        };
      } else {
        state.drawSession = null;
      }

      pushHistoryIfChanged();
      updateUI();
      requestRender();
      return;
    }
  }

  // Project `world` onto the axis defined by `origin` + `dir` (unit vector).
  // Returns the signed forward distance, the perpendicular distance, and a
  // boolean that's true iff the cursor is in the extension snap zone
  // (positive forward distance, perpendicular within tolerance).
  function projectionOnAxis(world, origin, dir) {
    const dx = world.x - origin.x;
    const dy = world.y - origin.y;
    const distance = dx * dir.x + dy * dir.y;
    const perpX = dx - distance * dir.x;
    const perpY = dy - distance * dir.y;
    const perp = Math.hypot(perpX, perpY);
    const minDist = 4 / state.zoom;
    const maxPerp = 30 / state.zoom;
    return { distance, perp, qualifies: distance > minDist && perp <= maxPerp };
  }


  function dragHandle(ann, part, world, prevWorld) {
    const dx = world.x - prevWorld.x;
    const dy = world.y - prevWorld.y;

    const moveBy = (p) => { if (p) { p.x += dx; p.y += dy; } };

    if (part === 'start') {
      ann.start = clonePoint(world);
      // An anchor carries its own handle(s) rigidly, like a pen tool, so the
      // curve near it keeps its shape while the anchor moves.
      moveBy(ann.control1);
    } else if (part === 'end') {
      ann.end = clonePoint(world);
      moveBy(ann.control2);
    } else if (part === 'midPoint' && ann.type === 'curved') {
      // The middle is a real anchor now: move it and BOTH its handles together
      // so the whole joint slides and the two segments follow.
      ann.midPoint = clonePoint(world);
      moveBy(ann.midHandleIn);
      moveBy(ann.midHandleOut);
    } else if (part === 'control1' && ann.type === 'curved' && ann.control1) {
      ann.control1 = clonePoint(world); // start handle — bends segment 1 only
    } else if (part === 'control2' && ann.type === 'curved' && ann.control2) {
      ann.control2 = clonePoint(world); // end handle — bends segment 2 only
    } else if (part === 'midHandleIn' && ann.type === 'curved' && ann.midHandleIn) {
      ann.midHandleIn = clonePoint(world); // middle handle toward the start
    } else if (part === 'midHandleOut' && ann.type === 'curved' && ann.midHandleOut) {
      ann.midHandleOut = clonePoint(world); // middle handle toward the end
    }

    if (!ann.labelManual) {
      ann.label = computeDefaultLabelPosition(ann);
    }
  }

  function moveAnnotation(ann, dx, dy) {
    ann.start.x += dx; ann.start.y += dy;
    ann.end.x += dx; ann.end.y += dy;
    for (const key of ['midPoint', 'midHandleIn', 'midHandleOut', 'control1', 'control2']) {
      if (ann[key]) { ann[key].x += dx; ann[key].y += dy; }
    }
    ann.label.x += dx; ann.label.y += dy;
  }
