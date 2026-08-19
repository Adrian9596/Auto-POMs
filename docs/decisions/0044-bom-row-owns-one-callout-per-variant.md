# 0044 BOM row owns one Material Callout per variant

Date: 2026-08-16

## Status

Accepted

## Context

The BOM Material Key could already place a callout, drag its label or target,
and add a second leader. Those interactions were implicit: there was no visible
Select tool, Add Callout disarmed after one placement, and a deleted BOM row
left a red orphan callout. The TD requires callouts and the BOM table to remain
one synchronized representation of the same material record while still
supporting rapid annotation.

The reference HTML keeps orphan callouts for later relinking. That behavior is
deliberately overridden here by the TD's decision that the table row owns the
callout and that the two surfaces must remain consistent.

## Decision

- Each BOM row owns at most one Material Callout on each applicable variant.
- A Material Callout derives its number and material description from its BOM
  row. Only the label position and leader targets are independently editable.
- Multiple material locations for the same row use multiple leader targets on
  the same callout, not duplicate callouts.
- The Material Key exposes three mutually exclusive tools: Select, Add
  Callouts, and Add Leaders.
- Add Callouts stays active, advances through visible rows without callouts,
  and returns to Select when all visible rows are covered.
- Add Leaders stays active for the selected callout until Select or Escape.
- A row's callout is removed in the same undoable change when the row is
  deleted or its scope stops applying to that callout's variant.
- Expanding a row's scope never invents a callout position on the new variant.

## Alternatives Considered

1. Keep implicit canvas selection and one-shot Add buttons. Rejected because
   the active interaction is invisible and repetitive for a full BOM.
2. Allow duplicate callouts for one row. Rejected because one material would
   acquire competing numbers and labels; multiple leaders express the intended
   many-location relationship without duplicating the BOM identity.
3. Keep orphan callouts after row deletion. Rejected because the TD requires
   the Material Key and BOM table to remain synchronized.

## Consequences

Positive:

- TDs can annotate a whole BOM in one continuous pass and adjust geometry
  afterward.
- Table edits, numbering, deletion, and scope changes cannot leave conflicting
  callout identities.
- The active canvas interaction is visible and consistent.

Tradeoffs:

- Deleting a row or narrowing its scope also removes linked placement work;
  Undo is the recovery path.
- A material used on both Solid and Lace still needs an explicit placement on
  each variant because the images and coordinates are variant-owned.

## Follow-Up

- Keep the focused BOM browser suite responsible for tool modes, batch
  advancement, duplicate prevention, leader placement, and synchronized undo.
