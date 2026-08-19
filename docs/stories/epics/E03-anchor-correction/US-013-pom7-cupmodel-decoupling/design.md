# Design — US-013 POM 7 seam tier decouples the cupModel

## Domain Model

- **Seam tier** (new value on the detected bottom-cup seam):
  - `strong` — vertical guide with colRatio ≥ 0.28 and ≥ 4/5 segments (today).
  - `seam` — pattern-3: no guide, but strong cradle ink + horizontal seam run
    (today; previously indistinguishable from `strong`).
  - `guide` — NEW: no strong guide and pattern-3 failed, but a sparse dashed
    vertical guide is present (≥ 4/5 segments inked, colRatio ≥ 0.12).
- Business rule: only `strong`/`seam` tiers are trustworthy enough to
  relocate the cupModel's cup-bottom. `guide` is drawn for the TD to verify,
  never consumed downstream.

## Application Flow

1. `detectLandmarks` candidate loop: candidates passing today's rules score
   into `sideCandidates` exactly as before (now tagged `strong`/`seam`).
   Candidates failing today's rules but passing the dashed-guide floor score
   into a separate `guideCandidates` list. Guide candidates use the STRICT
   side-seam gap (5% bbox, not the 2% strong-guide relaxation) and the same
   above-cradle side-seam discriminator; they do not touch the reject-reason
   flags, so reject messages on full misses are unchanged.
2. Winner selection: `sideCandidates` win as today. Only when that list is
   EMPTY does the best guide candidate commit, with `cradleCupTier:'guide'`.
3. `buildCupModel`: `if (cradleCupTop && cradleCupSide === side &&
   cradleCupTier !== 'guide')` — guide seams fall through to the existing
   ink-arc/cradle-row path (no cupModel field changes at all).
4. Landmark QA (`src/auto/detect/landmark-qa.js`): tier `guide` →
   `confidence: low` (which forces `reviewRequired`), `source: 'seamGuide'`
   (source class `detected`), plus an explanatory QA note.
5. Seeding (`src/auto/anchors/seed-anchors.js`): unchanged — it already
   seeds whenever `cradleCupTop/Bottom` exist and reads QA verdicts.
   The POM 6 `cradleCfFromCupSeam` rescue may now project from a guide-tier
   seam; it already seeds low+review, which is the correct posture.

## Interface Contract

- `detection.cradleCupTier: 'strong'|'seam'|'guide'|null` (new field beside
  `cradleCupTop/Bottom/Side`), surfaced in the debug payload.
- Contract rule `C7.seam-source` accepts `source === 'seam'` (trusted) OR
  `source === 'seamGuide' && reviewRequired === true` (mirrors
  `C6.seam-source`'s seamProjected clause).

## Data Model

None. No rule-JSON change, no persistence change.

## UI / Platform Impact

POM 7 rows that were REVIEW_ONLY may now draft with review flags; the
existing review UI (reviewNotes / low-confidence styling) already renders
this state. No new UI.

## Observability

- `detection.debug.layered.seams.cradleCupSeam` gains the tier.
- QA note on guide-seeded anchors: names the sparse-dash provenance so the
  TD knows why the line needs verification.

## Alternatives Considered

1. Score-mix guide candidates with today's candidates (rejected: can flip an
   existing winner on real demos → non-additive, golden churn, the exact
   failure mode of the 2026-07-09 prototype).
2. Let guide seams feed the cupModel but only when the cupModel has no ink
   arc (rejected: reintroduces the coupling conditionally; B3 exposure
   returns the moment ink tracing fails on a new sketch).
3. Decouple by removing seam input from cupModel entirely (rejected: demo3's
   committed seam is the cupModel's best bottom evidence today; removing it
   would regress POM 9/10 on the strongest images).
