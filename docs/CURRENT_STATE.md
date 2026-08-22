# Lumira Current State

Last updated: 2026-08-19 UTC

## Purpose

This document is Lumira's operational re-entry snapshot.

Use it to understand present operational reality in a few minutes.

This document is:
- a navigation summary
- a current-state snapshot
- subordinate to source evidence

This document is not:
- philosophy authority
- runtime contract authority
- a ledger
- a roadmap
- a plan

## Current Goal

Prepare Lumira for public alpha by stabilizing the live reflection path and reducing confusion around unfinished or partial surfaces.

## Active Workstreams

- Reflection MVP stabilization: tighten the real user path from capture into reflection and return-time continuity.
- Operational documentation stabilization: improve onboarding, navigation, and safe re-entry for owners, coordinators, contributors, and agents.
- Observation V3 post-cutover stewardship: preserve the closure record, keep compatibility residue bounded, and treat broader V2 cleanup as a separate workstream.

## Readiness Summary

- Canon, runtime, architecture, navigation, and coordinator infrastructure are in usable shape.
- A real reflection path now exists, but it remains constrained and not yet fully coherent across all adjacent surfaces.
- The product is no longer in pure theory/planning mode; implemented runtime and UI now support meaningful reflection work within a limited path.
- Operational re-entry remains a documentation problem more than a philosophy or runtime-design problem.
- Observation V3 is now constitutionally closed with stewardship observations on the post-stabilization repository evidence state and has been cut over as the active runtime Observation authority.
- Observation V3 runtime-cutover work is closed; further generic Observation V3 cognition hardening is not the current stabilization requirement.

## Top Risks

- Placeholder or partially integrated surfaces can still mislead returning users and contributors about what is actually live.
- Current implementation reality is still easiest to reconstruct from recent audits plus recent ledger entries, not from a single operational summary source.
- Continuity and thread behavior exist, but the lived reflection loop is still lighter and narrower than the full thread-first model.

## Recent Material Changes

- The homepage orientation hub received multiple convergence and polish passes, making the homepage a more intentional entry surface.
- Reflection MVP audits now classify the first reflection cycle as real but constrained, rather than missing entirely.
- Documentation navigation has been stabilized around `docs/DOCS_INDEX.md`, with clearer authority layers and onboarding paths.
- Observation V3 completed STAB-09 baseline refresh and STAB-10 formal constitutional closure review on Monday, August 10, 2026; as of Tuesday, August 18, 2026, runtime authority cutover makes V3 the active Observation authority while V2 remains bounded compatibility data.
- The accepted post-cutover benchmark baseline is `20260818T195354Z-obs-v3-full-benchmark-baseline`, preserving `17/17 fully_replayable` and `17/17 admitted_with_observations`.

## Read Next

- Primary navigation: `docs/DOCS_INDEX.md`
- Reflection runtime reality:
  - `docs/superpowers/audits/reflection-mvp-reality-recheck-v1.md`
  - `docs/superpowers/audits/reflection-thread-reality-audit-v1.md`
- Chronology and completed build history:
  - recent relevant entries in `docs/STABILIZATION_LEDGER.md`
- Observation V3 closure and post-closure runtime boundary:
  - `docs/v2-build/observation/Observation-V3-Constitutional-Closure-Criteria.md`
  - `docs/v2-build/observation/Observation-V3-Runtime-Cutover-Prerequisites.md`
- Current operating guidance:
  - `docs/AGENT_START_HERE.md`
  - `AGENTS.md`

## Authority Notes

- Canon remains authoritative for philosophy and product identity.
- Runtime documents remain authoritative for behavior and contracts.
- Audits remain authoritative for evidence-backed reality classification.
- The ledger remains authoritative for chronology and build history.
- Plans remain authoritative for future intent.
- Observation V3 is the active runtime Observation authority on normal live flows; legacy Observation writes are compatibility-only and cannot establish authoritative Observation state.
- Residual non-blocking debt remains separate from cutover closure: standalone `typecheck` is red in `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`, `default_v2` remains in compatibility vocabulary, and broader V2 residue cleanup is a later workstream.

This snapshot summarizes. It does not replace those sources.

## Update Guidance

Update this document only when:
- a major workstream changes
- readiness classification changes
- a milestone completion materially changes contributor understanding
- a material decision changes what returning people need to know first

Do not update this document for every ticket.
