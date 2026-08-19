# Exec Plan

## Goal

Move the accepted reference BOM interaction and print contract into the current
BOM without weakening offline, persistence, undo, or detection invariants.

## Scope

In scope:

- BOM-only save/autosave.
- Full-width reference table layout.
- Variant-owned multi-image Material Key.
- Upload, paste, drop, arrange, delete, undo, save/open, and print.
- Migration of existing Board-linked BOM callouts.

Out of scope:

- No-Lace style behavior.
- Translation APIs and cloud material catalogs.
- Measurement or POM contract changes.

## Risk Classification

Risk flags:

- Data model.
- Existing behavior.
- Weak proof around browser image intake and print.
- Multi-domain persistence, undo, autosave, and rendering.

Hard gates:

- No data loss during migration or autosave quota fallback.
- No BOM image may enter detection/POM state.

## Work Phases

1. Record ADR and story proof contract.
2. Add persisted image ownership and migration.
3. Add UI intake/manipulation and full-width table layout.
4. Add self-contained per-variant print sheets.
5. Extend focused browser and autosave tests.
6. Run build, focused suites, regression suites, and visual QA.

## Stop Conditions

Pause for human confirmation if the reference conflicts with an existing
production project in a way that would delete data, or if validation would
need to be weakened.
