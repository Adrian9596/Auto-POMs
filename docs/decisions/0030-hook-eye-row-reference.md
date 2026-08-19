# 0030 Hook-and-Eye Row Reference

Date: 2026-07-14

## Status

Accepted

## Context

The isolated measurement lab can observe repeated components at a back
hook-and-eye closure, but it currently reduces them to a continuous score. That
loses the discrete construction fact needed to apply a known POM rule. At the
same time, library medians are hidden whenever sketch scale is missing, even
though they remain useful review proposals.

## Decision

- Preserve a discrete Back Hook-and-Eye Row Count when OpenCV finds a regular
  vertical sequence of closure components.
- When back hook-and-eye construction and exactly three rows are detected,
  create a direct POM 12 Back Center Length proposal of 3.00 inches.
- The direct rule takes precedence over the unconditioned cohort median and
  names the matching 3-inch library peers as corroboration.
- If a POM 12 pixel path exists, the 3.00-inch reference may seed a back-only
  view scale for other back POM proposals. It never calibrates a front view.
- The OpenCV-derived reference remains `Review` until TD acceptance. It does
  not become `Auto` from synthetic peers.
- An eligible construction-library median remains visible as a `Review`
  proposal when sketch scale is missing. Missing scale makes the sketch layer
  unavailable; it does not erase an independently sourced library proposal.
- While construction is unresolved, an available general-library median may
  appear as a low-confidence `Review` baseline. This does not select or borrow
  a construction cohort and is replaced when stronger construction-specific
  evidence becomes available.
- `Insufficient` is reserved for cases where no numeric proposal source is
  available or construction remains unresolved.

## Alternatives Considered

1. Keep only a continuous repeat score. Rejected because it cannot support the
   confirmed three-rows-to-3.00-inch rule.
2. Require pixel scale before showing any number. Rejected because that hides
   valid, clearly labelled library proposals.
3. Treat the direct rule as Auto. Rejected because row miscount and synthetic
   corroboration still require TD review.
4. Render an empty table while OpenCV initializes. Rejected because the general
   library can provide an explicitly labelled, reversible review baseline.

## Consequences

Positive:

- The tool uses a strong construction observation immediately.
- The measurements table no longer appears empty when a compatible library
  proposal exists.
- POM 12 becomes a traceable bridge from construction evidence to back-view
  measurement proposals.

Tradeoffs:

- Only the confirmed three-row mapping is encoded. Other row-count mappings
  remain unresolved until TD defines them.
- Row counting needs empirical tests against sketch noise and decorative
  components.

## Follow-Up

- Ask TD whether any other detected row counts have governed POM 12 mappings.
- Validate row-count precision on more back hook-and-eye sketches.
