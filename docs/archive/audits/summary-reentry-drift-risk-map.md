# VALIDATION - Summary/Re-entry Drift Risk Map

Date: 2026-05-17  
Scope: `/api/session-summary`, `/session/[id]/summary`, `/session/[id]`  
Mode: audit/validation only (no switches, no implementation)

## 1. Current Aggregation Surface Map

### A. Aggregation topology

`/api/session-summary` currently aggregates:
- `dream_sessions`
- `dream_entries` (`raw` / `raw_entry`)
- `frame_latest` -> `frame_versions.payload`
- `latent_latest` -> `latent_versions.payload`
- `work_versions`
- `dream_answers`
- `session_directions`
- direction catalog (`CatalogService.getActiveCatalog`)

Returned composite payload:
- `session`
- `raw_entry`
- `frame`
- `latent`
- `work_versions`
- `dream_answers`
- `selected_directions`
- `catalog`

`/session/[id]/summary` currently adds direct side reads beyond API payload:
- `dream_entries` (raw entry id/content)
- `dream_entry_highlights`
- `glossary_terms`
- `frame_versions` + `latent_versions` (again) for suggestion aggregation
- `/api/sessions/[sessionId]/highlights` for `rejected_keys`
- local `aggregateSessionSuggestions(...)` synthesis

`/session/[id]` (overview re-entry-like surface) currently reads:
- `dream_sessions`
- `dream_entries` (`raw`)
- `frame_latest` + `frame_versions`
- `work_versions`
- `dream_answers`

### B. Coupling density hotspots

Highest coupling surface: `/session/[id]/summary` because it mixes:
- legacy summary DTO data
- additional direct reads
- suggestion synthesis
- highlight and glossary interaction writes/reads in one surface

Second highest: `/api/session-summary` due multi-domain aggregation in one endpoint.

Lowest of the three: `/session/[id]` (still aggregate, but comparatively narrower).

## 2. Continuity Pressure Risk (Critical Section)

### Pressure-risk locations

1. Summary composition stack (`/session/[id]/summary`): **High**
- simultaneous exposure of raw dream, framing text, salient elements, highlights, work cards, recommended directions
- continuity can feel stacked even without explicit reflective payload expansion

2. Suggestion synthesis loop (`frame/latent -> aggregateSessionSuggestions -> highlights panel`): **High**
- multiple sources can reinforce same motif/theme and increase perceived urgency

3. Work carry-forward + continuation affordance (`/session/[id]/summary` cards + continue CTA): **Medium-High**
- can create "unfinished business" posture if reflective expansion later foregrounds unresolved lines aggressively

4. Projected opening/thread addition on top of current summary stack (future): **Critical**
- likely to exceed calmness bounds unless strict demotion/omission rules are enforced

### Pressure-risk patterns

- too many simultaneous invitations (openings + direction suggestions + highlight suggestions)
- recursive resurfacing if continuity ranking reuses already surfaced domains
- multi-source reinforcement loops (latent + highlights + work + glossary recurrence)
- implicit completion pressure via "continue" prominence

## 3. Interpretive Drift Risk (Critical Section)

### Interpretive-risk pathways

1. Frame + latent + recommendations + highlights assembled as one narrative layer: **High**
- increases probability of perceived "system interpretation" even without explicit claim wording

2. Thematic compression via repeated motif surfacing across domains: **High**
- can imply stronger certainty than underlying evidence supports

3. Latent-forward composition in summary context: **Critical (future expansion risk)**
- if latent-weighted continuity surfaces without strong evidence-linking and uncertainty language, authority drift occurs quickly

4. Cross-session coherence inflation (future): **Medium now / High later**
- currently limited, but summary/re-entry expansion could overstate continuity coherence across returns

## 4. Emotional Pacing Risk

### Pacing-risk map

- Emotionally dense return cards + multiple reflective cues at once: **High**
- Clustered resurfacing in entry payload: **Critical (future reflective read risk)**
- Unresolved continuity stacking in foreground: **High**
- Attention-capture loops (novel/urgent suggestions outranking calmness): **High**

Current exposure is moderated by lack of full reflective-first summary/re-entry reads, but existing summary surface already has moderate density.

## 5. Suppression/Silence Erosion Risk

### Vulnerabilities

1. Suppression semantics split across domains: **High**
- highlight rejection memory exists, but opening/thread defer/suppress semantics are not yet canonical on summary/re-entry surfaces

2. Dormant continuity reactivation by aggregation overlap: **Medium-High**
- if one surface ignores suppression from another, dormant lines can resurface implicitly

3. Silence legitimacy weakness in current summary UX: **Medium**
- summary currently tends toward "always show multiple sections" rather than "omit under ambiguity/saturation"

4. Future projected opening integration without strict suppression filter: **Critical**
- known historical risk class from earlier A5/A3 parity notes

## 6. Cross-domain Coupling Risk

### Coupling zones and amplification chains

1. `frame/latent -> highlight suggestions -> highlights state -> glossary indexing`: **High**
- possible reinforcement loop and synthetic significance inflation

2. `work continuity -> summary cards -> recommended directions -> next work`: **Medium-High**
- potential unresolved-pressure loop if expansion adds aggressive continuity ranking

3. `summary API aggregate + summary page direct rereads`: **High**
- duplicate source consumption increases drift surface and parity complexity

4. `highlight salience + latent cues + future openings in re-entry`: **Critical (future)**
- highest risk for false coherence and pressure escalation

## 7. Reflective Runtime Expansion Risks

Risks specific to future reflective-first summary/re-entry reads:
- reflective center instability when multiple domains compete (High)
- neighborhood over-expansion beyond calmness caps (Critical)
- opening density inflation under ambiguous evidence (Critical)
- latent-only surfacing pressure (High)
- hidden canonicalization if reflective composition becomes fallback-by-default (Critical)
- rollback fragility if summary/re-entry reads become coupled to other route behavior (High)

## 8. Existing Safety Strengths

Current architecture strengths that should be preserved:
- route-local guarded reflective switch precedent (B1/B2)
- explicit rollback-first posture
- projection-only compatibility model
- single-write-owner governance
- suppression/defer parity emphasis in contracts
- bounded foreground/ambient rules in re-entry contract
- omission preference under ambiguity
- owner approval gates before high-risk switch behavior

These controls are working and should remain mandatory for summary/re-entry expansion.

## 9. Recommended Containment Strategies

### Sequencing constraints
- no default reflective summary/re-entry switch before dry-run parity pack completion
- validate `/session/[id]` and `/api/session-summary` separately before `/session/[id]/summary`
- require owner review before any user-visible switch

### Runtime caps and composition limits
- center exactly 1
- surfaced openings max 2 (target 1)
- neighborhood max 3
- ambient continuity max 3
- strict suppression-first filtering before ranking

### Visibility and demotion strategy
- low-confidence continuity defaults to ambient/internal
- conflicting signals trigger omission, not tie-breaking surfacing
- repeated defer/dismiss lowers future surfacing priority

### Rollback protections
- keep legacy summary/re-entry assembly callable and intact
- ensure reflective composition is disableable route-locally
- no persistence dependency on reflective read outputs

### Validation gates
- suppression/defer parity gate
- calmness/density gate
- lineage presence gate
- deterministic ordering gate
- no hidden canonicalization gate

## 10. Risk Severity Summary

| Risk | Severity | Current Exposure | Expansion Exposure | Mitigation Priority |
| --- | --- | --- | --- | --- |
| Continuity flooding | Critical | Medium | Critical | P0 |
| False narrative coherence | Critical | Medium | Critical | P0 |
| Emotional over-guidance | Critical | Low-Medium | Critical | P0 |
| Resurfacing pressure | High | Medium | Critical | P0 |
| Synthetic significance | High | Medium | High | P1 |
| Latent overreach | High | Low-Medium | High | P0 |
| Attention hijacking | High | Medium | High | P1 |
| Unresolved-task feeling | High | Medium | High | P1 |
| Pseudo-therapy drift | Critical | Low | Critical | P0 |
| Suppression/silence erosion | Critical | Medium | Critical | P0 |

Priority key:
- P0 = block expansion until controlled
- P1 = contain before wider rollout

## 11. Verdict

SAFE WITH STRICT CONTAINMENT

Reasoning:
- current architecture and B1/B2 governance prove bounded reflective expansion is feasible
- summary/re-entry has materially higher aggregation and authority-drift risk than prior switched surfaces
- dry-run expansion can proceed only with strict suppression/calmness gates, route-local rollback proof, and owner-reviewed parity evidence

Not safe for default reflective-first summary/re-entry switches without additional dry-run validation and explicit approval.

## 12. Recommended Next Tickets

1. `VALIDATION — Reflective Summary Payload Dry Run`
2. `VALIDATION — Reflective Re-entry Payload Dry Run`
3. `PLAN/BUILD — Opening Lineage Precision Tightening` (recommended before broader expansion)
4. `PLAN — Summary/Re-entry Owner Approval Criteria`

Recommended sequence:
1. summary payload dry-run parity
2. re-entry payload dry-run parity
3. lineage precision tightening if drift signals confirm need
4. owner approval criteria pack before any guarded switch planning

## Validation

Docs/audit only.

- No runtime changes
- No route/API switches
- No schema/Supabase changes
