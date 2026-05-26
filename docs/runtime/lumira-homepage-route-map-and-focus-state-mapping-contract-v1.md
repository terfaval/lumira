# Lumira Homepage Route Map and Focus-State Mapping Contract v1

## Status

Canonical route-map and attentional-posture contract for Homepage Orientation Hub destinations.

This document defines:
- homepage destination route map
- initial focus-state posture per destination
- route status semantics for payload navigation targets
- per-route behavioral constraints and anti-drift rules
- implementation blockers before route-level build work

This document is:
- planning-level
- runtime-UX contract
- navigation-contract guidance

This document is NOT:
- route implementation
- runtime orchestration implementation
- schema change
- UI implementation ticket

---

## Ticket Protocol

### 1) Goal restatement
- Define explicit homepage route targets for panel and item navigation.
- Map each route to an initial reflective focus-state posture.
- Keep focus states attentional and runtime-owned, not route-owned workflows.
- Provide implementation-safe status/dependency mapping for payload target fields.

### 2) Touched files
- New: `docs/runtime/lumira-homepage-route-map-and-focus-state-mapping-contract-v1.md`

### 3) Planning steps
1. Anchor routes to homepage composition and aggregate payload contracts.
2. Define route keys, href patterns, and current status semantics.
3. Map each destination to initial focus-state posture and constraints.
4. Define blockers/readiness checks for implementation.

### 4) Acceptance criteria (DoD)
- Route map table exists with required columns and destinations.
- Focus-state mapping table exists for all homepage targets.
- Back/return semantics are clarified without over-specification.
- Payload navigation target implications are explicit.
- Non-goals, blockers, and validation checklist are included.

### 5) Testing / validation plan
- Documentation review against checklist in Section 13.
- No runtime/schema/UI mutation in this ticket.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Purpose and Scope

This contract defines the canonical route map for homepage navigation and the initial attentional posture each destination should open into.

Core guardrail:

# routes may carry initial attentional posture, but meaning/ranking/pacing remain runtime-owned

This contract is homepage-origin focused and does not redefine global route architecture.

---

## 2) Relationship to Existing Homepage Contracts

This contract operationalizes navigation decisions required by:
- `lumira-homepage-orientation-composition-contract-v1`
- `lumira-homepage-orientation-aggregate-payload-contract-v1`
- `lumira-homepage-orientation-technical-gaps-v1`

Composition contract defines:
- what panels and item-click destinations must exist conceptually

Aggregate payload contract defines:
- payload navigation target keys and `routeStatus` semantics

This contract defines:
- canonical href strategy and focus-state posture mapping for those target keys

---

## 3) Route Map Table

| Route Key | Proposed Href | Route Role | Initial Focus State | Route Status | Homepage Source | Dependency Level |
| --- | --- | --- | --- | --- | --- | --- |
| `homepage` | `/` | Orientation Hub / Reflective Lobby | `Orientation Mode` | `implemented` | direct entry | `none` |
| `capture_home` | `/capture` | dedicated capture entry | `Capture Mode` | `missing` | Capture panel | `P0` |
| `glossary_home` | `/glossary` | personal glossary memory page | `Orientation Mode` | `missing` | Glossary panel | `P0` |
| `dream_journal_home` | `/journal` | dream archive / journal page | `Orientation Mode` | `missing` | Dream Journal panel | `P0` |
| `guide_home` | `/guide` | sleep and dream-technique guide | `Orientation Mode` | `missing` | Guide panel | `P1` |
| `dream_orientation` | `/objects/[objectId]` | individual dream orientation page | `Local Interaction Mode` | `missing` | Dream Journal item click | `P0` |
| `reflective_object_orientation` | `/objects/[objectId]/reflect` | focused reflective-object deepening page | `Deep Reflection Mode` | `missing` | Recent Objects item click | `P0` |
| `glossary_term_detail` | `n/a in v1 (contextual modal/sheet on /glossary)` | local glossary term contextual expansion | `Local Interaction Mode` | `not_required_v1` | optional Glossary item click | `P2` non-blocking |

Current observed route reality (2026-05-26):
- existing page routes: `/`, `/auth`
- all non-homepage destinations above are currently not implemented

---

## 4) Focus-State Mapping Table

| Destination | Entry Trigger | Initial State | Must Not Happen on Entry | Allowed Later |
| --- | --- | --- | --- | --- |
| `/` | app home entry | `Orientation Mode` | dashboard/feed/inbox/task framing | gentle branch to other entry surfaces |
| `/capture` | Capture panel click | `Capture Mode` | continuity surfacing, reflective prompting, unfinished-work pressure | optional explicit transition to Orientation after capture |
| `/glossary` | Glossary panel click | `Orientation Mode` | symbolic authority posture | local exploration and optional deeper contextual linking |
| `/journal` | Dream Journal panel click | `Orientation Mode` | productivity archive/task framing | item-level dream entry |
| `/guide` | Guide panel click | `Orientation Mode` | urgent help-center or coaching pressure | static or curated guidance browsing |
| `/objects/[objectId]` | Dream Journal item click | `Local Interaction Mode` | forced deep-reflection entry | explicit deepen action into Deep Reflection |
| `/objects/[objectId]/reflect` | Recent Object item click | `Deep Reflection Mode` | multi-center dashboard density | one-center writing-first reflective deepening |
| `contextual modal/sheet on /glossary` | optional Glossary item click | `Local Interaction Mode` | full-page attentional context switch | contextual memory exploration and reversible local expansion |

---

## 5) Per-Route Behavioral Constraints

### 5.1 Homepage `/`
- role is threshold orientation, not operational control center
- no KPI, streak, progress, or active-thread queue framing

### 5.2 Capture `/capture`
- dream-first in v1
- text-first and low-friction
- no default continuity pressure
- capture alone is complete success

### 5.3 Glossary `/glossary`
- personal motif memory posture
- accepted vs candidate distinction must remain calm
- no universal symbol-dictionary posture
- no forced interpretation

### 5.4 Journal `/journal`
- archive posture, not activity feed
- sorting/filtering may exist as utility support only
- no task/completion language

### 5.5 Guide `/guide`
- calm companion library posture
- static content is acceptable in v1
- no medical authority or urgency posture

### 5.6 Dream item `/objects/[objectId]`
- dream text remains canonical source material
- local interaction only on entry
- no automatic deep-reflection escalation

### 5.7 Recent object deep route `/objects/[objectId]/reflect`
- one dominant reflective center
- writing-first deep posture
- adjacent context only, broad continuity demoted
- avoid multi-center competition

### 5.8 Glossary term interaction (contextual on `/glossary`)
- default behavior is local modal/sheet interaction, not route transition
- lightweight and reversible
- surrounding glossary context stays visible
- no workflow-like navigation jump
- no symbolic-authority or encyclopedia posture
- allowed contextual contents may include: user notes, associated motifs, related dream excerpts, soft continuity context, candidate/accepted status
- optional future deep-link/share route may be added later and remains non-blocking for homepage v1

---

## 6) Route Status Semantics

Canonical route status values:
- `implemented`: route exists and is safe for payload target resolution
- `placeholder`: route exists with explicit temporary/static behavior
- `missing`: route does not exist and must not be assumed by UI
- `not_required_v1`: capability is interaction-based in v1 and does not require standalone route

Usage rule:
- homepage payload must expose target `routeStatus`
- UI must not fabricate destination behavior for `missing` routes

---

## 7) Homepage Payload Navigation Target Implications

Payload target key to href mapping for v1 planning:
- `capture_home` -> `/capture`
- `glossary_home` -> `/glossary`
- `dream_journal_home` -> `/journal`
- `guide_home` -> `/guide`
- `dream_orientation` -> `/objects/[objectId]`
- `reflective_object_orientation` -> `/objects/[objectId]/reflect`
- `glossary_term_detail` -> interaction capability on `/glossary` (no mandatory href in v1)

Contract implication:
- payload layer owns explicit mapping and status surface
- UI reads mapping, does not infer route patterns dynamically
- glossary preview items may expose interaction metadata (for example `interactionType: "contextual_sheet"`) instead of mandatory canonical href in v1

---

## 8) Back / Return Semantics (v1 Boundaries)

Distinguish three concepts:
1. Browser back: native history behavior
2. Attentional return: one-level-wider reflective posture principle
3. Future runtime return contract: explicit restoration semantics from focus-state system

V1 guidance:
- homepage itself has no upstream return requirement
- panel destination back should return to homepage in normal flow
- item destination back should return to parent archive surface or homepage based on actual navigation source
- do not over-specify deep runtime back-stack behavior in this contract

---

## 9) Non-Goals

This contract does not:
- implement or migrate routes
- define full IA for each destination page
- define deep runtime transition algorithms
- define glossary term detail UX in final form
- redefine focus states as route-owned logic

---

## 10) Open Implementation Questions

1. Should dream and non-dream object detail always share `/objects/[objectId]` family routes, or should dream-specific `/dreams/[dreamId]` exist later?
2. Should `/guide` launch as `placeholder` first with static content, then evolve, or wait for full initial content set?
3. Should `/objects/[objectId]/reflect` require explicit entry guard from non-active/archived objects?
4. Should navigation source tagging be required to decide parent return route for item pages?
5. Should a future glossary term deep-link route (`/glossary/[termId]`) exist only for shareability/bookmarks, while default interaction remains contextual modal/sheet?

---

## 11) Implementation Readiness and Blockers

Required before homepage implementation can proceed safely:
1. Canonical route names/href patterns approved.
2. Route status registry established (`implemented/placeholder/missing/not_required_v1`).
3. Navigation target registry/constants aligned with payload contract target keys.
4. Parent-route mapping strategy defined for item pages (journal-origin vs homepage-origin).
5. Decision confirmed for object-based route pattern (`/objects/[objectId]` family) vs parallel dream-specific pattern.
6. Decision confirmed whether `/guide` ships as static placeholder in first cut.
7. Explicit confirmation that glossary term click is contextual local interaction in v1 and non-blocking as standalone route.

Readiness gate:
- do not implement homepage navigation behavior until route-map + payload target registry decisions are approved together.

---

## 12) Anti-Patterns to Prohibit

Prohibited:
- route-owned cognition
- routes inventing reflective ranking
- UI-owned meaning assembly
- hidden workflow progression through item clicks
- journal drift into productivity archive
- glossary drift into universal symbol dictionary
- glossary click causing full-page context switch by default
- encyclopedia-style glossary navigation hierarchy
- symbolic interpretation authority framing
- guide drift into urgent help center
- recent objects drift into inbox framing
- dream item forced deep-reflection entry
- deep-reflection route showing dashboard-like multi-center density

---

## 13) Validation Checklist

Review must verify:
- every homepage panel has a route target
- every item click has route strategy or explicit deferral
- every route has initial focus-state posture
- Capture opens as `Capture Mode`
- Glossary/Journal/Guide open as `Orientation Mode`
- Dream item opens as `Local Interaction Mode`
- Recent Object item opens as `Deep Reflection Mode`
- Glossary term interaction opens as `Local Interaction Mode` contextual modal/sheet
- Glossary term standalone route is non-blocking for homepage v1
- homepage back behavior is not over-specified
- no route introduces dashboard/feed/inbox/task framing
- payload navigation targets can resolve without UI inventing behavior

---

## 14) Canonical References

- `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-aggregate-payload-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-technical-gaps-v1.md`
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 15) Final Principle

This contract succeeds when homepage navigation is explicit enough for implementation while focus states remain attentional runtime posture, not route-owned workflows.

Glossary terms should feel like opening a nearby memory fragment, not navigating deeper into an information architecture tree.
