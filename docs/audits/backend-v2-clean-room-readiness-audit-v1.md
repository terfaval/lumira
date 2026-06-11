# Backend V2 Clean-Room Readiness Audit v1

Date: 2026-06-11 UTC
Status: Audit complete
Scope: Repository readiness for a clean-room Backend V2 implementation

## Ticket Protocol

### Restated goal

- Determine whether the current repository can accept Backend V2 implementation directly from V2 canon.
- Identify remaining backend structures and hidden assumptions that still encode pre-clean-room thinking.
- Assess whether the current database should be reused or reset for Backend V2.
- Define the minimum pre-build cleanup actions required before the first Backend V2 sprint.

### Touched files

- New: `docs/audits/backend-v2-clean-room-readiness-audit-v1.md`

### Implementation steps

1. Read repository operating guidance and clean-room authority documents.
2. Read Backend V2 canonical architecture and repository blueprint documents.
3. Inventory current backend domain models, repositories, API routes, runtime assembly, and Supabase migrations.
4. Classify V1 contamination patterns, database readiness, and required clean-room actions.
5. Record the audit in this file.

### Acceptance criteria

- Remaining V1 backend structures are identified with file, purpose, risk, and blocker status.
- Hidden V1 assumptions are made explicit.
- Database reuse vs reset is analyzed without execution.
- Repository readiness is assessed against direct Backend V2 implementation.
- The audit ends with exactly one biggest contamination source and a defense.

### Testing / validation plan

- Documentation and source audit only.
- No code changes outside this report.
- No schema execution, migrations, tests, or builds were run because this ticket requested analysis only.

### Rollback plan

- Delete this audit file if the owner rejects the audit framing.

## Authority Used

- `docs/canon/backend-v2/LUMIRA_BACKEND_V2_CANON.md`
- `docs/canon/LUMIRA_BACKEND_V2_CONCEPTUAL_ARCHITECTURE.md`
- `docs/canon/clean-room-technical-constitution.md`
- `docs/canon/clean-room-repo-blueprint-v1.md`
- `docs/DECISIONS.md`

## Executive Assessment

The repository is not ready for direct Backend V2 implementation.

The stack, folder layout, and some naming are clean-room compatible. The backend architecture is not. The current implementation is built around a generic `reflective_object` substrate plus object-association APIs, user-wide viewport assembly, and temporary Observation V2 projection into a pre-existing row/fragment persistence shape. That means the first Backend V2 sprint would immediately inherit non-canonical persistence, route, and runtime gravity.

Practical readiness judgment: low.

The repo is closer to a partially renamed intermediate backend than to a clean-room V2 foundation.

## 1. Remaining V1 Backend Structures

| Finding | File(s) | Purpose | Risk | Blocks clean-room V2? | Why it matters |
| --- | --- | --- | --- | --- | --- |
| Generic reflective-object root | `supabase/migrations/20260524_0001_reflective_objects.sql`, `src/domain/reflective-objects/types.ts`, `src/domain/reflective-objects/http-contract.ts`, `src/infrastructure/supabase/repositories/reflective-object-supabase-repository.ts` | Defines the primary persistence and API root for all upstream material | Critical | Yes | Backend V2 canon starts from explicit domain layers anchored in dream material, not a generic entity bucket that mixes `dream`, `journal_entry`, `memory`, and `reflective_note`. |
| Observation V2 written through temporary legacy-shaped adapter | `src/infrastructure/persistence/observation-v2-write-store.ts`, `src/cognition/observation/scene-discovery-projection.ts`, `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`, `app/api/reflective-objects/[id]/observations/route.ts`, `supabase/migrations/20260524_0003_observations.sql` | Persists Observation V2 output by projecting it into `observations` + `observation_fragments` rows | Critical | Yes | The repo still treats V2 bundle output as something to flatten into an older summary/fragment persistence contract. The adapter explicitly calls itself temporary and compatibility-oriented. |
| Object-association thread model | `supabase/migrations/20260524_0005_reflective_threads.sql`, `src/domain/threads/types.ts`, `src/domain/threads/http-contract.ts`, `src/infrastructure/supabase/repositories/thread-supabase-repository.ts` | Stores threads as user-level records plus associations to reflective objects and glossary terms | High | Yes | Threads are implemented as generic cross-links around objects rather than as a canonical continuity structure emerging from dream-derived material and later reflection. |
| Object-association response model | `supabase/migrations/20260524_0006_reflective_responses.sql`, `src/domain/responses/types.ts`, `src/domain/responses/contracts.ts`, `src/domain/responses/http-contract.ts` | Stores reflections/responses and links them back to objects, threads, and openings | High | Yes | Responses are modeled as another generic entity with object associations instead of as the user reflection layer in the canonical flow. |
| Opening layer built on generic source arrays | `supabase/migrations/20260524_0008_openings.sql`, `src/domain/openings/types.ts` | Stores openings with arrays of `source_objects`, `source_observations`, `source_threads`, `source_responses` | High | Yes | This preserves a graph-of-linked-entities shape rather than a clean V2 layer boundary with explicit upstream ownership. |
| Glossary candidate funnel keyed to reflective objects and observation fragments | `supabase/migrations/20260524_0004_glossary_memory.sql`, `src/domain/glossary/types.ts`, `src/domain/glossary/contracts.ts` | Stores glossary terms, glossary candidate states, and associations | High | Yes | The candidate-state funnel is built on object-local recurrence and fragment IDs, not on a V2-native continuity memory contract. |
| User-wide viewport/runtime assembly as backend read gravity | `src/reflective-space/composition/compose-reflective-space-viewport.ts`, `app/api/reflective-space/viewport/route.ts`, `src/runtime/contracts/runtime-boundary.ts`, `src/runtime/types.ts` | Builds backend read models by listing all user objects, threads, glossary terms, and openings, then picking a center object | High | Yes | Runtime gravity is still "user-wide object collection + chosen center object," not "Backend V2 layer flow from dream evidence through bounded downstream layers." |
| Capture flow creates dream as reflective object, then immediately projects Observation V2 into legacy-shaped persistence | `app/capture/page.tsx` | Current live intake path | Critical | Yes | The first real backend write path already commits the contamination pattern: create generic object, generate V2 bundle, flatten through temporary adapter, redirect to object-oriented routes. |
| Active migration-governance docs in repo root docs tree | `docs/backend-v2-migration/Backend-V2-Transformation-Map.md` and sibling files | Ongoing planning authority around "migration" | Medium | Indirectly yes | Even if not executable code, these files normalize migration framing in a repository that the accepted decisions now define as clean-room first. |
| Placeholder/prototype reflective-space composition still present | `src/reflective-space/composition/get-reflective-space-viewport.ts` | Ephemeral placeholder assembly | Medium | No, but misleading | Not the main blocker, but it increases ambiguity by leaving non-authoritative prototype backend assembly alongside active read paths. |

## 2. Hidden V1 Assumptions

### A. Entity-centric assumption

The strongest hidden assumption is that the system's primary ontology is a generic reflective entity.

Evidence:

- `src/domain/reflective-objects/types.ts` defines `ReflectiveObjectType = "dream" | "journal_entry" | "memory" | "reflective_note"`.
- `supabase/migrations/20260524_0001_reflective_objects.sql` makes `reflective_objects` the root table.
- `src/reflective-space/composition/compose-reflective-space-viewport.ts` assembles the read model by calling `listByUser()` on reflective objects first.

Why this is V1 contamination:

Backend V2 canon is domain-first and dream-material-first. A generic entity bucket becomes the hidden owner of upstream truth, downstream associations, and route design.

### B. Dream-centric and object-centric narrowing

The current live path still assumes "one captured dream becomes one center object and downstream layers hang off it."

Evidence:

- `app/capture/page.tsx` generates `reflectiveObjectId`, creates a reflective object with `objectType: "dream"`, persists observations against it, and redirects to `/objects/[objectId]`.
- `src/domain/observation/types.ts` and `src/domain/observation/v2-runtime.ts` still anchor observations to `reflectiveObjectId`.

Why this is V1 contamination:

This is narrower than Backend V2's explicit layer model and still couples dream intake to a generic object-centered route/persistence contract.

### C. Interpretation-era flattening assumption

Observation V2 output is treated as material that must be flattened into summary plus fragments before the repository can own it durably.

Evidence:

- `src/cognition/observation/scene-discovery-projection.ts` converts scenes and scene observations into `CreateObservationInput.fragments`.
- `src/infrastructure/persistence/observation-v2-write-store.ts` labels itself `TemporaryObservationV2WriteStore`.
- `app/api/reflective-objects/[id]/observations/route.ts` says the route still accepts a "legacy CreateObservationInput write shape directly."

Why this is V1 contamination:

It preserves the older persistence owner and demotes V2 bundle structure to an adapter input.

### D. Legacy cognition graph assumption

Latent and openings store source lineage as arrays of linked IDs across objects, observations, glossary terms, threads, and responses.

Evidence:

- `supabase/migrations/20260524_0007_latent_scaffold.sql` stores `source_reflective_objects`, `source_observations`, `source_glossary_terms`, `source_threads`, `source_responses`.
- `supabase/migrations/20260524_0008_openings.sql` repeats the same pattern for openings.

Why this is V1 contamination:

This is a graph-linking strategy built before the V2 layer boundaries are stable. It encourages later layers to depend on a generic cross-link mesh instead of a clearer ownership chain.

### E. Old continuity assumption

Thread and response contracts mix continuity semantics with UI visibility and soft workflow vocabulary.

Evidence:

- `src/domain/threads/types.ts` uses states `active`, `dormant`, `quiet`, `archived` and visibilities `foreground`, `ambient`, `hidden`.
- `src/domain/responses/types.ts` uses response states `active`, `quiet`, `archived` and visibilities `foreground`, `ambient`, `hidden`.

Why this is V1 contamination:

Canonical V2 boundaries distinguish layer purpose from surface posture. Here, backend state vocabulary is already fused with presentation-oriented prominence semantics.

### F. User-wide repository-first read assumption

Backend reads are organized around "list everything for the user, then trim by viewport guardrails."

Evidence:

- `src/reflective-space/composition/compose-reflective-space-viewport.ts` loads user-wide objects, threads, glossary rows, and opening rows in parallel, then chooses a `centerObjectId`.

Why this is V1 contamination:

That is a frontend/feed-style assembly gravity, not direct implementation from canonical Backend V2 domain boundaries.

## 3. Database Readiness

### Can the current database be reused?

Not cleanly for domain data.

The current schema is internally consistent, but it is consistent around the wrong root:

- generic `reflective_objects`
- object-local observations
- object associations for threads and responses
- glossary candidate state tied to object recurrence
- latent/opening lineage arrays built on that object graph

That means reusing the current domain tables would pull Backend V2 implementation into compatibility mode on day one.

### Would a database reset produce a cleaner V2 implementation?

Yes.

Recommendation:

- Reuse auth/users/admin bootstrap only if needed operationally.
- Reset domain tables and domain migrations for Backend V2.
- Treat existing domain tables as legacy experimental scaffolding, not as a V2 starting point.

Why:

- `docs/DECISIONS.md` already accepts clean-room reboot and says legacy runtime details are not a default input.
- `docs/DECISIONS.md` also states that during reset, old runtime and schema trees are removed before new scaffolding.
- The current domain schema is not merely incomplete; it is architecturally opinionated in a non-canonical direction.

Database judgment:

Reset is materially cleaner than reuse.

## 4. Repository Readiness

### What is already usable

- Stack choice is acceptable for clean-room V2: Next.js, TypeScript, Supabase.
- Folder layering is broadly compatible with clean-room intent: `src/domain`, `src/cognition`, `src/runtime`, `src/reflective-space`, `src/infrastructure`.
- Some domain naming already points toward V2: observation, glossary, latent, openings, threads, responses.

### What is not ready

- Persistence gravity is wrong.
- API gravity is wrong.
- Runtime read gravity is wrong.
- Observation V2 ownership is incomplete.
- Database shape would bias every new decision toward adaptation rather than direct implementation.

### Readiness verdict

The repository is structurally capable of hosting Backend V2, but the active backend implementation is not a clean-room baseline.

If Backend V2 implementation started directly in the current backend boundaries, the work would almost certainly become:

V2 canon
-> adapt to reflective objects
-> adapt to fragment persistence
-> adapt to object associations
-> adapt to viewport-centric reads

That is exactly what this audit is supposed to prevent.

## 5. Required Clean-Room Actions

This is the minimum sequence that materially improves readiness before the first Backend V2 build sprint.

1. Freeze current backend runtime and schema as legacy experimental scaffolding.
   - Includes `src/domain/reflective-objects`, current object-association contracts, current Supabase domain migrations, and object-oriented API routes.

2. Archive or demote `docs/backend-v2-migration/` from active planning authority.
   - Keep for history if needed, but remove it from the active implementation path for Backend V2.

3. Declare the current domain database disposable for Backend V2.
   - Preserve only operational concerns that are truly orthogonal, such as auth/admin bootstrap if still needed.

4. Remove the `reflective_object` substrate from the future implementation path.
   - Do not build new Backend V2 layers on top of it.
   - Do not extend object-association tables as a bridge.

5. Create a fresh Backend V2 persistence/API boundary rooted in canonical domains, not generic objects.
   - This boundary should start from canonical upstream ownership and accept V2-native observation persistence directly.

6. Prevent current viewport assembly from becoming backend truth.
   - Existing reflective-space read models can remain historical reference, but they should not define Backend V2 persistence or runtime ownership.

## Bottom Line

The repo is not one cleanup away from Backend V2 implementation.

It is one architectural severance away.

The stack and documentation are good enough to start. The active backend substrate is not.

## Final Question

If Backend V2 implementation began tomorrow, what is the single biggest remaining source of V1 architectural contamination?

The generic `reflective_object` substrate.

Defense:

It is the root table, the root API family, the root route family, the root association model, and the root read-model assembly center. Observations persist against it. Glossary candidates key off it. Threads and responses attach to it. Latent and openings cite it as source lineage. Capture creates it first, then forces Backend V2 observation output to conform to it. As long as that substrate remains the active backend root, every "new" Backend V2 implementation step will inherit the wrong ontology before any domain-specific work even starts.
