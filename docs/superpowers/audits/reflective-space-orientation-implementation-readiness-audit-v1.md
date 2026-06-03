# Reflective Space Orientation Implementation Readiness Audit v1

Date: 2026-06-03  
Type: REPO SCOUT / IMPLEMENTATION READINESS AUDIT  
Scope: Current repository readiness vs `docs/runtime/lumira-reflective-space-orientation-composition-contract-v1.md`

## Ticket Protocol

### 1) Goal restatement
- Audit current repository reality for Reflective Space Orientation Layer implementation readiness.
- Compare the canonical Orientation contract to live routes, payloads, schemas, and UI surfaces.
- Identify what is already implemented, what is derivable from existing runtime, and what is still missing.
- Answer what smallest coherent Orientation Layer could ship first with minimal new runtime work.

### 2) Touched files
- New: `docs/superpowers/audits/reflective-space-orientation-implementation-readiness-audit-v1.md`

### 3) Implementation steps
1. Read required repo operating docs and the canonical Orientation contract.
2. Trace live routes: homepage, capture, object orientation, reflect route, viewport API, and related placeholder pages.
3. Trace active payload composition and persistence contracts for objects, observations, glossary, latent, openings, threads, and responses.
4. Classify Orientation contract coverage and implementation effort from actual repo evidence.

### 4) Acceptance criteria (DoD)
- Required sections 1-7 are completed.
- Current entry flow is described with real routes, payloads, and components.
- Every canonical Orientation surface is classified `Implemented`, `Partial`, or `Missing`.
- Data availability is separated into `Available Today`, `Derivable Today`, and `Missing`.
- Final question is answered with a repo-grounded minimal Orientation Layer recommendation.

### 5) Testing / validation plan
- Documentation and codepath audit only.
- Validation by reading active route handlers, payload composers, UI workspaces, domain contracts, and placeholder routes.

### 6) Rollback plan
- Revert this file.

---

## 1. Current Entry Flow

## Actual current flow

```txt
Homepage Orientation Hub
-> Capture or Recent Objects

Capture submit
-> Reflective object create
-> Observation scaffold create
-> /objects/[objectId]/reflect
-> latent snapshot prepare/reuse
-> opening prepare/reuse
-> reflective-space viewport load
-> deep reflection workspace
```

There is not yet a dedicated Orientation Layer screen between Capture and Deep Reflection.

Current runtime enters deep reflection directly after capture.

## Route reality

| Route | Current role | Reality |
| --- | --- | --- |
| `/` | homepage orientation hub | implemented |
| `/capture` | dream capture entry | implemented |
| `/objects/[objectId]` | object orientation route | placeholder only |
| `/objects/[objectId]/reflect` | active reflection route | implemented |
| `/glossary` | glossary page | placeholder only |
| `/journal` | dream journal page | placeholder only |
| `/guide` | guide page | placeholder only |
| `/api/reflective-space/viewport` | reflective-space aggregate read model | implemented |

## Current payload path

### Homepage
- `app/page.tsx` composes homepage payload with `composeHomepageOrientationPayload(...)`.
- Payload includes:
  - capture target
  - glossary preview
  - recent objects preview
  - dream journal preview
  - guide preview
  - route target metadata
- Main component:
  - `src/ui/homepage/homepage-orientation-hub.tsx`

This is an orientation hub for app entry, not the contract's dream-specific Orientation Layer.

### Capture -> reflection
- `app/capture/page.tsx`
  - creates `reflective_object`
  - creates descriptive `observation`
  - redirects directly to `/objects/[objectId]/reflect`

### Reflect route
- `app/objects/[objectId]/reflect/page.tsx`
  - calls `prepareLatentOpeningForReflection(...)`
  - mounts `ReflectiveSpaceWorkspace`

### Viewport payload
- `app/api/reflective-space/viewport/route.ts`
- `src/reflective-space/composition/compose-reflective-space-viewport.ts`

Viewport currently returns:
- reflective objects list
- observations
- thread surfaces
- response surfaces
- opening surfaces
- opening dialogue traces
- glossary terms
- glossary cues
- window metadata / guardrails

## Current component reality

Current deep reflection UI is assembled in:
- `src/ui/reflective-space/reflective-space-workspace.tsx`

Visible panels are:
- Reflective Material
- Observation Orientation
- Continuity Memory
- Optional Openings
- Revisitable Dialogue Traces
- Revisitable Responses

This is already a reflective workspace, not a calm one-screen Orientation Layer with explicit Dream Surface, Emotion Field, Opening Stack, Thread Overview, and Notes.

---

## 2. Orientation Contract Coverage

## Dream Surface

Status: `Partial`

What already exists:
- dream title and dream text are persisted on `reflective_objects`
- homepage dream journal preview shows title plus preview text
- reflect workspace shows selected object title and full `primaryContent`
- `/objects/[objectId]` route family already exists

What is missing:
- no dedicated Orientation Dream Surface on `/objects/[objectId]`
- no orientation-first dream page after capture
- no edit-title or edit-dream transition behavior from Orientation into Deep Reflection
- current capture flow goes straight to `/reflect`, skipping this surface entirely

## Glossary Surface

Status: `Partial`

What already exists:
- glossary terms are persisted
- glossary candidates can be extracted and persisted per object
- homepage shows glossary preview
- viewport exposes glossary terms and derived glossary cues
- thread <-> glossary association APIs exist

What is missing:
- no dream-specific interactive glossary surface in object orientation
- no glossary modal/sheet interaction
- no glossary-light color/intensity system
- no per-entry edit flow from Orientation
- glossary cues in workspace are derived from observation fragments, not a dedicated Glossary Surface

## Emotion Field

Status: `Missing`

What already exists:
- observation fragments can carry `emotion`, `affect_transition`, `emotional_contradiction`, and `affective_atmosphere`
- latent runtime models affect density and uncertainty internally

What is missing:
- no emotion-field read model
- no bubble/coordinate visualization
- no x/y axis mapping (`Safety <-> Uncertainty`, `Positive <-> Negative`)
- no shared reflective color system in code
- no transformed public payload for this surface

## Dream Signal Surface

Status: `Missing`

What already exists:
- latent snapshots, signals, and suggestions exist
- public latent transport exposes safe signals/suggestions

What is missing:
- no dream-signal area in current UI
- no orientation payload section for signal visualization
- no canonical placeholder surface on object orientation page

## Opening Stack

Status: `Partial`

What already exists:
- opening entities, cadence policy, activation, suppression, reactivation, and response flow exist
- reflect workspace shows up to three calm opening surfaces
- openings can be filtered for calm availability and activated explicitly
- openings are already the strongest live invitation surface in the app

What is missing:
- no dedicated Orientation Opening Stack surface
- no `New / Active / All` stack views
- no explicit thread-linked stack filtering from Thread Overview
- current openings are shown inside Deep Reflection workspace rather than an orientation screen

## Thread Overview

Status: `Partial`

What already exists:
- thread persistence exists
- thread state model exists (`active`, `dormant`, `quiet`, `archived`)
- thread surfaces are derivable and visible in workspace
- thread APIs and associations exist

What is missing:
- no orientation-level overview visualization
- no contract-matching `New / Active / Closed` state abstraction
- no proportional distribution view
- no click-to-filter-opening-stack behavior
- current states do not map 1:1 to the orientation contract's `New / Active / Closed`

## Notes Surface

Status: `Missing`

What already exists:
- glossary notes exist on glossary terms
- thread context notes exist
- reflective objects can be created with type `reflective_note`
- observations can be user descriptive notes

What is missing:
- no dream-specific notes entity or dream-note panel
- no independent notes surface attached to a dream orientation page
- no lightweight note CRUD for dream-owned notes
- current "notes-like" data belongs to other entities, not to the dream itself

---

## 3. Data Availability Audit

| Surface | Available Today | Derivable Today | Missing |
| --- | --- | --- | --- |
| Dream Surface | object title, object content, dream journal preview text | orientation summary card from `reflective_objects` + `observations` | edit transition contract, dedicated orientation route behavior |
| Glossary Surface | glossary terms, glossary candidates, glossary notes, glossary cues, glossary associations | dream-local glossary list by combining candidates + terms + observation-derived cues | modal/sheet interaction model, glossary lights, color/intensity payload |
| Emotion Field | observation emotion fragments, affect categories, latent uncertainty/confidence internals | lightweight emotion chips/list from observation fragments; rough atmosphere summary from latent public summary | canonical emotion field coordinates, bubble sizes, public color system, safety/uncertainty axis mapping |
| Dream Signal Surface | latent public snapshots, signals, suggestions | placeholder signal panel using existing public latent signals/suggestions | any contract-defined signal visualization or orientation placement |
| Opening Stack | openings, opening surfaces, suppression state, activation state, response lineage | split into `new` vs `active/opened` with existing opening state/visibility data | `All/New/Active` orientation UI and explicit thread-linked filtering |
| Thread Overview | thread entities, states, visibilities, thread surfaces, thread associations | state counts / simple status summary from thread rows | contract-specific `New/Active/Closed` abstraction and proportional overview interaction |
| Notes Surface | no dream-owned notes entity | none reliably; `reflective_note` objects could be repurposed but are not dream-scoped notes | canonical dream notes model, route/API/UI surface |

Key conclusion:
- Dream Surface, Glossary Surface, Opening Stack, and a lightweight Thread Overview can be built mostly from existing repository capabilities.
- Emotion Field and Dream Signal Surface have partial upstream evidence but not their required orientation-safe read models.
- Notes Surface lacks a reliable dream-scoped substrate.

---

## 4. Route / Focus-State Alignment

## Contract assumptions vs current reality

| Contract destination | Assumed focus state | Current repo reality | Alignment |
| --- | --- | --- | --- |
| `/objects/[objectId]` | `Local Interaction Mode` | placeholder page only | `Partial` |
| `/objects/[objectId]/reflect` | `Deep Reflection Mode` | live reflection workspace | `Strong` |
| post-capture default destination | Orientation first | direct redirect to `/objects/[objectId]/reflect` | `Missing` |

## Local Interaction Mode

Expected by contract:
- dream-specific orientation
- glanceable overview
- no forced deep reflection
- local interaction around one dream

Current reality:
- route exists at `/objects/[objectId]`
- behavior is only placeholder content
- no dream-local surfaces are mounted there yet

Assessment:
`Route exists, focus-state implementation missing.`

## Deep Reflection Mode

Expected by contract:
- reached when editing dream text, entering opening, or entering thread

Current reality:
- `/objects/[objectId]/reflect` is the actual live reflection workspace
- capture redirects here immediately
- openings live here
- responses live here
- dialogue traces live here

Assessment:
`Deep Reflection Mode is implemented, but it currently absorbs Orientation's entry role.`

## Main route misalignment

Largest route-level divergence from the contract:

```txt
Current:
Capture -> /objects/[id]/reflect

Contract:
Capture -> Orientation Layer
Orientation -> Deep Reflection when chosen
```

This is the central readiness finding.

---

## 5. Deep Reflection Entry Points

## Dream editing entry

Current status: `Missing`

What exists:
- capture can create a dream
- reflect route shows full dream text

What is missing:
- no edit action on an Orientation Dream Surface
- no explicit "edit dream text -> Deep Reflection" transition

## Opening entry

Current status: `Implemented`

What exists:
- openings appear in the live reflect workspace
- opening activation API exists
- opening responses persist

What is missing:
- opening entry is not launched from Orientation
- it is already inside Deep Reflection

## Thread entry

Current status: `Missing / Partial substrate only`

What exists:
- thread entities and APIs exist
- thread surfaces are visible in workspace continuity panel

What is missing:
- no explicit thread-entry UI route/action
- no "enter thread" interaction from Orientation or workspace
- no thread-focused deep reflection destination

---

## 6. Build Complexity Estimate

| Surface | Complexity | Reason |
| --- | --- | --- |
| Dream Surface | `Small` | core data and route family already exist; mostly needs orientation-page composition and an edit/deepen transition |
| Glossary Surface | `Medium` | data exists, but dream-local assembly and interaction model are not implemented |
| Emotion Field | `Large` | upstream emotional evidence exists, but no public orientation-safe model or visualization contract implementation exists |
| Dream Signal Surface | `Medium` | latent signals already exist, but no orientation placeholder or dedicated signal surface is wired |
| Opening Stack | `Small` | openings are already live and user-safe; mostly needs relocation/reframing onto orientation page plus simple stack-state views |
| Thread Overview | `Medium` | thread data exists, but contract-specific state mapping and overview interaction do not |
| Notes Surface | `Large` | no reliable dream-scoped notes substrate currently exists |

---

## 7. Recommended Build Order

## Orientation Layer Build Sequence

1. Dream Surface
2. Opening Stack
3. Glossary Surface
4. Thread Overview
5. Dream Signal Surface placeholder
6. Emotion Field
7. Notes Surface

## Why this order is repo-grounded

### 1) Dream Surface first
- the route family already exists
- the dream is already persisted and rendered in reflect workspace
- this establishes `/objects/[objectId]` as actual `Local Interaction Mode`

### 2) Opening Stack second
- openings are the most mature orientation-adjacent live subsystem
- they already support silence, activation, and calm invitation behavior
- moving them onto Orientation restores the contract's boundary between overview and deep work

### 3) Glossary Surface third
- enough glossary substrate already exists to make this useful quickly
- it strengthens orientation without needing new cognition work

### 4) Thread Overview fourth
- thread substrate exists, but orientation-specific aggregation is needed
- useful after openings are visible so filtering relationships become meaningful

### 5) Dream Signal Surface placeholder fifth
- easiest way to reserve contract space without inventing new cognition
- can reuse existing latent public signals as a bounded placeholder if desired

### 6) Emotion Field sixth
- requires the most new read-model design work among the non-notes surfaces
- upstream evidence exists, but the orientation-safe transformation does not

### 7) Notes Surface last
- least ready substrate
- would require new persistence and ownership rules

---

## Final Question

## If implementation started tomorrow, what is the smallest coherent Orientation Layer that could be built from existing repository capabilities with minimal new runtime work?

Smallest coherent v1:

1. `Dream Surface`
2. `Opening Stack`
3. `Glossary Surface`
4. `Lightweight Thread Overview`

### Why this is the minimal coherent cut

These four surfaces can be assembled mostly from data the repository already has:
- dream title/text from `reflective_objects`
- observation summary/fragments from `observations`
- glossary terms/candidates/cues from glossary + observation paths
- opening surfaces from current opening runtime
- thread surfaces/counts from current thread runtime

### What minimal new work is still required

- make `/objects/[objectId]` a real orientation page
- change post-capture default destination from `/objects/[objectId]/reflect` to `/objects/[objectId]`
- compose a dream-specific orientation payload, likely by reusing pieces of `composeReflectiveSpaceViewport(...)`
- add explicit transitions from Orientation into `/objects/[objectId]/reflect`

### What should not be in the first minimal cut

- Emotion Field
- full Dream Signal visualization
- Notes Surface

Reason:
- those require either new transformed runtime support or new persistence, while the four-surface cut above is mostly composition and route-boundary work.

## Bottom line

The repository is not close to the full Orientation contract as written.

It is, however, close to a first coherent Orientation Layer if the team treats current reality correctly:

```txt
existing deep reflection substrate
+ existing opening runtime
+ existing glossary/thread data
- missing orientation route composition
```

The main gap is not missing reflection infrastructure.

The main gap is that the current repository routes users directly into Deep Reflection instead of first composing an orientation-first dream screen from data that is already substantially present.
