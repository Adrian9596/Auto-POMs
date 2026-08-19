import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFreePort, startStaticServer } from '../scripts/static-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const cleanup = [];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchJson(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status} ${url}`); return response.json(); }
async function waitForCdp(port) {
  for (let i = 0; i < 100; i += 1) { try { await fetchJson(`http://127.0.0.1:${port}/json/version`); return; } catch (_) { await sleep(80); } }
  throw new Error('Chrome CDP did not start');
}
async function connect(port) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json`);
      const target = targets.find(row => row.type === 'page' && row.webSocketDebuggerUrl);
      if (target) {
        const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
        let id=0; const pending=new Map(); ws.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}});
        const call=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,msg=>msg.error?reject(new Error(msg.error.message)):resolve(msg.result));ws.send(JSON.stringify({id:requestId,method,params}));});
        const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'evaluation failed');return result.result.value;};
        return { evaluate, close:()=>ws.close() };
      }
    } catch (_) {}
    await sleep(80);
  }
  throw new Error('No page target');
}
async function waitFor(session, expression, timeout=20000) {
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    try {
      const value = await Promise.race([
        session.evaluate(expression),
        new Promise((_, reject) => setTimeout(() => reject(new Error('evaluation timeout')), 1500))
      ]);
      if(value)return;
    } catch(_) {}
    await sleep(100);
  }
  let diagnostic = null;
  try {
    diagnostic = await Promise.race([
      session.evaluate(`(() => ({readyState:document.readyState,rows:document.querySelectorAll('#resultBody tr').length,runtime:document.getElementById('runtimeStatus')&&document.getElementById('runtimeStatus').textContent,analysis:document.getElementById('analysisStatus')&&document.getElementById('analysisStatus').textContent,engine:!!window.MeasurementTestEngine,fixture:!!window.CONSTRUCTION_COHORT_FIXTURE,priors:!!window.MEASUREMENT_PRIOR_SNAPSHOT,cv:!!window.cv,cvMat:!!(window.cv&&window.cv.Mat)}))()`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('diagnostic timeout')), 2000))
    ]);
  } catch (_) {}
  throw new Error(`wait timeout: ${expression} diagnostic=${JSON.stringify(diagnostic)}`);
}

try {
  const server = await startStaticServer(root); cleanup.push(() => new Promise(resolve => {
    if (typeof server.server.closeAllConnections === 'function') server.server.closeAllConnections();
    server.server.close(resolve);
  }));
  const cdpPort = await getFreePort(); const profile = await mkdtemp(path.join(tmpdir(),'construction-measurement-'));
  cleanup.push(() => rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
  const chrome = spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`,`${server.baseUrl}/test/index.html`]);
  cleanup.push(() => {
    if (chrome.exitCode != null || chrome.signalCode != null) return Promise.resolve();
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>{if(chrome.exitCode==null)chrome.kill('SIGKILL');resolve();},2000);
      chrome.once('exit',()=>{clearTimeout(timeout);resolve();});chrome.kill('SIGTERM');
    });
  });
  await waitForCdp(cdpPort); const session = await connect(cdpPort); cleanup.push(() => session.close());
  await waitFor(session, `document.querySelectorAll('#resultBody tr').length === 16`,45000);
  const initial = await session.evaluate(`(() => { const p=JSON.parse(document.getElementById('evidencePayload').textContent); const finalRows=Array.from(document.querySelectorAll('#finalizationBody tr')); const constructionChips=Array.from(document.querySelectorAll('#constructionChips .chip')); return {rows:document.querySelectorAll('#resultBody tr').length,cards:document.querySelectorAll('.cohort-card').length,warning:p.data_warning,schema:p.schema_version,effectiveConstruction:p.effectiveConstruction,measurements:p.measurements.length,numeric:p.measurements.filter(row=>row.value_in!=null).length,firstMeasurements:p.measurements.slice(0,3).map(row=>({pom:row.pom,value:row.value_in,source:row.source,decision:row.decision,reason:row.reason})),hookRows:p.signals.backHookEyeRowCount||0,fiveLayerProof:p.measurements.every(row=>Array.isArray(row.layer_proof)&&row.layer_proof.length===5),fastLane:!!document.getElementById('confirmViewsBtn')&&!!document.getElementById('confirmConstructionBtn')&&!!document.getElementById('hookWidthButtons'),blankConfidenceViolations:finalRows.filter(row=>!row.querySelector('input').value&&row.children[3].textContent.trim()!=='—').length,constructionChipStates:constructionChips.map(chip=>chip.querySelector('small').textContent),visibleConstructionPercent:constructionChips.some(chip=>/%/.test(chip.textContent)),anchorLegend:document.querySelector('.canvas-legend').textContent.trim(),runtime:document.getElementById('runtimeStatus').textContent,cvReady:!!(window.cv&&window.cv.Mat&&window.cv.imread),analysis:document.getElementById('analysisStatus').textContent,remote:performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/^https?:/.test(n)&&!n.startsWith(location.origin))}; })()`);
  if(initial.rows!==16||initial.cards!==5||initial.measurements!==16||initial.numeric===0||initial.schema!=='construction-measurement-evidence.v5'||!initial.fiveLayerProof||!initial.fastLane||initial.blankConfidenceViolations!==0||!initial.visibleConstructionPercent||!initial.anchorLegend.includes('no inferred lines')||initial.warning!=='synthetic_test_data_not_production_evidence'||initial.remote.length)throw new Error(`initial contract failed ${JSON.stringify(initial)}`);
  await waitFor(session, `document.getElementById('runtimeStatus').textContent.includes('ready') && !document.getElementById('analyzeBtn').disabled`,45000);
  const upgraded=await session.evaluate(`(() => { const p=JSON.parse(evidencePayload.textContent); return {analysisRun:p.analysis_run,effectiveConstruction:p.effectiveConstruction,hookRows:p.signals.backHookEyeRowCount||0,backHookTag:p.constructionTags.find(row=>row.id==='back_hook_and_eye'),rowCandidates:p.signals.backHookEyeRowCandidates||[],smallBackCenterComponents:p.signals.smallBackCenterComponents||0,backCenterRail:p.signals.backCenterRail||0,backCenterRepeats:p.signals.backCenterRepeats||0,numeric:p.measurements.filter(row=>row.value_in!=null).length,pom12:p.measurements.find(row=>row.pom==='12'),runtime:runtimeStatus.textContent}; })()`);
  if(upgraded.effectiveConstruction!=='back_hook_and_eye'||upgraded.hookRows<3||upgraded.backHookTag.state!=='detected'||upgraded.numeric===0)throw new Error(`OpenCV upgrade contract failed ${JSON.stringify(upgraded)}`);
  const analyzeButton=await session.evaluate(`(async()=>{const before=JSON.parse(evidencePayload.textContent).analysis_run;analyzeBtn.click();const busyText=analyzeBtn.textContent;const busyStatus=analysisStatus.textContent;const busy=analyzeBtn.disabled&&analyzeBtn.getAttribute('aria-busy')==='true';for(let i=0;i<200;i++){await new Promise(resolve=>setTimeout(resolve,25));const payload=JSON.parse(evidencePayload.textContent);if(payload.analysis_run>before&&!analyzeBtn.disabled)return{before,after:payload.analysis_run,busy,busyText,busyStatus,buttonText:analyzeBtn.textContent,status:analysisStatus.textContent};}return{before,after:JSON.parse(evidencePayload.textContent).analysis_run,busy,busyText,busyStatus,buttonText:analyzeBtn.textContent,status:analysisStatus.textContent};})()`);
  if(analyzeButton.after!==analyzeButton.before+1||!analyzeButton.busy||analyzeButton.busyText!=='Analyzing…'||analyzeButton.buttonText!=='Analyze again'||!analyzeButton.status.includes(`Run ${analyzeButton.after} complete`))throw new Error(`Analyze button contract failed ${JSON.stringify(analyzeButton)}`);
  const demoRows=await session.evaluate(`(async()=>{const results=[];for(const value of ['sketches/demo1.jpg','sketches/demo3.jpg','sketches/demo5.jpg']){const before=JSON.parse(evidencePayload.textContent).analysis_run;demoSelect.value=value;demoSelect.dispatchEvent(new Event('change'));for(let i=0;i<300;i++){await new Promise(resolve=>setTimeout(resolve,50));const p=JSON.parse(evidencePayload.textContent);if(p.analysis_run>before&&p.image.name===value&&!analyzeBtn.disabled){results.push({image:value,construction:p.effectiveConstruction,hookRows:p.signals.backHookEyeRowCount||0,rowSource:p.signals.backHookEyeRowEvidenceSource||'none',backPanelSupport:p.constructionDetection.backClosurePanelSupport||0,backHookTag:p.constructionTags.find(row=>row.id==='back_hook_and_eye'),numeric:p.measurements.filter(row=>row.value_in!=null).length,pom12:p.measurements.find(row=>row.pom==='12').value_in});break;}}}return results;})()`);
  const demo1=demoRows.find(row=>row.image==='sketches/demo1.jpg');
  if(demoRows.length!==3||demoRows.some(row=>row.numeric===0)||!demo1||demo1.backHookTag.state!=='not_detected')throw new Error(`demo row audit failed ${JSON.stringify(demoRows)}`);
  const scenarios = await session.evaluate(`(async()=>{const run=async(value)=>{constructionOverride.value=value;measurementMode.value='prior';analyzeBtn.click();for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,50));if(!analyzeBtn.disabled)break;}return JSON.parse(evidencePayload.textContent);};const zipper=await run('front_zipper');const hook=await run('front_hook_and_eye');return{zipperGate:zipper.cohortGate.status,pom14:zipper.measurements.find(r=>r.pom==='14'),pom15:zipper.measurements.find(r=>r.pom==='15'),hookGate:hook.cohortGate.status,hookPom9:hook.measurements.find(r=>r.pom==='9')};})()`);
  if(scenarios.zipperGate!=='ELIGIBLE'||scenarios.pom14.source!=='construction_cohort_prior'||scenarios.pom15.decision!=='LIBRARY_PRIOR'||scenarios.hookGate!=='INSUFFICIENT_PEERS'||scenarios.hookPom9.decision!=='LIBRARY_PRIOR'||scenarios.hookPom9.source!=='general_library_baseline')throw new Error(`scenario contract failed ${JSON.stringify(scenarios)}`);
  console.log(JSON.stringify({status:'pass',initial,upgraded,analyzeButton,demoRows,scenarios},null,2));
} catch (error) {
  console.error(`FAIL construction-measurement-browser-test: ${error.message}`);
  process.exitCode = 1;
} finally {
  for(const task of cleanup.reverse()){try{await task();}catch(_){}}
}
