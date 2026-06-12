# Glossary Entity Ownership Slice Design

## Goal

Implement the first Glossary V2 ownership slice by evolving the existing glossary persistence from legacy term memory into a user-owned Continuity Entity authority shape.

## Approved Architectural Choice

Use Option A and evolve the existing `glossary_terms` persistence seam.

Reasoning:

- The current persisted owner already lives in `public.glossary_terms`.
- Candidate pinning already creates rows in that table.
- Introducing a second authority seam in this slice would duplicate ownership semantics and widen scope.
- The main legacy concern is semantic drift from `normalized_key` and `display_label`, which can be retained as compatibility fields while new continuity-entity fields become primary.

## Scope

In scope:

- glossary domain model
- glossary persistence schema and row mapping
- glossary repository contracts and create/update behavior
- candidate pin flow changes required to create continuity-entity-shaped entries
- minimal API/read-model changes needed to expose the new fields

Out of scope:

- Appearance History
- Appearance Records
- match candidate persistence redesign
- ambiguous match resolution
- alias-based automatic matching
- Latent integration
- Reflections integration
- broad Glossary UI redesign

## Continuity Entity Model

The persisted glossary owner will expose these primary fields:

- `id`
- `type`
- `canonicalLabel`
- `aliases`
- `generalNote`
- `appearanceCount`
- `createdAt`
- `updatedAt`

Compatibility fields may remain:

- `normalizedKey`
- `displayLabel`
- `notes`

Compatibility fields must not define conceptual ownership.

## Field Mapping

- `canonicalLabel` is the primary label.
- `displayLabel` remains a compatibility mirror of `canonicalLabel`.
- `generalNote` is the primary entity note.
- `notes` remains a compatibility mirror of `generalNote`.
- `normalizedKey` remains an internal recognition/compatibility key.
- `appearanceCount` starts as a safe confirmed counter and remains provisional until Appearance History exists.

## Persistence Strategy

Add the following columns to `public.glossary_terms`:

- `type text not null default 'concept'`
- `canonical_label text not null`
- `aliases text[] not null default '{}'::text[]`
- `general_note text null`
- `appearance_count integer not null default 0`

Backfill existing rows:

- `canonical_label = display_label`
- `general_note = notes`
- `type = 'concept'`
- `aliases = '{}'`
- `appearance_count = 0`

Validation:

- `type` constrained to the approved initial set
- aliases normalized deterministically on write
- duplicate aliases removed deterministically after trimming and case-folding

## Repository Behavior

- Listing and lookup paths return continuity-entity fields.
- Rename behavior becomes canonical-label update behavior and keeps compatibility mirrors aligned.
- Candidate pinning creates a valid typed entity row with:
  - `type = 'concept'` as the safe transitional default
  - `canonicalLabel = candidate.display_label`
  - `aliases = []`
  - `generalNote = null`
  - `appearanceCount = 1` because pinning confirms the candidate appearance

If a pinned candidate maps to an existing glossary row, the repository will:

- reuse the existing row
- preserve existing entity fields
- ensure `appearanceCount` is at least `1` for the confirmed pinned appearance path only when the row is created by this flow

This slice will not infer additional historical appearances.

## Testing Strategy

- Add domain tests for type validation and update parsing.
- Add adapter tests for row mapping and alias normalization.
- Add repository tests for continuity-entity creation through pinned candidates.
- Update route tests only where the returned contract changes.

## Risks

- Existing consumers may still read `displayLabel` and `notes`; compatibility mirrors prevent regressions.
- Legacy `GlossaryTerm` naming remains in TypeScript for now, but the row shape and repository behavior become continuity-entity-first.

