# 0019 Require Explicit Style Version Identity

Date: 2026-07-11

## Status

Accepted

## Context

Library Phase L1 must link saved projects, Measurement Spec workbooks, and
images without merging evidence from different style revisions. Existing
sources may expose only a style code, while filenames, folders, customers, and
seasons are inconsistent provenance rather than governed identity fields.

## Decision

One candidate style version is identified by the pair `style_id +
style_version`. Both fields must be explicit. A source missing either field
remains pending TD confirmation and cannot be linked automatically.

Customer, season, file name, and folder path may be retained as provenance but
do not participate in canonical identity.

When a historical source lacks either identity field, a TD may supply a
versioned identity-decision record keyed by the source's exact SHA-256
fingerprint. The record contains the confirmed `style_id`, `style_version`,
reviewer, and review date. It applies only while the fingerprint matches and
resolves identity only; it does not approve the source evidence.

Sources with the same explicit identity are linked into one pending evidence
bundle. If linked sources disagree, every observation and source fingerprint is
preserved, the disagreement is a blocking conflict, and the bundle cannot be
approved until a TD resolves it. The library never selects the newest value or
averages conflicting values automatically.

## Alternatives Considered

1. Treat `style_id` alone as identity.
2. Infer a version from file names or folder paths.
3. Include customer or season in every identity key.

## Consequences

Positive:

- Different revisions cannot be silently merged.
- Linking rules are deterministic and auditable.
- Source organization changes do not change identity.
- Conflicts remain visible without fragmenting one style version into multiple
  records.

Tradeoffs:

- Existing projects with only `styleId` remain unresolved until a TD supplies
  the explicit version.
- Phase L1 needs a review path for incomplete identity.
- A linked bundle can remain blocked even when every source parsed correctly.
- Editing or replacing a confirmed source requires a new identity decision.

## Follow-Up

- Add importer and linking tests for missing, matching, and conflicting
  identity fields.
- Define and validate the identity-decision file schema.
- Add an explicit `styleVersion` field to saved project data in a later
  user-visible workflow change before expecting touchless linking.
