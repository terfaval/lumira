# LAT-R03A - Repository-Owned Authority Evaluation Design

## Status

Approved implementation design for `LAT-R03A`.

This document is subordinate to:

* `docs/constitution/clarifications/LATENT_AUTHORITY_EVALUATION_CONSTITUTIONAL_DESIGN.md`
* the Latent V2 constitutional corpus
* active repository reality

It does not replace doctrine.

It defines the implementation shape that realizes the doctrine without introducing new institutional responsibility.

---

## Goal

Implement a repository-owned, read-only Authority Evaluation institution for Latent V2 that answers exactly one question:

> Does an already selected Accepted Authority and an already composed Candidate Authority represent constitutionally identical authority, or materially changed authority?

`LAT-R03A` realizes only the sameness judgment.

It does not implement lifecycle consequence, staleness, reassessment, invalidation behavior, reuse behavior, regeneration, or supersession.

---

## Repository Grounding

Current repository reality already provides the key primitives required by this slice:

* `LatentAuthorityProvenance` exists in [src/domain/latent-v2/types.ts](/abs/path/C:/mira/src/domain/latent-v2/types.ts)
* accepted generation runs already persist `authorityProvenance` and `authorityFingerprint`
* canonical authority serialization already exists as `canonicalizeAuthorityProvenance(...)` in [src/cognition/latent-v2/opportunity-constructor/provenance.ts](/abs/path/C:/mira/src/cognition/latent-v2/opportunity-constructor/provenance.ts)
* authority fingerprint derivation already exists as `buildAuthorityFingerprint(...)`
* repository authority seams already exist in [src/domain/latent-v2/contracts.ts](/abs/path/C:/mira/src/domain/latent-v2/contracts.ts) and [src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts](/abs/path/C:/mira/src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts)

This means `LAT-R03A` should not invent a second authority identity model.

It should build a narrow comparison seam on top of the existing Authority Provenance and canonicalization primitives.

Before implementation shape is finalized, `LAT-R03A` must inspect whether those pure canonicalization and fingerprint primitives should be extracted into a layer-neutral authority module so that both cognition and repository evaluation may lawfully depend on the same constitutional identity primitive.

---

## Options Considered

### Option 1 - Detached Authority-Evidence Contract

```ts
evaluateAuthoritySameness(
  acceptedAuthorityEvidence,
  candidateAuthorityEvidence,
)
```

This keeps the constitutional boundary explicit:

```text
Accepted Authority Selection
        ->
Accepted Authority Evidence projection
        ->
Authority Evaluation
```

Advantages:

* keeps selection separate from evaluation
* prevents lifecycle and run-state leakage into the evaluator
* preserves accepted versus candidate roles clearly
* supports direct symmetry and determinism tests
* keeps canonicalization repository-owned

Tradeoff:

* requires explicit projection helpers outside the evaluator

### Option 2 - Raw Authority Provenance Inputs

```ts
evaluateAuthoritySameness(
  acceptedAuthorityProvenance,
  candidateAuthorityProvenance,
)
```

Advantages:

* minimal input surface
* strong doctrinal narrowness

Tradeoff:

* weaker evidence-language boundary
* less explicit auditability around persisted versus supplied evidence
* thinner future repository review surface

### Option 3 - Selected Generation Run Input

```ts
evaluateAuthoritySameness(
  acceptedGenerationRun,
  candidateAuthorityEvidence,
)
```

This is not recommended.

It invites accidental dependence on:

* run status
* timestamps
* context provenance
* execution provenance
* invalidation or lifecycle-adjacent fields

That would blur the institutional split the governing doctrine just established.

### Recommendation

Use **Option 1**.

`LAT-R03A` should implement a detached authority-evidence contract and keep generation-run handling strictly upstream in explicit projection helpers.

---

## Approved Design

### Core Contract

The evaluator contract should be narrow and detached from run selection:

```ts
evaluateAuthoritySameness(
  acceptedAuthorityEvidence,
  candidateAuthorityEvidence,
): AuthorityEvaluationResult
```

The evaluator must not accept a generation-run domain object directly.

It must receive only lawful evidence required to represent normalized Authority Provenance identity.

### Evidence Shape

The exact type names may follow existing repo conventions, but the approved conceptual model is:

```ts
type AcceptedAuthorityEvidence = {
  authorityProvenance: LatentAuthorityProvenance;
  authorityFingerprint?: string;
};

type CandidateAuthorityEvidence = {
  authorityProvenance: LatentAuthorityProvenance;
  authorityFingerprint?: string;
};
```

The two evidence types may remain structurally identical, but their institutional roles should stay visible at the method boundary:

```ts
evaluateAuthoritySameness(
  accepted: AcceptedAuthorityEvidence,
  candidate: CandidateAuthorityEvidence,
)
```

These evidence shapes must exclude:

* generation-run status
* `supersededAt`
* invalidation state
* `contextProvenance`
* `executionProvenance`
* manifestations
* object lookup inputs
* reuse state
* lifecycle policy state

### Outcome Shape

The evaluator must expose an explicit constitutional result type:

```ts
type AuthoritySamenessOutcome =
  | "constitutionally_identical"
  | "materially_changed";
```

The result should remain as narrow as lawful consumers and constitutional review actually require.

One lawful narrow form is:

```ts
type AuthorityEvaluationResult = {
  outcome: AuthoritySamenessOutcome;
  acceptedFingerprint: string;
  candidateFingerprint: string;
};
```

Returning full canonical evidence is optional, not mandatory.

The exact internal evidence payload can vary, but it must remain:

* lifecycle-free
* verification-friendly
* narrower than a general normalization service

Boolean-only APIs such as `isSame: boolean` are not preferred.

---

## Projection Boundary

Two explicit one-way projection helpers should exist outside the evaluator:

```ts
projectAcceptedAuthorityEvidence(
  selectedGenerationRun,
): AcceptedAuthorityEvidence
```

```ts
projectCandidateAuthorityEvidence(
  candidateAuthorityProvenance,
): CandidateAuthorityEvidence
```

These helpers may return structurally similar shapes, but they should not be collapsed into a generic:

```ts
toAuthorityEvidence(anything)
```

The generic form is too permissive and would make it easier for later code to construct evaluator inputs from constitutionally unrelated sources.

The accepted-side projection may consume an already selected generation run.

The candidate-side projection may consume already composed candidate authority provenance.

Neither projection may select accepted authority or compose candidate authority.

Projection placement should be decided explicitly in the implementation plan.

Lawful placements include:

* a domain-level pure projection module
* an authority-specific adapter module
* a repository-adjacent mapper module

Projection helpers must not:

* perform repository queries
* perform accepted-authority selection
* silently repair invalid evidence
* regenerate persisted fingerprint data in a way that hides stored evidence drift

---

## Canonicalization Ownership

Canonical normalization is repository-owned evaluation mechanics.

Callers must not be responsible for producing pre-normalized comparison strings.

The evaluator must use the existing canonical authority semantics.

If the current canonicalization primitive is still located inside a cognition-owned constructor module, implementation must extract or expose that pure primitive through a layer-neutral authority module rather than introducing a repository-to-cognition dependency.

The target dependency shape is:

```text
cognition constructor
        ->
shared authority primitive
        <-
repository evaluator
```

Not:

```text
repository evaluator
        ->
cognition constructor module
```

The evaluator must then internally canonicalize received authority provenance using that layer-neutral primitive:

* `canonicalizeAuthorityProvenance(...)`

This preserves the doctrinal rule:

```text
Cognition composes authority.
Repository canonicalizes and evaluates authority.
```

Normalization must:

* operate only on `LatentAuthorityProvenance`
* remain deterministic
* remove only representational differences
* preserve all constitutionally meaningful authority information
* produce equivalent canonical forms for constitutionally identical authority

The implementation plan must inventory existing order semantics before changing collection handling.

It must not assume up front that every collection is order-insensitive.

---

## Fingerprint Handling

Optional fingerprints are allowed as derivative evidence, but the evaluator must not trust caller-supplied fingerprints automatically.

The required rule is:

```text
caller-supplied fingerprint
        =
derivative evidence only
```

The evaluator must either:

* recompute fingerprints from the supplied `authorityProvenance`; or
* verify that any supplied fingerprint matches the recomputed value

Mismatch behavior must be explicit:

```text
supplied fingerprint absent
        ->
derive internally

supplied fingerprint present and valid
        ->
continue

supplied fingerprint present and mismatched
        ->
explicit evidence validation error
```

A supplied fingerprint mismatch is invalid evidence.

It must not be treated as:

* `constitutionally_identical`
* `materially_changed`
* silent fallback
* lifecycle signal

It must not take this path:

```text
fingerprint present
        ->
skip canonicalization
        ->
compare caller values
```

That would hand part of the identity judgment back to the caller.

If existing fingerprint semantics remain lossless over canonical authority provenance identity, fingerprint equality may be used as the concrete comparison mechanism or as corroborating evidence.

If that proof is not sufficient, the evaluator must compare canonical authority provenance directly.

---

## Evaluation Flow

The approved evaluator flow is:

```text
accepted evidence
        ->
canonicalize authority provenance
        ->
derive or verify fingerprint

candidate evidence
        ->
canonicalize authority provenance
        ->
derive or verify fingerprint

compare canonical identity
        ->
return two-outcome result
```

The returned canonical evidence is not required by doctrine, but it is recommended because it improves:

* focused verification
* repository reviewability
* transparency of what was actually compared

It must not contain lifecycle instruction.

Exposing canonical evidence in the repository result remains optional.

The evaluator must not become a general-purpose normalization service for callers.

---

## Behavioral Guarantees

### Determinism

Equivalent lawful inputs must always produce the same result.

The evaluator must not depend on:

* current time
* caller workflow
* property insertion order
* database row order
* prior evaluation history

### Symmetry

Identity judgment must be symmetric:

```text
same(A, B) = same(B, A)
```

Accepted and Candidate remain institutionally different roles, but the sameness relation must not depend on argument order.

### Read-Only Behavior

The evaluator must perform no writes.

It must not mutate:

* generation runs
* invalidation events
* manifestations
* opportunities
* lifecycle state
* evaluation history

### Lifecycle Separation

Neither substantive outcome carries lifecycle consequence by itself.

Specifically:

* `constitutionally_identical` does not authorize reuse
* `materially_changed` does not classify staleness
* neither result triggers reassessment
* neither result triggers regeneration

---

## Non-Evaluable Handling

Accepted authority absence is not a third substantive outcome.

`LAT-R03A` may choose either of these lawful shapes:

* require accepted evidence input and keep absence outside the evaluator entirely
* support a separate non-evaluable branch for accepted-authority absence

The preferred implementation direction is the narrower one:

* selection stays upstream
* projection happens upstream
* evaluator receives lawful accepted evidence only

If a non-evaluable branch is still implemented for repository ergonomics, it must remain separate from the two substantive outcomes.

---

## Testing Scope

Focused tests should cover:

### Contract

* exactly two substantive outcomes
* accepted and candidate roles remain explicit
* no lifecycle fields in result

### Identity Cases

* identical authority
* one authoritative field changed
* structurally different authority
* missing authoritative field

### Excluded Surfaces

Prefer projection-boundary tests proving the evaluator cannot consume:

* context provenance
* execution provenance
* manifestations
* invalidation state
* reuse state

### Normalization

* stable object-key ordering
* collection-order behavior only where current provenance contract and canonical semantics already make order irrelevance lawful
* null versus absence behavior according to existing provenance contract

### Fingerprint

If fingerprints are used:

* same authority produces same fingerprint
* authority change produces different fingerprint
* evaluator verifies or recomputes caller-supplied fingerprint

### Determinism And Symmetry

* repeated evaluation returns same outcome
* `evaluate(A, B)` matches `evaluate(B, A)`

### Read-Only

* no repository mutation seam is called

### Error Behavior

* malformed accepted evidence
* malformed candidate evidence
* canonicalization or verification failure
* supplied fingerprint mismatch

Failure must not be converted into either substantive outcome.

---

## Likely Touched Files

The smallest likely implementation surface is:

* [src/domain/latent-v2/types.ts](/abs/path/C:/mira/src/domain/latent-v2/types.ts)
  for new evidence and result types
* [src/domain/latent-v2/contracts.ts](/abs/path/C:/mira/src/domain/latent-v2/contracts.ts)
  for the repository evaluation seam
* a new or extracted layer-neutral authority primitive module under `src/domain/latent-v2/`
  if repository evaluation cannot lawfully depend directly on the current cognition-owned canonicalizer location
* [src/cognition/latent-v2/opportunity-constructor/provenance.ts](/abs/path/C:/mira/src/cognition/latent-v2/opportunity-constructor/provenance.ts)
  as the current source of canonicalization/fingerprint semantics that may need extraction or re-export
* [src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts](/abs/path/C:/mira/src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts)
  for the repository-owned implementation
* [src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts](/abs/path/C:/mira/src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts)
  for focused behavior coverage
* `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
* `docs/STABILIZATION_LEDGER.md`

Additional narrow helper placement is acceptable if it stays outside lifecycle consumers.

---

## Non-Goals

`LAT-R03A` must not implement:

* Accepted Authority Selection
* candidate authority composition
* Opening integration
* reuse resolution
* invalidation creation or clearing
* staleness determination
* reassessment policy
* regeneration
* supersession
* no-change persistence
* lifecycle policy
* semantic or threshold-based authority comparison

Unused-but-verified is acceptable.

It is better for the evaluator to exist without production lifecycle wiring than to absorb later institutions prematurely.

---

## Recommended Next Step

After this spec is reviewed, the next artifact should be a narrow implementation plan for:

* domain types
* projection helpers
* repository evaluation method
* focused tests
* minimal documentation updates

No broader lifecycle integration should enter that plan.
