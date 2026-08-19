# 0028 Evidence-Gated Size L Workbench

Date: 2026-07-13

## Status

Accepted

## Context

The isolated lab exposed detailed evidence and a separate finalization table,
but the TD had to move between several sections to understand construction,
inspect the sketch, and resolve Size L. The interface also treated every new
row as unresolved even when all required evidence gates had passed. That made
the fastest safe path harder to see and obscured why some values required TD
attention.

## Decision

- Present the lab as one evidence-first workbench: Construction and evidence
  health, the analyzed sketch, and the 16 Size L rows are visible together.
- Keep the versioned POM 1–16 contract. Reference mockups define layout and
  interaction, not replacement POM names or numbering.
- Derive every Evidence Health score from the active analysis; no score is a
  fixed demo value.
- A row is `Auto` only when its score is at least 85 and the required view,
  anchor pair, view-local scale, construction-compatible cohort, and
  contradiction checks all pass.
- A numeric row scoring 55–84 is `Review`. A row below 55, or one missing a
  required view, anchor pair, or scale, is `Insufficient` and has no generated
  final value.
- `Auto` creates an accepted provisional Size L decision immediately. The TD
  may still edit it before locking the Final Size L Set.
- `Review` requires the TD to accept or override the proposal.
  `Insufficient` requires a TD value or a No Data decision.
- Editing a value directly creates a `TD Confirmed` decision while preserving
  the original suggestion and evidence trace for audit.
- Construction chips distinguish `Detected`, `Uncertain`, and `Not detected`;
  an unselected chip must not be ambiguous about whether it was evaluated.
- Front and back scale hypotheses remain independent. An inferred scale is
  visibly labelled as a hypothesis, not a fact.

This decision refines the isolated-lab interaction described by ADR 0027. The
TD still owns the final lock and may change any provisional Auto decision.

## Alternatives Considered

1. Keep evidence, suggestions, and finalization in separate tables. Rejected
   because it makes the TD reconstruct one decision from several distant UI
   sections.
2. Automatically accept every high percentage. Rejected because a score alone
   cannot replace mandatory evidence gates.
3. Display fixed confidence percentages from the visual mockup. Rejected
   because decorative scores would not prove that the sketch was analyzed.

## Consequences

Positive:

- The workbench makes the path from sketch evidence to final Size L visible in
  one screen.
- Strong rows require no redundant click while uncertain rows remain clearly
  TD-owned.
- Direct edits remain auditable against the suggestion that preceded them.

Tradeoffs:

- Confidence scoring and status gates become an explicit product contract that
  requires deterministic tests.
- Synthetic library peers can demonstrate the workflow but still cannot count
  as approved production accuracy evidence.

## Follow-Up

- Validate the status distribution against real sketches and governed peers.
- Revisit the 85/55 thresholds only with recorded benchmark evidence.
