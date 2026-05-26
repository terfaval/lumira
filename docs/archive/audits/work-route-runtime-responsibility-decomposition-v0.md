# Work Route Runtime Responsibility Decomposition v0

## Purpose

Owner-readable decomposition of the **current work-route runtime** before any guarded direction-pressure demotion, reflective ownership transfer, or major UX restructuring.

This is an **audit/mapping ticket only**:

- No code changes
- No route ownership changes
- No persistence/schema changes

## Executive Summary (What You Should Know First)

- Lumira’s “movement engine” is still the legacy core-flow loop: `session.ensure -> direction.select -> work-block.next -> work.answer`, with `/api/work-block/next` as the **highest-coupling** runtime surface.
- The reflective runtime (projections, re-entry adapter, composer, shadow triage) is currently a **read-only validation/bridge layer**, not the owner of work generation or answer persistence.
- The main structural blocker for “post-direction” UX demotion is **work-route continuity parity**: continuity, pacing, and safety are still materially delivered via the direction/work-card loop.
- `/api/work-block/next` currently bundles **(1) continuity inputs, (2) safety gating, (3) selection, (4) model composition, (5) idempotency + persistence, (6) stop logic, (7) glossary context**, and “recent question” novelty tracking.

Evidence base:

- Route inventory: `docs/audits/lumira-runtime-route-and-legacy-direction-inventory-v0.md`
- Direction demotion readiness: `docs/audits/lumira-direction-to-lens-readiness-gate-evidence-pack-v0.md` (Gate 4 BLOCKED)
- Current-flow evidence map: `docs/audits/runtime-current-flow-audit.md`
- Code evidence (primary): `app/api/work-block/next/route.ts`, `app/api/work/answer/route.ts`, `app/api/direction/select/route.ts`, `app/api/session/ensure/route.ts`, `app/session/[id]/(flow)/work/page.tsx`, `app/api/session-summary/route.ts`

---

## 1) Runtime Flow Map (Step-by-Step)

This is the **actual “living system” flow** today, focusing on what moves the user forward and where continuity/pacing/safety live.

### Phase A: Session creation and enrichment

1. `/new` creates the session + raw entry and triggers `/api/session/ensure` (or a downstream equivalent).
2. `/api/session/ensure` is the enrichment orchestrator:
   - Computes a deterministic `material_hash` from `dream_entries` + `dream_answers` + `user_prefs` timestamps.
   - Writes best-effort snapshots/events (material snapshot + `session.ensure_requested` domain event).
   - Runs jobs (depending on run flags + guest mode):
     - Observe (`jobExtractObservation`)
     - Anchors ranking (`ensureAnchorsRanked`)
     - Session index build
     - Latent update
     - Frame generation (`jobGenerateFrame`, can fallback without latent in guest-ish contexts)
   - Returns version ids + `recommended_directions` payloads.

Where continuity lives here:

- **Not yet “work continuity”**. This phase prepares structured material (observation/anchors/index/latent/frame) that later work selection/composition uses.

### Phase B: Direction selection (explicit workflow step)

3. User chooses a direction in `/session/[id]/direction` (and/or uses frame recommendations).
4. `/api/direction/select` persists the direction:
   - Writes to `session_directions` (dedupe via unique-violation tolerant behavior).
   - Returns `next_url` to `/session/{id}/work?direction={slug}`.

Why this matters:

- Direction choice is currently a **canonical persisted step** (not just “context”).
- The work loop assumes a direction slug exists (see work page behavior).

### Phase C: Work loop (the runtime “movement engine”)

5. `/session/[id]/(flow)/work` loads state by directly reading:
   - `work_versions` (the generated work cards)
   - `dream_answers` (answers tied to work ids)
   - `work_latest` (which work card is considered “current”)
6. If there are no direction-scoped cards yet, the work page calls `/api/work-block/next` to generate the first card.

7. `/api/work-block/next` assembles “next question”:
   - Reads inputs (catalog, raw entry, observation latest, latent latest, anchors latest; also reads recent work blocks).
   - Ensures anchors ranking exists (`ensureAnchorsRanked`) when missing.
   - Safety gate (`evaluateSafety`):
     - Can stop immediately with a stop signal (`safety_limit`) and returns a closure block.
     - Can force `mode: gentle`.
   - Picks **selection material** (`selectCardMaterial`):
     - Candidate materials come from observation-extracted anchors/events plus latent intent candidates plus optional seed.
     - Applies novelty rules (recent-material id repeat, similarity threshold vs recent prompts).
     - Applies ledger repeat gating (anchor key repeats from `work_question_ledger`).
     - Applies user prefs gating (blocked group tags).
   - Pulls glossary context if selection is an anchor, and normalizes selected anchor snippet to canonical.
   - Calls the model composer (`composeCard`) to create:
     - `lead_in` (context)
     - `prompt` (single-sentence prompt)
     - Bound by non-interpretive constraints and continuity constraints using the previous answer + previous prompt.
   - Implements idempotency:
     - Uses `client_request_id` or server request id -> hashes -> checks if a work_version already exists for the same input.
   - Persists:
     - Inserts a new `work_versions` row (payload includes direction_slug, sequence, group_tags, material_id, mode, ai prompt/context, trace/debug).
     - Updates `work_latest` for the session.
   - Returns `work_block` + trace/debug, or `stop_signal`.

8. User answers:
   - Work page calls `/api/work/answer` with `{ session_id, work_block_id, answer_text }`.
   - `/api/work/answer` writes to `dream_answers` (`work_id = work_block_id`, `content = answer_text`), with dedupe protection.
   - It also writes to `work_question_ledger` to support novelty gating for future selection:
     - `question_hash` derived from the prompt
     - `anchor_keys` from selection trace or fallback from prompt-derived `anchorKey(...)`

9. After answer save, work page requests the next question:
   - Calls `/api/work-block/next` again.
   - If stop signal returned (low novelty / prefs blocked / safety / model failure), shows a closure UI instead of generating another card.

### Phase D: Summary / Re-entry (read assembly on top of the same substrate)

10. `/api/session-summary` reads legacy read models:
    - `work_versions`, `dream_answers`, `session_directions`, plus frame/latent + raw entry
11. Reflective runtime shadow/triage (guarded) can run in parallel and attach an additive block, but:
    - Legacy summary payload remains authoritative.

Key point:

- Summary/re-entry quality and continuity posture are still downstream of **the work loop’s persisted cards and answers**.

---

## 2) Responsibility Decomposition Matrix

This matrix answers: “What does the work runtime actually do?” and “Who owns which responsibility today?”

Legend:

- Current owner: the route/module that currently *decides* and/or *writes* the outcome.
- Reflective replacement candidate: a plausible future owner, **not an implementation plan**.

| Responsibility | What it does today | Current owner(s) (evidence) | Hidden coupling / dependency | Reflective replacement candidate | Migration difficulty | Risk level |
| --- | --- | --- | --- | --- | --- | --- |
| Continuity substrate | Defines the unit of continuity (card + answer) and links answers to cards | `work_versions`, `dream_answers`, `work_latest`; `/api/work-block/next`, `/api/work/answer`, work page direct reads | Summary + projections + focus selection depend on these tables/fields | Reflective “thread/opening” canonical read models (future) + stable compat adapters | Very high | Very high |
| Next-step generation | Produces the next “work card” | `/api/work-block/next` | Depends on catalog + observation + anchors + latent + ledger + glossary | Future reflective opening generation policy (read-only first) | Very high | Very high |
| Selection logic | Picks what the next question is *about* | `src/domain/work/selector/CardMaterialSelector.ts` invoked by `/api/work-block/next` | Depends on recent prompts + recent ids + ledger used anchor keys; direction group-tags + prefs | Reflective salience/center policy (non-authoritative, calmness-first) | High | High |
| Safety gating | Converts safety signals into gentle mode or stop | `src/domain/work/safety/SafetyGate.ts`, `/api/work-block/next` stop handling | Coupled to observation payload safety flag + keyword gate; closure UI expects stop payload shape | Reflective safety/calmness policy (cross-surface) | Medium | High |
| Pacing/stop logic | Decides when to stop and what options to offer | Selector low-novelty, prefs-block-all, safety stop; `src/domain/work/stop/StopEngine.ts` | UI expects stop_signal; depends on novelty and prefs semantics | Reflective calmness policy and “silence legitimacy” stance | Medium | Medium |
| Composition (prompt writing) | Produces lead-in + prompt under non-interpretive rules and continuity constraints | `src/domain/work/composer/CardComposer.ts` via OpenAI; invoked by `/api/work-block/next` | Depends on previous answer + previous prompt; glossary canonicalization | Reflective interaction grammar + opening phrasing policy | High | High |
| Direction persistence | Records explicit “processing mode” choice | `/api/direction/select` writes `session_directions` | Work route assumes direction exists; work cards store direction_slug; summary reads selected_directions | “Lens” metadata (soft, optional) + orientation slice | High | High (if touched early) |
| Novelty ledger | Prevents repeated anchors/prompts across a session | `work_question_ledger`; `/api/work/answer` writes, `/api/work-block/next` reads | Coupled to selection gating; implicit “pressure” control | Reflective continuity memory / “what has been asked” memory | Medium | Medium |
| Idempotency | Ensures repeated next requests don’t double-insert cards | `/api/work-block/next` input_hash + client_request_id | Client must pass client_request_id for strong idempotency; server fallback exists | Same pattern should exist in reflective generation | Medium | High (behavioral) |
| Glossary grounding | Canonical naming for anchors and do-not-surface notes | `fetchGlossaryContext` in `/api/work-block/next` | “Anchor selection” triggers glossary query; prompt composition can mention canonical text | Reflective continuity memory + glossary policy | Medium | Medium |
| Summary assembly | Provides current public summary output (and optional shadow) | `/api/session-summary` | Reads the same legacy substrate; shadow must remain additive | Reflective space composer (future read assembly) | High | High |

---

## 3) Hidden Workflow Assumptions (What’s Implicit Today)

These are the implicit “workflow engine” assumptions that currently hold the system together. Each is classified as:

- Still necessary (for alpha stability)
- Transitional (can weaken later)
- Reflective contradiction (fights the target model)
- Unknown (needs owner decision or more evidence)

1. “There must be a next step.”
   - Evidence: `/api/work-block/next` exists as a canonical generator; work UI auto-fetches next after answer.
   - Classification: Transitional (but core to current loop)

2. “Direction identity equals processing identity.”
   - Evidence: `session_directions` write step; work cards store `direction_slug`; work page requires direction.
   - Classification: Transitional, but currently operationally required

3. “Continuity is delivered via card sequence.”
   - Evidence: `sequence` per direction; `work_latest` points to a card; summary reads work_versions + answers.
   - Classification: Still necessary (for current substrate)

4. “Novelty is the primary pacing regulator.”
   - Evidence: similarity threshold vs recent prompts; recent material ids; ledger repeat gating.
   - Classification: Transitional (may map to calmness/density later)

5. “Safety gating belongs inside work generation.”
   - Evidence: safety check in `/api/work-block/next` with hard stop.
   - Classification: Still necessary, but future should be cross-surface policy

6. “User silence is handled by stop/closure rather than spacious return.”
   - Evidence: stop signals suggest switch direction/continue later; fewer “return minimal payload” semantics in work.
   - Classification: Reflective contradiction (target is silence legitimacy), but must remain stable until replaced safely

7. “A single monolithic route can own selection + composition + persistence.”
   - Evidence: `/api/work-block/next` does all of the above plus glossary + novelty + idempotency.
   - Classification: Still necessary (because it exists), but a future contradiction for maintainability

---

## 4) Reflective Runtime Compatibility Map (What Can Be Replaced Today?)

This is a conservative “replacement readiness” view. It is not a plan to do the replacements.

Already replaceable (read-only / guarded):

- Focus selection *read* on work page can be influenced by reflective projections (B2) without changing writes.
- Summary/re-entry read assembly can run reflective composer in **shadow mode** (additive only).

Partially replaceable:

- “Read assembly boundaries” are being established (composer + triage + owner review), but they are not owners.
- Some policy semantics (calmness/density/suppression) can exist in reflective read layers, but they cannot override the work substrate or direction writes yet.

Not replaceable yet (blocking for direction-pressure demotion):

- Work generation ownership (`/api/work-block/next`) and answer persistence (`/api/work/answer`) remain canonical.
- The direction step is still a required selector context and continuity frame for work generation.

Consequence:

- A post-direction UX cannot safely happen before the work loop’s continuity responsibilities have a reflective successor (or a safe compat bridge that does not require direction pressure).

---

## 5) Monolith Risk Analysis: Why `/api/work-block/next` Is High-Coupling

### What responsibilities are mixed together

`/api/work-block/next` currently mixes:

- Inputs gathering (catalog + raw entry + observation + anchors + latent)
- Anchor ranking ensure (side effect)
- Safety gate (stop + gentle)
- Novelty/selection (candidates, similarity threshold, recent ids)
- Ledger policy (avoid repeats)
- Glossary lookups + canonicalization
- Model composition (OpenAI request/parse/retries)
- Idempotency keying
- Persistence writes:
  - insert into `work_versions`
  - upsert into `work_latest`
- Debug trace + contract warnings (core-flow contract)

### What breaks if changed too early

- Any change that affects payload shape, `sequence`, `direction_slug`, `work_latest`, or answer linkage can break:
  - Work UI assumptions
  - Summary/re-entry assembly
  - Reflective projections that consume legacy substrate
  - Novelty gating behavior that controls pacing and pressure

### Categorization (practical)

Dangerous-to-touch:

- Selection/composition/persistence semantics (anything that changes which card is generated or how it is persisted)
- Idempotency behavior and `work_latest` updates
- Answer linkage contracts (`dream_answers.work_id` referencing work block id)

Guardedly replaceable later (after boundary exists):

- Glossary context retrieval/canonicalization (can be moved behind a stable interface)
- Trace/debug shape (can be versioned)
- Selection sub-components (materials extraction) once you have a stable intermediate schema

Likely dead legacy behavior (candidate, needs separate audit):

- `/api/work/persist` appears dormant (per caller-proof audit), but this ticket does not remove it.

---

## 6) Reflective Transition Readiness (Sequencing Guidance)

This section answers: “What can become reflective first?” without proposing code changes in this ticket.

What should NOT be touched yet (high-coupling, stability critical):

- `/api/work-block/next` internals (beyond targeted bugfixes with parity tests)
- `/api/work/answer` write contract (`dream_answers` + ledger)
- Direction persistence (`session_directions`) while the work loop relies on it

What can safely become reflective first (already happening as bridge work):

- Summary/re-entry read assembly boundary (composer shadow + triage)
- Work focus selection read (B2-style projection-based focus without writes)

What probably remains transitional longest:

- The work loop as the continuity engine (until reflective openings/threads are not just projections but stable read models with safe generation governance)

---

## 7) Owner-Level Conclusions (Plain Language)

### What is actually holding the old workflow together?

The system’s continuity and pacing are still delivered by a very concrete loop:

- pick a direction (persist it),
- generate a card (persist it),
- answer the card (persist it),
- use “recentness + novelty + ledger” to prevent repetition,
- repeat.

This loop is the current runtime’s “spine.” It’s why the experience feels stepwise and why direction selection still matters.

### What has the reflective runtime already succeeded at?

It has created a *safe read-only lens* over the existing substrate:

- projections can reinterpret legacy work cards into reflective “threads/openings,”
- summary/re-entry can run composer in shadow mode and be triaged with explicit thresholds,
- we can evaluate “Lumira feel” without flipping ownership.

### What is the real bottleneck?

The bottleneck is not “direction cards as UI.”  
It’s that **work generation and continuity movement still live in `/api/work-block/next` + the persisted work card substrate**.

Direction-pressure demotion is blocked until:

- work-route continuity parity is satisfied without relying on an explicit direction workflow step, or
- reflective runtime can safely take on a comparable continuity role (even if still compat-bridged).

### What kind of migration are we actually facing?

Not a single switch, but a staged migration:

1. Stabilize work substrate behavior (keep it boring, predictable).
2. Grow reflective read assembly boundaries (already underway).
3. Establish a safe “post-direction” lens semantics that does not force workflow steps.
4. Only then consider demoting direction pressure in UX.

---

## Required Validation Evidence (This Ticket)

This audit is based on:

- Required scans:
  - `rg "work-block/next|work/answer|direction/select|session-summary|session/ensure" app src`
  - `rg "work_versions|work_latest|dream_answers|session_directions" app src`
  - `rg "composeReflectiveSpacePayload|buildReflectiveReentryPayload|buildReflectiveReentry|thread|opening" app src`
  - `rg "safety|pacing|continuity|selection|orchestration" src`
- Direct route/module reads:
  - `app/api/work-block/next/route.ts`
  - `app/api/work/answer/route.ts`
  - `app/api/direction/select/route.ts`
  - `app/api/session/ensure/route.ts`
  - `app/session/[id]/(flow)/work/page.tsx`
  - `app/api/session-summary/route.ts`

