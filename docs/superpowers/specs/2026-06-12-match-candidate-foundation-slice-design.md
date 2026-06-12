# Match Candidate Foundation Slice Design

## Goal

Implement the foundational Glossary V2 candidate model required by the approved Match and Resolution canon so the repository can express canonical candidate classes without adding any matching or resolution behavior.

## Canon Authority

This slice is governed by:

- `docs/v2-build/glossary/Glossary-V2-Continuity-Entity-Model.md`
- `docs/v2-build/glossary/Glossary-V2-Candidate-And-Match-Lifecycle.md`
- `docs/v2-build/glossary/Glossary-V2-Persistence-and-Lifecycle-Contract.md`
- `docs/v2-build/glossary/Glossary-V2-Match-And-Resolution-Contract.md`

These documents are authoritative. This slice does not redesign or reinterpret them.

## Current Problem

The repository currently persists generic glossary candidate lifecycle state, but it does not persist canonical Glossary V2 candidate classification.

Current effective candidate model:

- `candidate`

Required canonical candidate classes for future match ownership:

- `match_candidate`
- `ambiguous_match_candidate`
- `new_candidate`

The repository therefore cannot yet distinguish:

- an observed element with one proposed continuity entity
- an observed element with multiple plausible continuity entities
- an observed element with no current continuity match

## Scope

In scope:

- glossary candidate domain types
- glossary candidate persistence
- glossary candidate repository contracts
- glossary candidate HTTP contracts
- glossary candidate API read models
- tests
- migration if required

Out of scope:

- normalized matching
- alias matching
- ambiguity generation
- ambiguity resolution
- user resolution flow
- LLM matching
- morphology handling
- appearance creation changes
- glossary relationships
- latent integration

## Candidate Model

Introduce canonical candidate classification with exactly these values:

- `match_candidate`
- `ambiguous_match_candidate`
- `new_candidate`

No additional candidate classes are introduced in this slice.

Each persisted glossary candidate will support these fields:

- `candidateClass`
- `proposedEntityIds`

Behavioral invariants:

- `match_candidate` requires exactly one proposed entity id
- `ambiguous_match_candidate` requires more than one proposed entity id
- `new_candidate` requires zero proposed entity ids

This slice only establishes storage and contract support for those invariants. It does not determine how proposed entity ids are discovered.

## Persistence Design

Evolve the existing `public.glossary_candidate_states` seam rather than introducing a second candidate table.

Add:

- `candidate_class text not null default 'new_candidate'`
- `proposed_entity_ids uuid[] not null default '{}'::uuid[]`

Backfill strategy:

- existing rows become `candidate_class = 'new_candidate'`
- existing rows become `proposed_entity_ids = '{}'::uuid[]`

Constraint strategy:

- `candidate_class` constrained to the three approved values
- `proposed_entity_ids` always stored as an array, never null
- repository and HTTP parsing enforce the allowed candidate-class/entity-id shape

This keeps current extraction and candidate upsert paths working while moving stored ownership into the canonical foundation shape.

## Repository Design

`GlossaryCandidate` becomes canon-aware by exposing:

- `candidateClass`
- `proposedEntityIds`

Repository behavior for this slice:

- list/get candidate paths return the new fields
- create/upsert candidate paths preserve those fields
- existing extraction-driven creation defaults to:
  - `candidateClass = 'new_candidate'`
  - `proposedEntityIds = []`
- lifecycle mutation paths preserve candidate class and proposed entity references unless explicitly changed in future work

This slice does not add repository operations for resolving a match, choosing among ambiguous candidates, or creating appearance records from candidate classification.

## HTTP and API Design

Expose `candidateClass` and `proposedEntityIds` through existing candidate read models.

Minimal API changes:

- candidate GET/read surfaces include the new fields
- candidate write contracts support the new fields where candidate creation/update payloads already exist or are already parsed in the current seam

This slice does not redesign route structure or add new endpoints.

## Migration Safety

The migration is additive and backward-safe:

- old rows receive canonical defaults
- existing code paths can continue creating candidates by defaulting to `new_candidate`
- no continuity entity ownership changes occur
- no appearance history behavior changes occur

## Testing Strategy

Add failing tests first for:

- domain parsing of candidate class and proposed entity ids
- adapter mapping of candidate row fields
- repository create/read behavior for persisted class and proposed entity ids
- API read-model exposure of the new fields

Validation commands for completion:

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

`npm run build` must be used so repository build logging remains authoritative.

## Risks

- Existing candidate code is still legacy-shaped around lifecycle state rather than canon class, so the slice must be careful to add classification without accidentally redefining lifecycle behavior.
- Current candidate extraction does not know about existing entity proposals, so defaults to `new_candidate` must remain explicit and stable.
- Future matching work will still need dedicated generation logic, but it should not need to redesign persistence again after this slice.

## Expected Outcome

After this slice:

- canonical candidate classes exist in the repository
- candidate persistence supports canonical class plus proposed entity references
- candidate contracts and read models expose those fields
- no matching logic, ambiguity logic, or appearance logic is introduced

## Implementation Boundary

This is a foundation slice only.

It prepares the repository for future Match Candidate and Ambiguous Match Candidate generation, but it does not implement those generation systems.
