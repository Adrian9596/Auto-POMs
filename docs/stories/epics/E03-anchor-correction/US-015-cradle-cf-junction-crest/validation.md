# Validation — US-015 cradle-cf-top junction + crest tiers

## Proof Strategy

Accuracy vs the TD-draft GT targets (demo4: 0.1885/0.834 placket junction;
demo5: 0.2314/0.583 gore top), plus the standard additivity/isolation ladder.

## Results (2026-07-11)

- `npm run build` + `npm run check` — passed.
- `npm run detection-limitations` — 14/14. The first junction draft FAILED
  pom6-limitations (no-cradle + decorative-tick drew because the scan
  accepted rows inside the solid band, where the synthetic CF line provided
  the "vertical edge"); fixed by requiring an EMPTY gap at the axis cell ±1
  — the actual placket signature. Both guards green after the fix.
- `npm run invariants` — 209/209.
- `npm run contract` — 1086/1086 (22 more assertions live: C6 rules now run
  on demo4/demo5 and pass, including C6.shorter-than-pom5 and the extended
  C6.seam-source).
- `npm run accuracy` — **cradle-cf-top err 0.0035 on demo4 (junction) and
  0.0035 on demo5 (crest)**; kind mean 0.0014 across n=5. **Zero MISSING
  anchors remain in the labeled corpus.** demo4 also reports mean 0.0002 /
  100% tight overall.
- `npm run golden` — drift ONLY on demo4 + demo5, each ONLY
  `anchors added: cradle-cf-top`, maxDrift 0.0000; re-baselined 19/19; PASS.
- `npm run smoke` + `npm run meaning-tests` — 0 failures.

## Notes

- The crest tier first returned null on demo5: the raw finder picks the
  topmost crest (0.5658, on the neckline just ABOVE cf-top 0.575) and a
  post-hoc below-cf-top filter rejected it. Root cause: floor must be applied
  during crest SELECTION (192 valid candidates span 0.566–0.581 on the same
  contour). `crestBelowCfY` selects 0.5795 → GT err 0.0035.
- POM 8 on demo5 is now a legitimately tiny span (cf-top 0.575 → crest
  0.5795) — true for a plunge gore where the cups meet at the gore top.
