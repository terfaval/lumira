# Reflection Thread Reality Audit v1

Date: 2026-06-01  
Type: AUDIT / PRODUCT REALITY REVIEW  
Scope: Reflection runtime reality vs Reflective Thread Model v1

## Ticket Protocol

### 1) Goal restatement
- Determine whether current Reflection MVP runtime is thread-first or opening-loop-first.
- Audit implemented behavior only (not planned architecture).
- Map `Observation -> Latent -> Opening -> Response -> Continuity` with persistence/reconstruction boundaries.
- Classify thread lifecycle and direction/thread distinction using runtime evidence.

### 2) Touched files
- New: `docs/superpowers/audits/reflection-thread-reality-audit-v1.md`

### 3) Implementation steps
1. Read required reflection philosophy + MVP docs.
2. Trace live runtime path (`/capture`, `/objects/[objectId]/reflect`, viewport composition, openings/responses/threads APIs).
3. Trace persistence contracts (domain types, repositories, migrations).
4. Classify thread reality, lifecycle coverage, and user experience outcome.

### 4) Acceptance criteria (DoD)
- Sections A-G completed with direct runtime evidence.
- Final questions answered with explicit `YES/PARTIAL/NO` and readiness status.
- Distinction between thread theory and implemented runtime made explicit.

### 5) Testing / validation plan
- Codepath and contract audit only (no runtime mutation).
- Validation by reading active route handlers, orchestration, composition, repositories, migrations, and tests.

### 6) Rollback plan
- Revert this file.

---

## Section A - Current Runtime Mapping

## Runtime chain (actual)

```txt
Capture submit
-> Reflective object create
-> Observation scaffold create
-> Reflect route entry
-> Latent prepare/reuse
-> Opening generate/reuse
-> Opening activate
-> Response persist
-> Viewport continuity surfaces
```

Primary runtime evidence:
- Capture creates reflective object + observation, then redirects to reflect route:
  - `app/capture/page.tsx`
- Reflect route executes latent/opening preparation before mounting workspace:
  - `app/objects/[objectId]/reflect/page.tsx`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
- Workspace reads unified viewport and handles opening activation/response save:
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
- Viewport composition is assembled server-side:
  - `app/api/reflective-space/viewport/route.ts`
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`

## What is implemented vs persisted vs reconstructed vs inferred

| Layer | Implemented | Persisted | Reconstructed at read | Inferred only |
|---|---|---|---|---|
| Observation | Yes | `observations` | observation summary/fragments in viewport | n/a |
| Latent | Yes | `latent_snapshots`, `latent_signals`, `latent_suggestions` | public latent transport intentionally strips internal orchestration detail | center continuity semantics are mostly inference-weighted |
| Opening | Yes | `openings`, `opening_suppressions`, `opening_surface_events` | opening surfaces + dialogue traces | invitation similarity/repetition logic is inferred by cadence policy |
| Response | Yes | `reflective_responses`, `response_object_associations`, optional `response_thread_associations` | response surfaces + dialogue inclusion | meaning/deepening level is not explicitly modeled |
| Continuity (thread object) | Partial | `reflective_threads`, thread associations | simple thread surfaces + optional thread IDs in dialogue context | whether current loop is “same thread” is inferred, not resolved |

Notes:
- Opening-response flow is fully operational.
- Thread persistence exists as a separate substrate, but is not automatically driven by the core reflect loop.

---

## Section B - Thread Reality Assessment

## Does a thread currently exist as a runtime entity?

`PARTIAL`

Why:
- `YES` as persisted entity: thread table, thread states, thread associations, CRUD APIs exist.
  - `supabase/migrations/20260524_0005_reflective_threads.sql`
  - `app/api/threads/route.ts`, `app/api/threads/[id]/route.ts`
- `NO` as primary runtime driver in reflection loop:
  - capture -> reflect -> opening -> response flow does not auto-create/resolve/update canonical thread identity.
  - `createThread` is only invoked by explicit `/api/threads` POST, not by reflection orchestration.

## If PARTIAL, what currently constitutes “thread” in runtime terms?

Current thread-like continuity is split across:
- Explicit thread object (manual/explicit API lifecycle).
- Opening provenance `sourceThreads` copied from latent provenance.
- Optional response-thread association (`threadId` optional in opening-response association payload).
- Dialogue context thread IDs derived from opening provenance + response associations.

This means thread continuity can be represented, but is not guaranteed to be generated or maintained by default runtime behavior.

---

## Section C - Reflection Behavior Assessment

Simulated loop:

```txt
Opening -> Response -> Opening -> Response -> Opening -> Response
```

## Does the system remain on the same inquiry?

`PARTIAL`

- It remains on the same center object when user stays on `/objects/[objectId]/reflect`.
- Opening surfaces are loaded user-wide (not center-object-scoped in query), so invitation context can mix across objects.

## Does the system know it is deepening something?

`NO`

- No automatic deepening marker, streak, or thread-state transition is applied when responses accumulate.
- Response save creates response + object associations + opening activation/association, but no mandatory thread progression.

## Does the system know when a new inquiry starts?

`NO`

- No runtime classifier/contract marks “new thread start” vs “continuation” in the live loop.
- New inquiry boundaries are implicit and left to object selection + optional manual thread linking.

## Does continuity influence future openings?

`YES (bounded)`

- Latent generation consumes historical threads/responses/openings.
- Opening cadence uses recent openings/suppression/similarity windows.
- This is continuity influence, but not canonical thread-tracking continuity.

---

## Section D - Thread Lifecycle Assessment

Reference model states: Thread Start, Thread Deepening, Thread Resting, Thread Re-entry, Thread Branching, Thread Merge.

| Lifecycle state | Classification | Runtime evidence |
|---|---|---|
| Thread Start | PARTIAL | Manual create exists (`POST /api/threads`). No automatic start in core capture->reflect loop. |
| Thread Deepening | PARTIAL | Optional response-thread association exists, but no automatic deepening logic/state transitions. |
| Thread Resting | PARTIAL | Thread state supports `dormant/quiet`; opening suppression/dormant behavior exists. Not orchestrated as unified thread rest lifecycle. |
| Thread Re-entry | PARTIAL | Opening reactivation + dialogue revisitation + dormant openings exist. Canonical thread re-entry logic is not enforced end-to-end. |
| Thread Branching | MISSING | No branch identity/parent-child structure or branch transition contract in runtime entities/APIs. |
| Thread Merge | MISSING | No merge contract, resolver, or state transition path for converging threads. |

---

## Section E - Direction vs Thread Assessment

## Are directions visible?

`NO`

- Homepage orientation payload and hub do not expose direction objects (emotional/relational/agency/etc.) as runtime surfaces.

## Are threads visible?

`YES (lightweight)`

- Threads appear as simple continuity surfaces (`title`, `state`, phrasing), plus optional thread IDs in dialogue context.

## Is reflection organized around directions?

`NO`

- Runtime entry is route/object based, not direction-lens based.

## Is reflection organized around threads?

`PARTIAL`

- Thread substrate exists but reflection loop is organized around openings + object context.
- Thread is not the guaranteed organizing unit of each reflection turn.

## Is there confusion between direction and thread?

`YES`

- In practice, opening lineage and object-scoped loop currently carry most continuity behavior that thread model expects from canonical thread identity.

---

## Section F - User Reality Assessment

Scenario: user reflects on `fear of failure` across multiple dreams, responses, sessions.

Current likely feel:

`B: a series of disconnected openings` (with partial memory cues)

Why:
- User does get continuity traces (prior responses, opening dialogue traces, lightweight thread surfaces).
- But runtime does not consistently anchor each new opening/response turn to one explicit evolving thread identity.
- Dream journal path still routes to object-orientation placeholder (`/objects/[id]`), which further weakens sustained thread feel outside recents->reflect path.

Net user reality:
- Better than isolated one-off prompts.
- Not yet true thread-first sustained inquiry.

---

## Section G - Missing Pieces Inventory (Smallest set)

Scope: smallest gaps to reach thread-first reflection behavior without redesign.

## 1) Contracts
- Require explicit `threadId` resolution outcome for opening-response associations in the live reflection flow.
- Add a runtime outcome contract for each opening turn: `continued_thread` vs `new_thread` (even if heuristic, bounded, and revisable).

## 2) Persistence
- Persist per-turn thread resolution result during opening activation/response association, not only optional/manual thread links.
- Ensure reflection loop can create thread identity when none exists and continuity evidence is sufficient.

## 3) Retrieval
- Scope opening surfaces by selected center object and/or resolved thread context in viewport composition.
- Prioritize thread-scoped dialogue retrieval by default in reflect workspace.

## 4) UX surfacing
- Show active thread identity clearly in workspace (not only generic thread list).
- Surface whether current opening is continuing an existing thread or starting a new one.

## 5) Runtime behavior
- Attach automatic thread lifecycle micro-transitions to live loop events:
  - start on first qualifying opening/response cycle,
  - deepen on subsequent linked cycles,
  - rest on suppression/defer patterns,
  - re-enter on validated return.

---

## Final Questions

### 1) Does Reflection MVP currently operate as thread-based reflection?

`NO`

Reason:
- It operates as a functioning opening/response continuity loop with thread-capable substrate, but thread identity is not the primary enforced runtime unit.

### 2) What is the single biggest gap between today’s runtime and the Reflective Thread Model?

Lack of **automatic canonical thread resolution and carry-forward in the live opening->response loop** (start/continue/deepen boundaries are not runtime-owned).

### 3) Readiness for Thread-Based Reflection v1

`CONDITIONAL_HOLD`

Condition to clear:
- Make thread identity resolution first-class in live reflection turns (contract + persistence + retrieval + surfacing) using existing substrate, before treating runtime as thread-first.
