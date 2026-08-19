(function () {
  'use strict';
  const E = window.MeasurementTestEngine;
  const fixture = window.CONSTRUCTION_COHORT_FIXTURE;
  const priors = window.MEASUREMENT_PRIOR_SNAPSHOT;
  const $ = id => document.getElementById(id);
  const els = {
    runtimeDot: $('runtimeDot'), runtimeStatus: $('runtimeStatus'), cohortCards: $('cohortCards'),
    demoSelect: $('demoSelect'), fileInput: $('fileInput'), constructionOverride: $('constructionOverride'),
    measurementMode: $('measurementMode'), explicitControls: $('explicitControls'), anchorSource: $('anchorSource'),
    frontCalibrationPom: $('frontCalibrationPom'), frontKnownLength: $('frontKnownLength'),
    backCalibrationPom: $('backCalibrationPom'), backKnownLength: $('backKnownLength'),
    analyzeBtn: $('analyzeBtn'), analysisStatus: $('analysisStatus'), proofSummary: $('proofSummary'),
    sourceCanvas: $('sourceCanvas'), edgeCanvas: $('edgeCanvas'), imageMeta: $('imageMeta'),
    viewResult: $('viewResult'), viewStatus: $('viewStatus'), viewList: $('viewList'),
    constructionResult: $('constructionResult'), constructionConfidence: $('constructionConfidence'), constructionReason: $('constructionReason'),
    signalList: $('signalList'), cohortResult: $('cohortResult'), cohortStatus: $('cohortStatus'), cohortCounts: $('cohortCounts'),
    scaleResult: $('scaleResult'), scaleStatus: $('scaleStatus'), scaleReason: $('scaleReason'),
    suggestionResult: $('suggestionResult'), suggestionStatus: $('suggestionStatus'), suggestionCounts: $('suggestionCounts'),
    resultBody: $('resultBody'), evidencePayload: $('evidencePayload'), copyEvidenceBtn: $('copyEvidenceBtn'),
    acceptHighConfidenceBtn: $('acceptHighConfidenceBtn'), markMissingNoDataBtn: $('markMissingNoDataBtn'),
    finalizeSizeLBtn: $('finalizeSizeLBtn'), unlockFinalBtn: $('unlockFinalBtn'), copyFinalBtn: $('copyFinalBtn'),
    finalizationSummary: $('finalizationSummary'), finalizationBody: $('finalizationBody'), finalPayload: $('finalPayload'),
    detectedViewChips: $('detectedViewChips'), constructionChips: $('constructionChips'),
    healthView: $('healthView'), healthConstruction: $('healthConstruction'), healthAnchors: $('healthAnchors'),
    healthScale: $('healthScale'), healthLibrary: $('healthLibrary'),
    frontScaleValue: $('frontScaleValue'), backScaleValue: $('backScaleValue'), scaleSource: $('scaleSource'), scaleWarning: $('scaleWarning'),
    measurementSummary: $('measurementSummary'),
    quickViewValue: $('quickViewValue'), confirmViewsBtn: $('confirmViewsBtn'),
    quickConstructionValue: $('quickConstructionValue'), confirmConstructionBtn: $('confirmConstructionBtn'),
    quickHookValue: $('quickHookValue'), hookWidthButtons: $('hookWidthButtons'), clearHookWidthBtn: $('clearHookWidthBtn'),
    quickConfirmationStatus: $('quickConfirmationStatus'),
    pilotAnalysisMs: $('pilotAnalysisMs'), pilotActions: $('pilotActions'), pilotOverrides: $('pilotOverrides'),
    pilotReviewRows: $('pilotReviewRows'), pilotLockMs: $('pilotLockMs')
  };
  let cvReady = false;
  let currentImage = null;
  let lastPayload = null;
  let anchorProvenance = null;
  // Learning loop (US-045): TD value overrides accumulate here and bias future
  // measured suggestions. In-memory + resettable; never touches rule JSON.
  let learningStore = [];
  let learnedCorrections = {};
  let lastRawMeasured = {};
  let viewOverrides = {};
  let analysisRun = 0;
  let analysisInFlight = false;
  let finalizationRows = [];
  let lockedFinalPayload = null;
  let tdEvidence = { viewsConfirmed:false, constructionConfirmed:null, backHookWidth:null };
  let pilot = createPilotState();

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function pill(el, value) { el.textContent = value || '—'; el.className = 'pill ' + String(value || '').toLowerCase(); }
  function dlHtml(rows) { return rows.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join(''); }
  function createPilotState() {
    return { startedAt:performance.now(), lastAnalysisMs:null, actions:0, overridePoms:new Set(), lockMs:null };
  }
  function resetFastLaneEvidence() {
    tdEvidence = { viewsConfirmed:false, constructionConfirmed:null, backHookWidth:null };
    pilot = createPilotState();
    if (els.constructionOverride) els.constructionOverride.value='auto';
    if (els.measurementMode) els.measurementMode.value='auto';
    if (els.explicitControls) els.explicitControls.style.display='none';
    if (els.quickViewValue) els.quickViewValue.textContent='Waiting for analysis';
    if (els.quickConstructionValue) els.quickConstructionValue.textContent='Waiting for analysis';
    if (els.quickHookValue) els.quickHookValue.textContent='Not confirmed';
    if (els.quickConfirmationStatus) els.quickConfirmationStatus.textContent='Confirmations apply only to this sketch.';
    if (els.pilotReviewRows) els.pilotReviewRows.textContent='—';
    renderPilotMetrics();
  }
  function recordTdAction(kind, pom) {
    if (kind === 'override' && pom) {
      if (pilot.overridePoms.has(String(pom))) return;
      pilot.overridePoms.add(String(pom));
    }
    pilot.actions += 1;
    renderPilotMetrics();
  }
  function renderPilotMetrics(reviewRows) {
    if (!els.pilotActions) return;
    els.pilotAnalysisMs.textContent=Number.isFinite(pilot.lastAnalysisMs)?`${Math.round(pilot.lastAnalysisMs)} ms`:'—';
    els.pilotActions.textContent=String(pilot.actions);
    els.pilotOverrides.textContent=String(pilot.overridePoms.size);
    if (Number.isFinite(reviewRows)) els.pilotReviewRows.textContent=String(reviewRows);
    els.pilotLockMs.textContent=Number.isFinite(pilot.lockMs)?`${Math.round(pilot.lockMs/1000)} s`:'—';
  }
  function pilotSnapshot() {
    return {
      analysis_ms:Number.isFinite(pilot.lastAnalysisMs)?Math.round(pilot.lastAnalysisMs):null,
      td_actions:pilot.actions,
      override_poms:Array.from(pilot.overridePoms),
      review_rows:finalizationRows.filter(row=>row.status!=='RESOLVED'&&row.workbenchStatus==='REVIEW').length,
      time_to_lock_ms:Number.isFinite(pilot.lockMs)?Math.round(pilot.lockMs):null
    };
  }
  function renderQuickConfirmations(payload) {
    const views=payload&&payload.views||[];
    const roles=views.map(view=>view.role).filter((role,index,list)=>list.indexOf(role)===index);
    const viewsReady=views.length>0&&!roles.includes('unknown');
    els.quickViewValue.textContent=views.length?roles.map(role=>role.replaceAll('_',' ')).join(' + '):'No views detected';
    els.confirmViewsBtn.textContent=tdEvidence.viewsConfirmed?'Views confirmed':'Confirm views';
    els.confirmViewsBtn.classList.toggle('active',tdEvidence.viewsConfirmed);
    els.confirmViewsBtn.disabled=Boolean(lockedFinalPayload)||!viewsReady||tdEvidence.viewsConfirmed;
    const construction=payload&&payload.effectiveConstruction||'unknown';
    els.quickConstructionValue.textContent=construction.replaceAll('_',' ');
    els.confirmConstructionBtn.textContent=tdEvidence.constructionConfirmed?'Construction confirmed':'Confirm construction';
    els.confirmConstructionBtn.classList.toggle('active',Boolean(tdEvidence.constructionConfirmed));
    els.confirmConstructionBtn.disabled=Boolean(lockedFinalPayload)||construction==='unknown'||Boolean(tdEvidence.constructionConfirmed);
    const rowReference=payload&&payload.hookEyeReference;
    els.quickHookValue.textContent=tdEvidence.backHookWidth
      ? `${tdEvidence.backHookWidth} in · TD confirmed`
      : (rowReference&&rowReference.status==='SUPPORTED'
        ? `${rowReference.row_count} rows detected → POM 12 ${rowReference.value_in.toFixed(2)} in`
        : (payload&&payload.signals&&payload.signals.backHookEyeRowCount?`${payload.signals.backHookEyeRowCount} rows detected · no direct mapping`:'Not confirmed'));
    els.hookWidthButtons.querySelectorAll('[data-hook-width]').forEach(button=>{
      const active=Number(button.dataset.hookWidth)===tdEvidence.backHookWidth;
      button.classList.toggle('active',active);
      button.disabled=Boolean(lockedFinalPayload);
    });
    els.clearHookWidthBtn.disabled=Boolean(lockedFinalPayload)||tdEvidence.backHookWidth==null;
    const confirmed=[];
    if(tdEvidence.viewsConfirmed)confirmed.push('views');
    if(tdEvidence.constructionConfirmed)confirmed.push('construction');
    if(tdEvidence.backHookWidth)confirmed.push(`back H&E ${tdEvidence.backHookWidth} in`);
    els.quickConfirmationStatus.textContent=confirmed.length?`Confirmed for this sketch: ${confirmed.join(', ')}.`:'Confirmations apply only to this sketch.';
  }

  function renderCohorts() {
    const summaries = E.cohortSummary(fixture);
    els.cohortCards.innerHTML = fixture.cohorts.map(cohort => {
      const summary = summaries.find(row => row.id === cohort.id);
      return `<article class="cohort-card"><h3>${esc(cohort.label)}</h3><code>${esc(cohort.id)}</code><div class="counts"><div class="count"><b>${summary.catalog_style_count}</b><span>catalog</span></div><div class="count"><b>${summary.synthetic_measurement_peer_count}</b><span>synthetic</span></div><div class="count"><b>${summary.approved_production_peer_count}</b><span>approved</span></div></div><span class="pill ${summary.eligible ? 'eligible' : 'insufficient_peers'}">${summary.eligible ? 'test eligible' : 'insufficient peers'}</span><ul class="style-list">${cohort.styles.map(style => `<li>${esc(style.name)} · ${esc(style.construction_confidence)}</li>`).join('')}</ul></article>`;
    }).join('');
  }

  // NEVER `await window.cv`. The vendored Emscripten build's Module.then
  // resolves with the Module itself, so awaiting it re-enters the thenable
  // resolution forever — an infinite microtask loop that hard-freezes the tab
  // ("Page Unresponsive"). Poll cv.Mat instead, exactly like the production
  // opencv_real_api.js does.
  function watchCv(onReady) {
    const started = Date.now();
    const poll = setInterval(() => {
      const candidate = window.cv;
      if (candidate && candidate.Mat && typeof candidate.imread === 'function') {
        clearInterval(poll);
        cvReady = true; els.runtimeDot.classList.add('ready'); els.runtimeStatus.textContent = 'Local OpenCV ready';
        if (onReady) onReady();
        return;
      }
      const waited = Date.now() - started;
      if (waited > 150000) {
        clearInterval(poll);
        els.runtimeDot.classList.add('error'); els.runtimeStatus.textContent = 'OpenCV unavailable · pixel fallback active';
      } else if (waited > 12000) {
        els.runtimeStatus.textContent = 'OpenCV still compiling · pixel fallback active';
      }
    }, 120);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not load image')); image.src = url;
    });
  }
  async function loadSelectedDemo() {
    els.analysisStatus.textContent = 'Loading sketch…';
    viewOverrides = {};
    resetFastLaneEvidence();
    currentImage = await loadImage(els.demoSelect.value);
    drawImage(currentImage); els.analysisStatus.textContent = 'Sketch ready.';
  }
  function drawImage(image) {
    const maxW = 900, maxH = 620;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1);
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    els.sourceCanvas.width = w; els.sourceCanvas.height = h;
    els.edgeCanvas.width = w; els.edgeCanvas.height = h;
    const ctx = els.sourceCanvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(image, 0, 0, w, h);
    els.edgeCanvas.getContext('2d').clearRect(0, 0, w, h);
    els.imageMeta.textContent = `${image.naturalWidth}×${image.naturalHeight} → ${w}×${h}`;
  }

  function pixelBboxAndFallbackSignals() {
    const canvas = els.sourceCanvas, ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const edgeCtx = els.edgeCanvas.getContext('2d');
    const edgeImage = edgeCtx.createImageData(canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, ink = 0, centerInk = 0, edgeInk = 0;
    const columnInk = new Uint32Array(canvas.width);
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 4; const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const out = gray < 205 ? 20 : 255;
      edgeImage.data[i] = out; edgeImage.data[i + 1] = out; edgeImage.data[i + 2] = out; edgeImage.data[i + 3] = 255;
      if (gray < 205) {
        ink += 1; columnInk[x] += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        const nx = x / canvas.width;
        if (nx > .43 && nx < .57) centerInk += 1;
        if (nx < .18 || nx > .82) edgeInk += 1;
      }
    }
    edgeCtx.putImageData(edgeImage, 0, 0);
    const bbox = ink ? { x:minX, y:minY, width:Math.max(1,maxX-minX), height:Math.max(1,maxY-minY) } : { x:0, y:0, width:canvas.width, height:canvas.height };
    const viewRegions = E.deriveViewRegionsFromColumns(columnInk, canvas.width, canvas.height).map(region => {
      let top = canvas.height, bottom = 0, regionInk = 0;
      const x0 = Math.max(0, Math.floor(region.bbox.x));
      const x1 = Math.min(canvas.width, Math.ceil(region.bbox.x + region.bbox.width));
      for (let y = 0; y < canvas.height; y += 1) for (let x = x0; x < x1; x += 1) {
        const i = (y * canvas.width + x) * 4;
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 205) { top = Math.min(top,y); bottom = Math.max(bottom,y); regionInk += 1; }
      }
      const pad = Math.max(3,Math.round(canvas.height*.015));
      const refined = Object.assign({},region,{ bbox:{ x:x0, y:Math.max(0,top-pad), width:Math.max(1,x1-x0), height:Math.max(1,Math.min(canvas.height-1,bottom+pad)-Math.max(0,top-pad)) }, inkPixels:regionInk });
      const override = viewOverrides[region.id];
      return override ? Object.assign(refined,{ role:override, roleSource:'td_test_override' }) : refined;
    });
    const regionStats = region => {
      if (!region) return { dark:0,detail:0,centerDark:0,edgeDark:0,arcDark:0,area:1,lightPatternTileCoverage:0 };
      const box=region.bbox,x0=Math.max(0,Math.floor(box.x)),x1=Math.min(canvas.width,Math.ceil(box.x+box.width));
      const y0=Math.max(0,Math.floor(box.y)),y1=Math.min(canvas.height,Math.ceil(box.y+box.height));
      const tileColumns=8,tileRows=5,tileCount=tileColumns*tileRows;
      const tileLight=Array(tileCount).fill(0),tileArea=Array(tileCount).fill(0);
      const stats={dark:0,detail:0,centerDark:0,edgeDark:0,arcDark:0,area:Math.max(1,(x1-x0)*(y1-y0)),lightPatternTileCoverage:0};
      for(let y=y0;y<y1;y+=1)for(let x=x0;x<x1;x+=1){
        const i=(y*canvas.width+x)*4,gray=(data[i]+data[i+1]+data[i+2])/3,nx=(x-box.x)/box.width,ny=(y-box.y)/box.height;
        if(gray<242)stats.detail+=1;
        if(gray<205){stats.dark+=1;if(nx>.43&&nx<.57)stats.centerDark+=1;if(nx<.18||nx>.82)stats.edgeDark+=1;if(nx>.15&&nx<.85&&ny>.48&&ny<.78)stats.arcDark+=1;}
        if(nx>.08&&nx<.92&&ny>.28&&ny<.86){
          const tx=Math.min(tileColumns-1,Math.floor((nx-.08)/.84*tileColumns));
          const ty=Math.min(tileRows-1,Math.floor((ny-.28)/.58*tileRows));
          const tile=ty*tileColumns+tx;tileArea[tile]+=1;
          if(gray>=205&&gray<242)tileLight[tile]+=1;
        }
      }
      stats.lightPatternTileCoverage=tileLight.filter((count,index)=>count/Math.max(1,tileArea[index])>=.03).length/tileCount;
      return stats;
    };
    const frontRegion = viewRegions.find(region=>region.role==='front_outer');
    const backRegion = viewRegions.find(region=>region.role==='back');
    const front=regionStats(frontRegion),back=regionStats(backRegion);
    const lightTexture=Math.max(0,front.detail-front.dark);
    const lightTextureDensity=lightTexture/Math.max(1,front.area);
    const frontLacePatternScore=lightTextureDensity>=.035&&front.lightPatternTileCoverage>=.30
      ? E.clamp(.55+(lightTextureDensity-.035)*5+(front.lightPatternTileCoverage-.30)*.6,0,1)
      : 0;
    return {
      bbox,viewRegions,signalCoordinateSpace:frontRegion?'front_outer_view':'full_page_fallback',
      inkRatio:ink/(canvas.width*canvas.height),
      centerRail:E.clamp((frontRegion?front.centerDark:centerInk)/Math.max(1,frontRegion?front.dark:ink)*4,0,1),
      edgeRepeats:E.clamp((frontRegion?front.edgeDark:edgeInk)/Math.max(1,frontRegion?front.dark:ink)*3,0,1),
      centerRepeats:0,parallelRails:0,
      backCenterRail:E.clamp(back.centerDark/Math.max(1,back.dark)*5,0,1),
      backParallelRails:0,backCenterRepeats:0,backHookEyeRowCount:0,
      frontTextureScore:E.clamp(lightTextureDensity*20,0,1),frontLacePatternScore,
      frontLacePatternTileCoverage:front.lightPatternTileCoverage,
      frontCoverageScore:frontRegion?E.clamp(.48+(frontRegion.bbox.height/canvas.height)*.48,0,1):0,
      underwireScore:E.clamp(front.arcDark/Math.max(1,front.dark)*2.2,0,1)
    };
  }

  function openCvSignals(base) {
    if (!cvReady) return base;
    const src = cv.imread(els.sourceCanvas), gray = new cv.Mat(), edges = new cv.Mat(), binary = new cv.Mat(), lines = new cv.Mat();
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
      cv.Canny(gray, edges, 45, 135);
      cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 22, Math.max(18, src.rows * .07), 9);
      const frontRegion = (base.viewRegions||[]).find(region=>region.role==='front_outer');
      const backRegion = (base.viewRegions||[]).find(region=>region.role==='back');
      const frontBox = frontRegion && frontRegion.bbox;
      const backBox = backRegion && backRegion.bbox;
      const contours = new cv.MatVector(), hierarchy = new cv.Mat(); cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      const rects=[];
      for(let i=0;i<contours.size();i+=1){const contour=contours.get(i);rects.push(cv.boundingRect(contour));contour.delete();}
      const metricsFor = box => {
        if(!box)return {rail:0,pairs:0,centerSmall:0,edgeSmall:0,rowCount:0,rowCandidates:[]};
        let centerVertical=0;const centerXs=[];
        for(let i=0;i<lines.rows;i+=1){
          const p=lines.data32S.subarray(i*4,i*4+4),dx=p[2]-p[0],dy=p[3]-p[1],length=Math.hypot(dx,dy),midX=(p[0]+p[2])/2,midY=(p[1]+p[3])/2;
          if(midX<box.x||midX>box.x+box.width||midY<box.y||midY>box.y+box.height)continue;
          const nx=(midX-box.x)/box.width;
          if(Math.abs(dy)>Math.abs(dx)*2.4&&nx>.40&&nx<.60){centerVertical+=length;centerXs.push(nx);}
        }
        centerXs.sort((a,b)=>a-b);let pairs=0;
        for(let i=0;i<centerXs.length;i+=1)for(let j=i+1;j<centerXs.length;j+=1){const d=centerXs[j]-centerXs[i];if(d>.012&&d<.09)pairs+=1;}
        let centerSmall=0,edgeSmall=0;const rowPoints=[];
        for(const rect of rects){
          const area=rect.width*rect.height,midX=rect.x+rect.width/2,midY=rect.y+rect.height/2;
          if(midX<box.x||midX>box.x+box.width||midY<box.y||midY>box.y+box.height)continue;
          const nx=(midX-box.x)/box.width;
          const ny=(midY-box.y)/box.height;
          if(area>=1&&nx>.38&&nx<.62&&ny>.55&&rect.width<=Math.max(8,box.width*.018)&&rect.height<=Math.max(8,box.height*.025))rowPoints.push({x:nx,y:ny});
          if(area>=4&&area<=src.cols*src.rows*.0018&&rect.width<rect.height*2.8&&rect.height<rect.width*2.8){
            if(nx>.4&&nx<.6)centerSmall+=1;
            if(nx<.22||nx>.78)edgeSmall+=1;
          }
        }
        const edgeGroups=[];
        const edgeX0=Math.max(0,Math.floor(box.x+box.width*.46)),edgeX1=Math.min(edges.cols,Math.ceil(box.x+box.width*.54));
        const edgeY0=Math.max(0,Math.floor(box.y+box.height*.74)),edgeY1=Math.min(edges.rows,Math.ceil(box.y+box.height*.98));
        const minimumEdgeCount=Math.max(4,Math.round((edgeX1-edgeX0)*.2));
        for(let y=edgeY0;y<edgeY1;y+=1){
          let count=0;for(let x=edgeX0;x<edgeX1;x+=1)if(edges.data[y*edges.cols+x]>0)count+=1;
          if(count>=minimumEdgeCount&&count<(edgeX1-edgeX0)*.8){
            let group=edgeGroups[edgeGroups.length-1];
            if(!group||y-group[group.length-1].y>2){group=[];edgeGroups.push(group);}
            group.push({y,count});
          }
        }
        const edgeRowPoints=edgeGroups.filter(group=>group.length>=3).map(group=>({
          x:.5,
          y:(group.reduce((sum,row)=>sum+row.y*row.count,0)/group.reduce((sum,row)=>sum+row.count,0)-box.y)/box.height
        }));
        const edgeRowCount=E.detectRegularRowCount(edgeRowPoints),contourRowCount=E.detectRegularRowCount(rowPoints);
        return {rail:E.clamp(centerVertical/(box.height*3),0,1),pairs:E.clamp(pairs/5,0,1),centerSmall,edgeSmall,rowCount:edgeRowCount||contourRowCount,rowCandidates:edgeRowCount?edgeRowPoints:rowPoints,rowEvidenceSource:edgeRowCount?'canny_horizontal_row_sequence':(contourRowCount?'compact_contour_sequence':'none')};
      };
      const frontMetrics=metricsFor(frontBox),backMetrics=metricsFor(backBox);
      contours.delete(); hierarchy.delete(); cv.imshow(els.edgeCanvas, edges);
      return Object.assign({}, base, {
        centerRail:frontMetrics.rail,parallelRails:frontMetrics.pairs,
        centerRepeats:E.clamp(frontMetrics.centerSmall/12,0,1),edgeRepeats:E.clamp(frontMetrics.edgeSmall/14,0,1),
        backCenterRail:Math.max(base.backCenterRail||0,backMetrics.rail),backParallelRails:backMetrics.pairs,
        backCenterRepeats:E.clamp(backMetrics.centerSmall/8,0,1),backHookEyeRowCount:backMetrics.rowCount,backHookEyeRowCandidates:backMetrics.rowCandidates,backHookEyeRowEvidenceSource:backMetrics.rowEvidenceSource,
        houghLineCount:lines.rows,smallCenterComponents:frontMetrics.centerSmall,smallEdgeComponents:frontMetrics.edgeSmall,
        smallBackCenterComponents:backMetrics.centerSmall
      });
    } finally { src.delete(); gray.delete(); edges.delete(); binary.delete(); lines.delete(); }
  }

  function drawAnchorHypotheses(paths, viewRegions) {
    drawImage(currentImage); const ctx = els.sourceCanvas.getContext('2d');
    ctx.save(); ctx.lineWidth = Math.max(1.5, els.sourceCanvas.width / 520); ctx.font = `${Math.max(9, els.sourceCanvas.width / 92)}px system-ui`;
    ctx.setLineDash([7,5]);
    for (const region of viewRegions || []) {
      const box = region.bbox; ctx.strokeStyle = '#275b84'; ctx.fillStyle = '#275b84';
      ctx.strokeRect(box.x,box.y,box.width,box.height); ctx.fillText(`${region.id}: ${region.role}`,box.x+5,Math.max(14,box.y+15));
    }
    ctx.setLineDash([]);
    for (const path of paths) {
      if (!path.start || !path.end) continue;
      const color = path.confidence === 'low' ? '#b66a15' : '#0d6b4f';
      const radius=Math.max(3.2,els.sourceCanvas.width/260);
      [path.start,path.end].forEach((point,index)=>{
        ctx.strokeStyle=color;ctx.fillStyle='#fff';ctx.lineWidth=Math.max(1.5,els.sourceCanvas.width/520);
        ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle=color;ctx.fillText(`${path.pom}${index?'B':'A'}`,point.x+radius+2,point.y-radius-1);
      });
    }
    ctx.restore();
  }

  function pointText(point) { return point ? `(${E.round(point.x,1)}, ${E.round(point.y,1)})` : 'missing'; }
  function traceFor(path, result, scale, cohortGate) {
    const formula = result.formula;
    const peers=result.cohort&&Array.isArray(result.cohort.peers)?result.cohort.peers:[];
    const peerDetail=peers.length
      ? peers.map(peer=>`${peer.name}: ${peer.value_in} in (${peer.data_kind})`).join('; ')
      : 'No compatible peer values';
    const steps = [
      { stage:'view', status:path.viewId ? 'observed' : 'missing', detail:`${path.viewRole} · ${path.viewId || 'no detected view'}${path.viewBox ? ` · box ${JSON.stringify(path.viewBox)}` : ''}` },
      { stage:'anchors', status:path.anchorStatus, detail:`${(path.anchors || [])[0]||'anchor A'} ${pointText(path.start)}; ${(path.anchors || [])[1]||'anchor B'} ${pointText(path.end)}` },
      { stage:'pixels', status:path.pixelLength > 0 ? 'observed' : 'missing', detail:path.pixelLength > 0 ? `${path.pixelLength} px between anchor hypotheses` : 'No measurable anchor pair' },
      { stage:'scale', status:result.decision==='LIBRARY_PRIOR'?'not_used':(scale && scale.status || 'missing'), detail:result.decision==='LIBRARY_PRIOR'?'Numeric value is not claimed as sketch-derived.':(scale && scale.reason || `No ${path.viewRole} scale`) },
      { stage:'construction', status:cohortGate.status, detail:`compatible peer gate: ${cohortGate.status}; ${peerDetail}` },
      { stage:'calculation', status:formula ? 'calculated' : (result.decision==='LIBRARY_PRIOR'?'library_prior':'not_calculated'), detail:formula ? `${formula.pixel_length} px × ${formula.scale_in_per_px} in/px = ${formula.value_in} in` : (result.decision==='LIBRARY_PRIOR'?`compatible cohort median = ${result.value_in} in`:(result.reason || result.decision)) },
      { stage:'decision', status:result.decision, detail:`${result.result_kind || result.decision} · confidence ${result.confidence}` }
    ];
    if(result.construction_reference)steps.splice(1,0,{
      stage:'construction reference',status:result.construction_reference.status,
      detail:`${result.construction_reference.row_count} detected back H&E rows → POM 12 ${result.construction_reference.value_in} in; ${result.construction_reference.matched_peer_count} matching synthetic peers`
    });
    if(result.fusion)steps.splice(steps.length-1,0,{
      stage:'library fusion',status:result.fusion.diagnosis,
      detail:`sketch ${result.fusion.sketch_value_in} in vs prior ${result.fusion.prior_in} in · styleOffset ${(result.fusion.styleOffset*100).toFixed(1)}% · k ${result.fusion.k} → fused ${result.fusion.fused} in (residual ${(result.fusion.residual*100).toFixed(1)}%)`
    });
    return steps;
  }

  function traceHtml(trace) {
    return `<details class="trace"><summary>${trace.some(step=>step.stage==='calculation'&&step.status==='calculated')?'Inspect calculation':'Inspect missing evidence'}</summary><ol>${trace.map(step=>`<li><strong>${esc(step.stage)}</strong>: <code>${esc(step.detail)}</code></li>`).join('')}</ol></details>`;
  }

  function renderViews(views) {
    els.viewResult.textContent = `${views.length} regions`;
    pill(els.viewStatus,views.some(view=>view.role==='unknown')?'REVIEW_REQUIRED':'VALID');
    const detectedRoles=new Set(views.map(view=>view.role));
    const viewLabels=[['front_outer','Front outer'],['front_inner','Front inner'],['back','Back']];
    els.detectedViewChips.innerHTML=viewLabels.map(([role,label])=>`<span class="chip ${detectedRoles.has(role)?'detected':'not_detected'}">${esc(label)}</span>`).join('');
    els.viewList.innerHTML = views.map(view => `<div class="view-item"><strong>${esc(view.id)}</strong><select data-view-id="${esc(view.id)}" aria-label="Role for ${esc(view.id)}"><option value="front_outer" ${view.role==='front_outer'?'selected':''}>front outer</option><option value="front_inner" ${view.role==='front_inner'?'selected':''}>front inner</option><option value="back" ${view.role==='back'?'selected':''}>back</option><option value="unknown" ${view.role==='unknown'?'selected':''}>unknown</option></select><small>${esc(view.roleSource)} · ${esc(view.confidence)} · ${esc(JSON.stringify(view.bbox))}</small></div>`).join('');
    els.viewList.querySelectorAll('select[data-view-id]').forEach(select => select.addEventListener('change', async () => {
      viewOverrides[select.dataset.viewId]=select.value;
      tdEvidence.viewsConfirmed=false;
      recordTdAction('view_role');
      await analyze();
    }));
  }

  function renderEvidenceHealth(health) {
    const rows=[
      [els.healthView,health.viewDetection],
      [els.healthConstruction,health.construction],
      [els.healthAnchors,health.anchors],
      [els.healthScale,health.absoluteScale],
      [els.healthLibrary,health.librarySupport]
    ];
    for(const [valueEl,value] of rows){
      valueEl.textContent=`${value}%`;
      const bar=valueEl.closest('.health-row').querySelector('i b');
      bar.style.width=`${E.clamp(value,0,100)}%`;
    }
  }

  function renderScaleHypothesis(scales) {
    const pxPerIn=row=>row&&row.status==='VALID'&&row.scale>0?`${E.round(1/row.scale,1)} px/in`:'—';
    els.frontScaleValue.textContent=pxPerIn(scales.front_outer);
    els.backScaleValue.textContent=pxPerIn(scales.back);
    const sources=[scales.front_outer,scales.back].filter(Boolean).map(row=>row.source).filter((value,index,list)=>value&&value!=='none'&&list.indexOf(value)===index);
    const sourceLabels={td_explicit_calibration:'TD calibration',library_multi_anchor_inference:'Library fit',library_hook_eye_hypothesis:'Library fit + H&E',opencv_hook_eye_rows_reference:'OpenCV H&E row reference'};
    els.scaleSource.textContent=sources.length?sources.map(source=>sourceLabels[source]||source).join(' + '):'No scale evidence';
    const allExplicit=['front_outer','back'].every(role=>scales[role]&&scales[role].status==='VALID'&&scales[role].source==='td_explicit_calibration');
    els.scaleWarning.className=`scale-warning ${allExplicit?'calibrated':''}`;
    els.scaleWarning.textContent=allExplicit
      ? 'Front and back use separate TD calibrations. Auto still requires every other evidence gate.'
      : 'Scale is an inference, not a fact. POMs with weak scale evidence must remain Review or Insufficient.';
  }

  function setAnalysisControlsLocked(locked) {
    [els.demoSelect,els.fileInput,els.constructionOverride,els.measurementMode,els.frontCalibrationPom,els.frontKnownLength,els.backCalibrationPom,els.backKnownLength,els.analyzeBtn].forEach(control=>{ if(control)control.disabled=locked; });
    els.viewList.querySelectorAll('select[data-view-id]').forEach(control=>{control.disabled=locked;});
    if(lastPayload)renderQuickConfirmations(lastPayload);
  }

  function renderFinalization() {
    const summary=E.finalizationSummary(finalizationRows,16); const locked=!!lockedFinalPayload;
    const reviewNeeded=finalizationRows.filter(row=>row.status!=='RESOLVED'&&row.workbenchStatus==='REVIEW').length;
    const noEvidenceNeeded=finalizationRows.filter(row=>row.status!=='RESOLVED'&&row.workbenchStatus==='INSUFFICIENT').length;
    const accepted=summary.resolved;
    renderPilotMetrics(reviewNeeded);
    els.measurementSummary.textContent=`${accepted} accepted · ${reviewNeeded} review · ${noEvidenceNeeded} no evidence`;
    els.finalizationSummary.className=`final-summary ${locked?'locked':(summary.canLock?'ready':'blocked')}`;
    els.finalizationSummary.textContent=locked
      ? `LOCKED · ${summary.numeric} numeric Size L values · ${summary.noData} No Data · ${summary.notApplicable} Not Applicable · evidence run ${lockedFinalPayload.analysis_run}`
      : `${summary.resolved}/16 resolved · ${reviewNeeded} need review · ${noEvidenceNeeded} need a TD value or No evidence`;
    els.finalizationBody.innerHTML=finalizationRows.map(row=>{
      const directConfirmed=row.status==='RESOLVED'&&!row.autoAccepted;
      const noEvidence=row.status==='RESOLVED'&&row.tdAction==='no_data';
      const visibleStatus=noEvidence?'NO EVIDENCE':(directConfirmed?'TD CONFIRMED':row.workbenchStatus);
      const statusClass=noEvidence?'INSUFFICIENT':(directConfirmed?'TD_CONFIRMED':row.workbenchStatus);
      const shownValue=row.tdAction==='td_override'?row.inputText:(Number.isFinite(row.displaySuggestionValueIn)?E.round(row.displaySuggestionValueIn,3):'');
      const action=!locked&&row.status!=='RESOLVED'
        ? (row.workbenchStatus==='REVIEW'?`<button class="row-action" data-accept-pom="${esc(row.pom)}" type="button">Accept</button>`:`<button class="row-action no-data" data-no-data-pom="${esc(row.pom)}" type="button">No evidence</button>`)
        : '';
      const layerProof=`<details><summary>5-layer proof</summary><div class="layer-proof">${(row.layerProof||[]).map((layer,index)=>`<div class="layer-row"><span class="layer-number">${index+1}</span><span class="layer-name">${esc(layer.label)}</span><span class="layer-state ${esc(layer.status)}">${esc(layer.status)}</span><span class="layer-detail">${esc(layer.detail)}</span></div>`).join('')}</div></details>`;
      const trace=`<details><summary>Raw evidence</summary><ol>${(row.evidenceTrace||[]).map(step=>`<li><strong>${esc(step.stage)}</strong>: ${esc(step.detail)}</li>`).join('')}</ol></details>`;
      const hasMeasurementConfidence=Number.isFinite(row.confidenceScore)&&Number.isFinite(row.displaySuggestionValueIn);
      const confidence=hasMeasurementConfidence?`${row.confidenceScore}%`:'—';
      return `<tr class="measurement-row ${esc(row.workbenchStatus)}" data-final-pom="${esc(row.pom)}"><td>${esc(row.pom)}</td><td class="pom-cell"><strong>${esc(row.name)}</strong><small>${esc((row.viewRole||'unknown').replaceAll('_',' '))}</small>${layerProof}${trace}</td><td><input class="value-input" data-final-value="${esc(row.pom)}" inputmode="decimal" aria-label="POM ${esc(row.pom)} Size L value in inches" placeholder="—" value="${esc(shownValue)}" ${locked?'disabled':''}></td><td><span class="confidence-number">${esc(confidence)}</span></td><td><div class="status-stack"><span class="status-pill ${esc(statusClass)}">${esc(visibleStatus)}</span>${action}</div></td></tr>`;
    }).join('');
    if(!locked){
      els.finalizationBody.querySelectorAll('input[data-final-value]').forEach(input=>input.addEventListener('input',()=>{
        const index=finalizationRows.findIndex(row=>row.pom===input.dataset.finalValue); if(index<0)return;
        recordTdAction('override',input.dataset.finalValue);
        finalizationRows[index]=E.resolveFinalRow(finalizationRows[index],'td_override',input.value);
        // Learning loop: capture (raw suggestion -> TD value) for measured POMs.
        const pomKey=finalizationRows[index].pom;
        const suggested=lastRawMeasured[pomKey]!=null?lastRawMeasured[pomKey]:finalizationRows[index].suggestionValueIn;
        const corrected=E.fractionToNumber(input.value);
        if(Number.isFinite(Number(corrected))&&Number(corrected)>0&&Number.isFinite(Number(suggested))&&Number(suggested)>0){
          learningStore.push({pom:pomKey,suggested:Number(suggested),corrected:Number(corrected)});
          learnedCorrections=E.learnCorrections(learningStore);
        }
        renderFinalization();
        const replacement=els.finalizationBody.querySelector(`input[data-final-value="${input.dataset.finalValue}"]`); if(replacement){replacement.focus();replacement.setSelectionRange(replacement.value.length,replacement.value.length);}
      }));
      els.finalizationBody.querySelectorAll('input[data-final-value]').forEach(input=>input.addEventListener('focus',()=>input.select()));
      els.finalizationBody.querySelectorAll('button[data-accept-pom]').forEach(button=>button.addEventListener('click',()=>{
        const index=finalizationRows.findIndex(row=>row.pom===button.dataset.acceptPom);if(index<0)return;
        recordTdAction('accept');
        finalizationRows[index]=E.resolveFinalRow(finalizationRows[index],'accept_suggestion');renderFinalization();
      }));
      els.finalizationBody.querySelectorAll('button[data-no-data-pom]').forEach(button=>button.addEventListener('click',()=>{
        const index=finalizationRows.findIndex(row=>row.pom===button.dataset.noDataPom);if(index<0)return;
        recordTdAction('no_evidence');
        finalizationRows[index]=E.resolveFinalRow(finalizationRows[index],'no_data');renderFinalization();
      }));
    }
    els.acceptHighConfidenceBtn.disabled=locked;
    els.markMissingNoDataBtn.disabled=locked;
    els.finalizeSizeLBtn.hidden=locked; els.finalizeSizeLBtn.disabled=!summary.canLock;
    els.unlockFinalBtn.hidden=!locked; els.copyFinalBtn.disabled=!locked;
    els.finalPayload.textContent=locked?JSON.stringify(lockedFinalPayload,null,2):'Not locked.';
    setAnalysisControlsLocked(locked);
  }

  function renderResults(payload) {
    const detected = payload.constructionDetection, effective = payload.effectiveConstruction;
    renderViews(payload.views || []);
    const constructionStateLabel={detected:'detected',uncertain:'candidate',not_detected:'not detected'};
    els.constructionChips.innerHTML=(payload.constructionTags||[]).map(tag=>`<span class="chip ${esc(tag.state)}" title="${esc(tag.evidence||'heuristic evidence')} · detector support ${esc(Math.round(tag.score*100))}%">${esc(tag.label)}<small>${esc(constructionStateLabel[tag.state]||tag.state)} · ${esc(Math.round(tag.score*100))}%</small></span>`).join('');
    renderEvidenceHealth(payload.evidenceHealth);
    renderScaleHypothesis(payload.scales||{});
    renderQuickConfirmations(payload);
    els.constructionResult.textContent = effective; pill(els.constructionConfidence, detected.confidence);
    els.constructionReason.textContent = tdEvidence.constructionConfirmed
      ? `TD confirmed ${effective}; OpenCV proposed ${detected.construction}.`
      : (effective !== detected.construction ? `TD/test override; OpenCV proposed ${detected.construction}.` : detected.reason);
    els.signalList.innerHTML = dlHtml([['Front center rail',payload.signals.centerRail.toFixed(3)],['Front parallel rails',payload.signals.parallelRails.toFixed(3)],['Front repeats',payload.signals.centerRepeats.toFixed(3)],['Back center rail',(payload.signals.backCenterRail||0).toFixed(3)],['Back parallel rails',(payload.signals.backParallelRails||0).toFixed(3)],['Back closure panel',(payload.constructionDetection.backClosurePanelSupport||0).toFixed(3)],['Back repeats',(payload.signals.backCenterRepeats||0).toFixed(3)],['Back H&E rows',payload.signals.backHookEyeRowCount||0],['Generic light detail',(payload.signals.frontTextureScore||0).toFixed(3)],['Lace pattern support',(payload.signals.frontLacePatternScore||0).toFixed(3)],['Lace tile coverage',(payload.signals.frontLacePatternTileCoverage||0).toFixed(3)],['Ink ratio',payload.signals.inkRatio.toFixed(3)]]);
    els.cohortResult.textContent = payload.cohort ? payload.cohort.label : 'No eligible cohort'; pill(els.cohortStatus, payload.cohortGate.status);
    els.cohortCounts.innerHTML = dlHtml([['Catalog styles',payload.cohortGate.catalog_style_count],['Synthetic peers',payload.cohortGate.synthetic_measurement_peer_count],['Approved peers',payload.cohortGate.approved_production_peer_count||0],['Minimum peers',fixture.minimum_peer_count]]);
    const scaleRows = Object.values(payload.scales || {}); const validScales = scaleRows.filter(row=>row&&row.status==='VALID');
    els.scaleResult.textContent = `${validScales.length}/${scaleRows.length} view scales`; pill(els.scaleStatus,validScales.length===scaleRows.length?'VALID':(validScales.length?'REVIEW_REQUIRED':'NO_SCALE_EVIDENCE'));
    els.scaleReason.innerHTML = scaleRows.map(row=>`${esc(row.viewRole)}: ${row.scale?esc(E.round(row.scale,6)+' in/px'):esc(row.status)}${row.reason?`<br><small>${esc(row.reason)}</small>`:''}`).join('<br>');
    const counts = payload.proof.counts;
    els.suggestionResult.textContent = `${counts.numeric} numeric proposals`; pill(els.suggestionStatus,counts.numeric?'SKETCH_MEASUREMENT':'NO_DATA');
    els.suggestionCounts.innerHTML = dlHtml([['Sketch measurements',counts.sketch],['Estimated',counts.estimated],['Library priors',counts.priors],['Review required',counts.review],['No numeric value',counts.noData]]);
    const statusCounts=payload.proof.statusCounts;
    els.proofSummary.textContent = `Run ${payload.analysis_run}: ${payload.views.length} views → ${payload.measurements.filter(row=>row.pixel_length>0).length} anchor-pair distances → ${statusCounts.auto} Auto, ${statusCounts.review} Review, ${statusCounts.insufficient} Insufficient. No measurement line is claimed until TD confirmation. Confidence is shown only when a numeric measurement exists; each POM exposes its 5-layer proof.`;
    els.resultBody.innerHTML = payload.measurements.map(row => `<tr><td><strong>${esc(row.pom)}</strong> ${esc(row.name)}</td><td>${esc(row.viewRole||'—')}</td><td>${row.pixel_length == null ? '—' : esc(row.pixel_length)}</td><td>${row.value_in == null ? '—' : esc(row.value_in + ' in')}</td><td>${row.library_prior_in == null ? '—' : esc(row.library_prior_in + ' in')}</td><td class="source">${esc(row.source)}</td><td>${row.measurement_confidence == null?'—':esc(row.measurement_confidence+'%')}</td><td class="decision ${esc(row.workbench_status)}">${esc(row.workbench_status)}</td><td>${traceHtml(row.evidence_trace||[])}</td></tr>`).join('');
    els.evidencePayload.textContent = JSON.stringify(payload, null, 2);
  }

  async function analyze() {
    if (!currentImage) { els.analysisStatus.textContent='Choose a sketch before analysis.'; return; }
    if (lockedFinalPayload) { els.analysisStatus.textContent='Final Size L is locked. Unlock before re-analysis.'; return; }
    if (analysisInFlight) { els.analysisStatus.textContent='Analysis is already running…'; return; }
    analysisInFlight=true;
    const analysisStarted=performance.now();
    const requestedRun=analysisRun+1;
    els.analyzeBtn.disabled = true;els.analyzeBtn.classList.add('analyzing');els.analyzeBtn.setAttribute('aria-busy','true');els.analyzeBtn.textContent='Analyzing…';
    els.analysisStatus.textContent = `Run ${requestedRun}: extracting offline evidence…`;
    try {
      // Allow the busy state to paint before the synchronous OpenCV work starts.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      drawImage(currentImage); const base = pixelBboxAndFallbackSignals(); const signals = openCvSignals(base);
      const detection = E.classifyConstruction(signals);
      const override = els.constructionOverride.value;
      const effective = tdEvidence.constructionConfirmed || (override === 'auto' ? detection.construction : override);
      const cohort = E.cohortById(fixture, effective);
      const summary = E.cohortSummary(fixture).find(row => row.id === effective);
      const cohortGate = summary ? Object.assign({ status:summary.eligible?'ELIGIBLE':'INSUFFICIENT_PEERS',minimum:fixture.minimum_peer_count },summary) : { status:'NO_COHORT',catalog_style_count:0,synthetic_measurement_peer_count:0,approved_production_peer_count:0,minimum:fixture.minimum_peer_count };
      // Anchor source (US-039 Stage 1): prefer the production detector's REAL
      // ink-confirmed anchors (bridged from a fixture) over lab ratio hypotheses.
      const demoName = currentImage.dataset.name || (els.demoSelect.value||'').split('/').pop();
      const fixtures = (typeof PRODUCTION_ANCHOR_FIXTURES !== 'undefined') ? PRODUCTION_ANCHOR_FIXTURES : {};
      const detectedFixture = fixtures[demoName] || null;
      const useDetected = els.anchorSource && els.anchorSource.value === 'detected' && detectedFixture;
      const paths = useDetected
        ? E.pathsFromDetectedAnchors(detectedFixture.anchors, { width:els.sourceCanvas.width, height:els.sourceCanvas.height, viewRegions:signals.viewRegions })
        : E.deriveCandidatePaths(signals.viewRegions);
      anchorProvenance = useDetected ? 'production_detected' : 'lab_ratio_hypothesis';
      // Prototype: real anchor geometry as an independent second opinion on the
      // OpenCV construction call (structure axis strong, closure axis weak).
      const anchorCorroboration = useDetected
        ? E.corroborateConstruction(detectedFixture.anchors, { width:els.sourceCanvas.width, height:els.sourceCanvas.height }, detection)
        : null;
      drawAnchorHypotheses(paths,signals.viewRegions);
      const hookEyeReference=E.hookEyePom12Reference(fixture,effective,signals.backHookEyeRowCount);
      const mode = els.measurementMode.value; let inferred = null, scales;
      if (mode === 'auto') {
        // Stage-0 auto-scale (US-039): one evidence-ranked, view-local resolver
        // replaces the manual scale-mode toggle. Precedence and view-locality
        // live in engine.js resolveViewScales; a TD-confirmed back H&E height is
        // fed in as a back-view calibration so it still wins over OpenCV rows.
        const autoCalibrations = [];
        if (tdEvidence.backHookWidth) autoCalibrations.push({ viewRole:'back', pom:'12', knownLength:Number(tdEvidence.backHookWidth) });
        scales = E.resolveViewScales({ fixture, cohortId:effective, paths, hookEyeReference, calibrations:autoCalibrations });
        if (scales.front_outer && scales.front_outer.precedence === 'multi_anchor_inferred') {
          inferred = { status:'VALID', scale:scales.front_outer.scale, candidates:scales.front_outer.candidates || [] };
        }
      } else if (mode === 'explicit') {
        scales = E.buildExplicitViewScales(paths,[
          { viewRole:'front_outer',pom:els.frontCalibrationPom.value,knownLength:Number(els.frontKnownLength.value) },
          { viewRole:'back',pom:els.backCalibrationPom.value,knownLength:Number(els.backKnownLength.value) }
        ]);
      } else if (mode === 'inferred') {
        inferred = E.inferScale(fixture,effective,paths,'front_outer');
        const backPath=paths.find(path=>path.pom==='12');
        const backStats=E.cohortPomStats(fixture,effective,'12');
        const hookScale=effective==='back_hook_and_eye'&&backPath&&backPath.pixelLength>0&&backStats.status==='ELIGIBLE'
          ? {viewRole:'back',status:'VALID',scale:backStats.median/backPath.pixelLength,source:'library_hook_eye_hypothesis',reason:`Back POM 12 hypothesis: ${backStats.median} in / ${backPath.pixelLength} px. Not TD calibrated.`}
          : {viewRole:'back',status:'NO_SCALE_EVIDENCE',scale:null,source:'none',reason:'No two independent back-view scale candidates.'};
        scales = {
          front_outer:{ viewRole:'front_outer',status:inferred.status,scale:inferred.scale,source:'library_multi_anchor_inference',reason:inferred.status==='VALID'?`Robust median from POM ${inferred.candidates.map(c=>c.pom).join(' and POM ')}.`:'POM 1/5 scale candidates are missing or disagree.' },
          back:hookScale
        };
      } else scales = {
        front_outer:{ viewRole:'front_outer',status:'PRIOR_ONLY',scale:null,source:'none',reason:'No TD-confirmed front scale.' },
        back:{ viewRole:'back',status:'PRIOR_ONLY',scale:null,source:'none',reason:'No TD-confirmed back scale.' }
      };
      // Manual modes layer the H&E / TD-confirmed back references on top after the
      // fact; auto mode already folds them into resolveViewScales by precedence.
      if(mode!=='auto'){
        if(hookEyeReference.status==='SUPPORTED'){
          const detectedBack=E.viewScaleFromCalibration(paths,{viewRole:'back',pom:'12',knownLength:hookEyeReference.value_in});
          if(detectedBack.status==='VALID')scales.back=Object.assign({},detectedBack,{
            source:'opencv_hook_eye_rows_reference',
            calibrationKind:'opencv_hook_eye_row_reference',
            reason:`OpenCV detected ${hookEyeReference.row_count} regular back H&E rows: POM 12 = ${hookEyeReference.value_in.toFixed(2)} in. This seeds the back view only.`
          });
        }
        if(tdEvidence.backHookWidth){
          const confirmedBack=E.viewScaleFromCalibration(paths,{viewRole:'back',pom:'12',knownLength:tdEvidence.backHookWidth});
          scales.back=Object.assign({},confirmedBack,{
            calibrationKind:'td_confirmed_hook_eye_height',
            reason:`TD confirmed back H&E height ${tdEvidence.backHookWidth} in against POM 12 pixels. This calibrates the back view only.`
          });
        }
      }
      // Pass 1: per-POM sketch/prior rows (value only, no evidence outcome yet).
      const prelim = paths.map(path => {
        const viewScale = scales[path.viewRole] || null;
        const stats = E.cohortPomStats(fixture,effective,path.pom);
        const generalPrior=priors.poms&&priors.poms[path.pom];
        const generalPriorAvailable=generalPrior&&Number.isFinite(Number(generalPrior.median))&&Number(generalPrior.median)>0;
        const result = hookEyeReference.status==='SUPPORTED'&&path.pom==='12'
          ? {pom:'12',name:path.name,viewRole:path.viewRole,value_in:hookEyeReference.value_in,source:'opencv_hook_eye_row_rule',confidence:'medium',decision:'ESTIMATED_SUGGESTION',result_kind:'CONSTRUCTION_REFERENCE_MEASUREMENT',reason:`${hookEyeReference.row_count} detected back H&E rows map directly to POM 12 = ${hookEyeReference.value_in.toFixed(2)} in.`,cohort:stats,construction_reference:hookEyeReference,evidence:['back_hook_eye_row_count','direct_pom12_mapping','construction_compatible_peers']}
          : (effective === 'unknown'
            ? (generalPriorAvailable
              ? {pom:path.pom,name:path.name,viewRole:path.viewRole,value_in:Number(generalPrior.median),source:'general_library_baseline',confidence:'low',decision:'LIBRARY_PRIOR',result_kind:'LIBRARY_PRIOR',reason:'Construction is unresolved; showing the General Library Baseline for TD review without selecting a construction cohort.',library_prior_count:Number(generalPrior.n)||0,evidence:['construction_unresolved','general_library_baseline']}
              : { pom:path.pom,name:path.name,viewRole:path.viewRole,value_in:null,source:'none',confidence:'very_low',decision:'TD_CONFIRM_CONSTRUCTION',result_kind:'NO_DATA',reason:'Construction is unresolved and the general library has no numeric prior.' })
            : E.fuseMeasurement({ fixture,priors,cohortId:effective,pom:path.pom,path,pixelLength:path.pixelLength,viewRole:path.viewRole,viewScale,placementConfidence:path.confidence,mode,inferredScale:inferred&&inferred.scale }));
        const row = Object.assign({ pixel_length:path.pixelLength,library_prior_in:stats.median==null&&generalPriorAvailable?Number(generalPrior.median):stats.median,anchors:path.anchors,start:path.start,end:path.end,viewBox:path.viewBox,anchorStatus:path.anchorStatus },result);
        return { path, viewScale, row };
      });
      // Pass 2: library × sketch fusion (ADR 0033) — auto mode only; manual
      // modes keep the raw sketch value so their diagnostics stay comparable.
      const fusionSummary = mode==='auto' ? E.fuseWithLibrary(prelim.map(p=>p.row), { fixture, cohortId:effective, priors }) : null;
      // Learning loop (US-045): nudge each measured suggestion by the offset
      // learned from past TD overrides, before the outcome is scored. Records the
      // raw (pre-learning) value so a future override captures the true residual.
      lastRawMeasured = {};
      if (mode==='auto') for (const {row} of prelim) {
        if (row.result_kind==='SKETCH_MEASUREMENT' || row.result_kind==='ESTIMATED_SUGGESTION') {
          lastRawMeasured[row.pom] = row.value_in;
          const corr = E.applyLearnedCorrection(row.pom, row.value_in, learnedCorrections);
          if (corr.applied) { row.value_in = corr.value; row.learning = corr; }
        }
      }
      // Pass 3: evidence trace + trust outcome, computed on the (learned) value.
      const measurements = prelim.map(({path, viewScale, row}) => {
        row.evidence_trace = traceFor(path,row,viewScale,cohortGate);
        const outcome=E.measurementEvidenceOutcome({
          measurement:row,path,scale:viewScale,cohortGate,minimumPeerCount:fixture.minimum_peer_count,
          constructionDetection:detection,effectiveConstruction:effective,
          viewsConfirmed:tdEvidence.viewsConfirmed,
          constructionConfirmed:tdEvidence.constructionConfirmed===effective
        });
        row.evidence_coverage_score=outcome.score;
        row.measurement_confidence=outcome.measurementConfidence;
        row.layer_proof=outcome.layers;
        row.workbench_status=outcome.status;row.gate_reason=outcome.gateReason;row.display_value_in=outcome.displayValueIn;
        return row;
      });
      const proofCounts = {
        numeric:measurements.filter(row=>row.value_in!=null).length,
        sketch:measurements.filter(row=>row.result_kind==='SKETCH_MEASUREMENT').length,
        estimated:measurements.filter(row=>row.result_kind==='ESTIMATED_SUGGESTION').length,
        priors:measurements.filter(row=>row.decision==='LIBRARY_PRIOR').length,
        review:measurements.filter(row=>row.decision==='REVIEW_REQUIRED').length,
        noData:measurements.filter(row=>row.value_in==null).length
      };
      const statusCounts={
        auto:measurements.filter(row=>row.workbench_status==='AUTO').length,
        review:measurements.filter(row=>row.workbench_status==='REVIEW').length,
        insufficient:measurements.filter(row=>row.workbench_status==='INSUFFICIENT').length
      };
      const evidenceHealth=E.calculateEvidenceHealth({views:signals.viewRegions,paths,scales,cohortGate,constructionDetection:detection,minimumPeerCount:fixture.minimum_peer_count});
      const constructionTags=E.deriveConstructionTags(signals,detection,signals.viewRegions);
      analysisRun += 1;
      pilot.lastAnalysisMs=performance.now()-analysisStarted;
      lastPayload = { schema_version:'construction-measurement-evidence.v5',analysis_run:analysisRun,data_warning:'synthetic_test_data_not_production_evidence',image:{name:currentImage.dataset.name||els.demoSelect.value,width:currentImage.naturalWidth,height:currentImage.naturalHeight},views:signals.viewRegions,signals,constructionDetection:detection,constructionTags,effectiveConstruction:effective,hookEyeReference,td_confirmations:Object.assign({},tdEvidence),cohort,cohortGate,scales,scale:scales.front_outer,fusion:fusionSummary,anchorProvenance,anchorCorroboration,learning:{corrections:learningStore.length,learned:learnedCorrections},evidenceHealth,proof:{counts:proofCounts,statusCounts},pilot:pilotSnapshot(),measurements };
      finalizationRows=E.createFinalizationRows(measurements,analysisRun).map((row,index)=>{
        const measurement=measurements[index];
        let next=Object.assign(row,{workbenchStatus:measurement.workbench_status,confidenceScore:measurement.measurement_confidence,evidenceCoverageScore:measurement.evidence_coverage_score,layerProof:measurement.layer_proof,gateReason:measurement.gate_reason,displaySuggestionValueIn:measurement.display_value_in,viewRole:measurement.viewRole});
        if(measurement.workbench_status==='AUTO')next=Object.assign(E.resolveFinalRow(next,'accept_suggestion'),{autoAccepted:true});
        return next;
      });
      lastPayload.pilot=pilotSnapshot();
      lockedFinalPayload=null;
      renderResults(lastPayload); renderFinalization(); els.analysisStatus.textContent = `Run ${analysisRun} complete in ${Math.max(1,Math.round(pilot.lastAnalysisMs))} ms. Results refreshed; inspect evidence, then finalize Size L.`;
    } catch (error) { els.analysisStatus.textContent = `Analysis failed: ${error.message}`; console.error(error); }
    finally {
      analysisInFlight=false;els.analyzeBtn.disabled=false;els.analyzeBtn.classList.remove('analyzing');els.analyzeBtn.removeAttribute('aria-busy');
      els.analyzeBtn.textContent=lastPayload?'Analyze again':'Analyze evidence';
    }
  }

  els.measurementMode.addEventListener('change', () => {
    els.explicitControls.style.display = els.measurementMode.value === 'explicit' ? 'grid' : 'none';
    recordTdAction('scale_method');
  });
  els.constructionOverride.addEventListener('change',async()=>{
    tdEvidence.constructionConfirmed=null;
    recordTdAction('construction_override');
    await analyze();
  });
  els.demoSelect.addEventListener('change', async () => { await loadSelectedDemo(); await analyze(); });
  els.fileInput.addEventListener('change', async () => {
    const file = els.fileInput.files && els.fileInput.files[0]; if (!file) return;
    viewOverrides = {}; resetFastLaneEvidence(); const url = URL.createObjectURL(file); currentImage = await loadImage(url); currentImage.dataset.name = file.name; drawImage(currentImage); await analyze(); URL.revokeObjectURL(url);
  });
  els.analyzeBtn.addEventListener('click', analyze);
  els.confirmViewsBtn.addEventListener('click',async()=>{
    if(!lastPayload||lastPayload.views.some(view=>view.role==='unknown'))return;
    tdEvidence.viewsConfirmed=true;
    recordTdAction('confirm_views');
    await analyze();
  });
  els.confirmConstructionBtn.addEventListener('click',async()=>{
    if(!lastPayload||lastPayload.effectiveConstruction==='unknown')return;
    tdEvidence.constructionConfirmed=lastPayload.effectiveConstruction;
    recordTdAction('confirm_construction');
    await analyze();
  });
  els.hookWidthButtons.querySelectorAll('[data-hook-width]').forEach(button=>button.addEventListener('click',async()=>{
    tdEvidence.backHookWidth=Number(button.dataset.hookWidth);
    tdEvidence.constructionConfirmed='back_hook_and_eye';
    els.constructionOverride.value='back_hook_and_eye';
    els.backCalibrationPom.value='12';
    els.backKnownLength.value=String(tdEvidence.backHookWidth);
    recordTdAction('confirm_hook_eye');
    await analyze();
  }));
  els.clearHookWidthBtn.addEventListener('click',async()=>{
    if(tdEvidence.backHookWidth==null)return;
    tdEvidence.backHookWidth=null;
    recordTdAction('clear_hook_eye');
    await analyze();
  });
  els.copyEvidenceBtn.addEventListener('click', async () => { if (!lastPayload) return; await navigator.clipboard.writeText(JSON.stringify(lastPayload,null,2)); els.analysisStatus.textContent='Evidence JSON copied.'; });
  els.acceptHighConfidenceBtn.addEventListener('click',()=>{ if(lockedFinalPayload)return; recordTdAction('bulk_accept'); finalizationRows=E.acceptHighConfidence(finalizationRows); renderFinalization(); });
  els.markMissingNoDataBtn.addEventListener('click',()=>{
    if(lockedFinalPayload)return;
    recordTdAction('bulk_no_evidence');
    finalizationRows=finalizationRows.map(row=>row.status!=='RESOLVED'&&row.workbenchStatus==='INSUFFICIENT'?E.resolveFinalRow(row,'no_data'):row);
    renderFinalization();
  });
  els.finalizeSizeLBtn.addEventListener('click',()=>{
    if(!lastPayload||lockedFinalPayload)return;
    recordTdAction('lock');
    pilot.lockMs=performance.now()-pilot.startedAt;
    const result=E.lockFinalization(finalizationRows,{analysisRun:lastPayload.analysis_run,image:lastPayload.image,construction:lastPayload.effectiveConstruction,pilot:pilotSnapshot()});
    if(!result.ok){els.analysisStatus.textContent=`Cannot lock final Size L: ${result.status}.`;renderFinalization();return;}
    lockedFinalPayload=result.payload; lastPayload.final_size_l=lockedFinalPayload; renderFinalization(); els.analysisStatus.textContent='Final Size L locked with its evidence snapshot.';
  });
  els.unlockFinalBtn.addEventListener('click',()=>{lockedFinalPayload=null;pilot.lockMs=null;recordTdAction('unlock');if(lastPayload)delete lastPayload.final_size_l;renderFinalization();els.analysisStatus.textContent='Final Size L unlocked for TD edits.';});
  els.copyFinalBtn.addEventListener('click',async()=>{if(!lockedFinalPayload)return;await navigator.clipboard.writeText(JSON.stringify(lockedFinalPayload,null,2));els.analysisStatus.textContent='Final Size L JSON copied.';});

  // Learning-loop inspect/reset hook (US-045). Optional + resettable: clearing
  // the store reverts every measured suggestion to its raw value on re-analysis.
  window.__braLabLearning = {
    get: () => learnedCorrections,
    records: () => learningStore.slice(),
    reset: () => { learningStore = []; learnedCorrections = {}; if (currentImage) analyze(); },
  };

  (async function init() {
    renderCohorts();
    await loadSelectedDemo();
    await analyze(); // immediate first pass on the pixel fallback — never blocks on WASM
    watchCv(() => { analyze(); }); // upgrade in place once OpenCV finishes compiling
  })();
})();
