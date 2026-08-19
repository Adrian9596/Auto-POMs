# Topology layer — validation harness (browser)

`test/topology.js` holds the **pure** topology functions; they unit-test in Node
(`npm run construction-measurement-test`, the `topology:` cases). Validating them
on a **real sketch** needs pixels, so extraction runs in the browser lab. Two
passes are required: rows → cup zone, then a column profile **restricted to that
zone** → apex. That is why this is a documented snippet rather than a Node script.

## Run it

1. `preview_start` `{"name":"test-lab"}`, open `test/index.html` (it loads
   `topology.js`).
2. Paste the snippet below in the page context.
3. Read `window.__topoAll`.

**Gotcha:** draw into a **fresh offscreen canvas** from the image URL. Reading
`#sourceCanvas` picks up the lab's own overlay (dashed view boxes, anchor
circles) and injects phantom ink bands (observed: fake peaks of 129/194).
Also note `engine.deriveViewRegionsFromColumns` returns an **array**, not
`{viewRegions}`.

```js
(function(){
  window.__topoAll = {}; window.__topoDone = 0;
  const T = window.MeasurementTopology, E = window.MeasurementTestEngine;
  const names = ['EvelynBliss vA 1.0.jpg','demo1.jpg','demo3.jpg','demo4.jpg','demo5.jpg'];
  names.forEach(name => {
    const img = new Image();
    img.onload = function(){
      const W=900, H=Math.round(img.naturalHeight*(900/img.naturalWidth));
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const ctx=cv.getContext('2d',{willReadFrequently:true});
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.drawImage(img,0,0,W,H);
      const d=ctx.getImageData(0,0,W,H).data;
      const ink=new Uint8Array(W*H);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;ink[y*W+x]=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114)<200?1:0;}
      const colAll=new Array(W).fill(0);
      for(let x=0;x<W;x++){let n=0;for(let y=0;y<H;y++)n+=ink[y*W+x];colAll[x]=n;}
      const regions = E.deriveViewRegionsFromColumns(colAll,W,H);   // ARRAY
      const front = regions.find(r=>r.role==='front_outer') || regions[0];
      const b=front.bbox,x0=Math.floor(b.x),y0=Math.floor(b.y),x1=Math.ceil(b.x+b.width),y1=Math.ceil(b.y+b.height);
      const rowInk=[];
      for(let y=y0;y<y1;y++){let n=0;for(let x=x0;x<x1;x++)n+=ink[y*W+x];rowInk.push(n);}
      const named=T.interpretFrontBands(rowInk);          // pass 1
      const zone=T.deriveCupZone(named);
      let apex=null,ratio=null,plausible=null;
      if(zone){
        const colZone=[];                                  // pass 2: zone-restricted
        for(let x=x0;x<x1;x++){let n=0;for(let y=y0+zone.top;y<=y0+zone.bottom;y++)n+=ink[y*W+x];colZone.push(n);}
        apex=T.deriveCupApex(colZone);
        if(named.bandTopY!=null&&apex){
          const yy=y0+named.bandTopY;let l=-1,r=-1;
          for(let x=x0;x<x1;x++) if(ink[yy*W+x]){if(l<0)l=x-x0;r=x-x0;}
          if(l>=0){const p=T.apexPlausibility(apex.leftApexX,apex.rightApexX,l,r);ratio=p.ratio;plausible=p.plausible;}
        }
      }
      window.__topoAll[name]={ hem:named.hemY,bandTop:named.bandTopY,cradle:named.cradleSeamY,gore:named.goreTopY,
        zone:zone?zone.top+'-'+zone.bottom:null,
        apex:apex?(apex.leftApexX+'/'+apex.rightApexX+(apex.centreFromRail?' rail':' inferred')):null, ratio, plausible };
      window.__topoDone++;
    };
    img.src='sketches/'+name;
  });
})();
```

## Result (recorded 2026-07-28, 900px-wide canvas, front_outer view)

| sketch | cradle seam | gore top | cup zone | apex L/R | apex/band | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `EvelynBliss vA 1.0` | 208 | 144 | 144–208 | 56/165 (rail) | **0.559** | plausible |
| `demo1` | 281 | 210 | 210–281 | 84/264 (rail) | **0.552** | plausible |
| `demo3` | 209 | 178 | 178–209 | 74/212 (inferred) | **0.525** | plausible |
| `demo5` | 251 | 185 | 185–251 | 83/256 (rail) | **0.546** | plausible |
| `demo4` | 165 | — | — | — | — | **abstained** |

**4/5 plausible, ratios clustered 0.525–0.559** where the production apex reads
**0.793**. `demo4` correctly abstains: it is a **seamless yoke** — there is no
gore seam drawn, and `scripts/groundtruth/README.md` records that the human
labeller likewise *omitted* apex on it ("no defensible landmark … omitted, not
invented"). Abstaining is the right answer, not a miss.

### Impact on the two target failures (EvelynBliss)

| | production | topology |
| --- | --- | --- |
| POM 16 apex | 31/186, ratio 0.793 → **11.43 in** | 56/165, ratio 0.559 → **8.06 in** |
| POM 6/8 `cradle-cf-top` | **missing** → NO DATA | derived at y=208 |

Realistic apex-to-apex for size L is ~7.5–8.5 in, so 8.06 in lands in range while
11.43 in did not. Independent corroboration that the bands are real structure:
the derived gore top (y=144) **matches production's own detected `cf-top`**
(y=0.514×280=143.9) to within a pixel.

## Known limits

- Prototype only: nothing is wired into anchor seeding yet. Merging derived
  anchors would happen in `engine.pathsFromDetectedAnchors`.
- `deriveCupApex` uses the cup zone's full ink extent as the side edges, which
  includes the wings — this biases the ratio slightly high (0.55 rather than
  0.50). Using the band-row span as the edges would tighten it.
- Validated on 5 sketches at one canvas width. Thresholds are all expressed as
  fractions, but that is not proof of generality.
- Does **not** address scale: a ruler-less sketch still cannot give absolute size.
