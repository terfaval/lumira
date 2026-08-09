# Observation V3 Remaining Issue Register

Date: 2026-08-09
Tickets: `OBS-V3-STAB-01`, `OBS-V3-STAB-02`, `OBS-V3-STAB-03`, `OBS-V3-STAB-04`
Status: active stabilization register

## OV3-RI-01

Title: Final-candidate completeness lifecycle gap

Classification: `CONSTITUTIONAL CLOSURE BLOCKER`

Evidence:

- [shadow-pipeline.ts](C:/mira/src/cognition/observation-v3/pipeline/shadow-pipeline.ts:312)
- [shadow-pipeline.ts](C:/mira/src/cognition/observation-v3/pipeline/shadow-pipeline.ts:556)
- [Observation-V3-Full-Benchmark-Baseline-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md:102)
- [Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md:1)

Owner subsystem: `pipeline / completeness-analysis / authority-admission`

Severity: high

Closure impact: resolved by `STAB-03`

Cutover impact: resolved by `STAB-03`

Prerequisites: none

Proposed resolution:

- implemented explicit `post_composition` final-candidate Completeness so Admission evaluates the final candidate on a coherent completeness basis

Validation requirement:

- representative benchmark replay proving Admission consumes final `C2` Completeness and preserves deterministic replay

Status: resolved on shadow path - baseline refresh still pending in later stabilization

## OV3-RI-02

Title: Universal deferral root cause remains under-partitioned

Classification: `CONSTITUTIONAL CLOSURE BLOCKER`

Evidence:

- [Observation-V3-Full-Benchmark-Baseline-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md:104)
- [admission-evaluator.ts](C:/mira/src/cognition/observation-v3/authority-admission/admission-evaluator.ts:150)
- [Observation-V3-Universal-Deferral-Root-Cause-Matrix.md](C:/mira/docs/v2-build/observation/Observation-V3-Universal-Deferral-Root-Cause-Matrix.md:1)

Owner subsystem: `authority-admission / validation`

Severity: high

Closure impact: resolved by prior partitioning and `STAB-03`

Cutover impact: still blocking until later semantic and policy phases complete

Prerequisites: `OV3-RI-01`

Proposed resolution:

- keep the partitioned root-cause matrix as the active governance baseline and repair `OV3-RI-01` before any later policy calibration

Validation requirement:

- refreshed corpus-wide disposition classification

Status: partitioned by evidence - downstream semantic and policy work pending

## OV3-RI-14

Title: Completeness source identity hashing is inconsistent with pipeline source identity

Classification: `CONSTITUTIONAL CLOSURE BLOCKER`

Evidence:

- [admission-findings.ts](C:/mira/src/cognition/observation-v3/authority-admission/admission-findings.ts:113)
- [completeness-analyzer.ts](C:/mira/src/cognition/observation-v3/completeness-analysis/completeness-analyzer.ts:349)
- [Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md:1)

Owner subsystem: `completeness-analysis / pipeline / authority-admission`

Severity: high

Closure impact: resolved by `STAB-03`

Cutover impact: resolved by `STAB-03`

Prerequisites: none

Proposed resolution:

- aligned final Completeness source identity with the authoritative pipeline source identity in `STAB-03`

Validation requirement:

- targeted Admission and pipeline tests proving post-composition Completeness carries authoritative source identity

Status: resolved on shadow path

## OV3-RI-03

Title: Completed pipeline can retain a deferral-shaped terminal summary

Classification: `OPERATIONAL HARDENING`

Evidence:

- [pipeline-runner.ts](C:/mira/src/cognition/observation-v3/pipeline/pipeline-runner.ts:233)
- [pipeline-summary.ts](C:/mira/src/cognition/observation-v3/pipeline/pipeline-summary.ts:3)
- [Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md:1)

Owner subsystem: `pipeline`

Severity: medium

Closure impact: non-blocking unless lifecycle remains incoherent

Cutover impact: medium

Prerequisites: `OV3-RI-01`

Proposed resolution:

- distinguish pipeline completion state from admission disposition once the lifecycle contract is repaired

Validation requirement:

- pipeline summary regression tests covering supplemental-executed cases

Status: diagnosis confirmed - repair after `OV3-RI-01`

## OV3-RI-04

Title: Short coherent dreams still trigger unnecessary supplemental activation

Classification: `QUALITY STABILIZATION`

Evidence:

- [Observation-V3-V2-Comparison-Report-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md:25)
- [Observation-V3-End-to-End-Semantic-Validation-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-End-to-End-Semantic-Validation-2026-08.md:88)

Owner subsystem: `supplemental-realization`

Severity: high

Closure impact: non-blocking

Cutover impact: blocking

Prerequisites: `OV3-RI-01`

Proposed resolution:

- harden abstention so recovery does not activate on already-complete short coherent dreams

Validation requirement:

- targeted `OBS-A-002` regression and short-control family rerun

Status: resolved on shadow path by `STAB-04` for the `not_required` activation seam; broader overlap-heavy uncertainty degradation remains separately open under `OV3-RI-05`

## OV3-RI-05

Title: Overlap-heavy uncertainty cases still degrade candidate quality

Classification: `QUALITY STABILIZATION`

Evidence:

- [Observation-V3-V2-Comparison-Report-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md:33)
- [Observation-V3-End-to-End-Semantic-Validation-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-End-to-End-Semantic-Validation-2026-08.md:89)

Owner subsystem: `memory-composition`

Severity: high

Closure impact: non-blocking if fail-closed governance remains coherent

Cutover impact: blocking

Prerequisites: `OV3-RI-01`

Proposed resolution:

- tighten overlap governance and preserve uncertainty without restating it as new recovered descriptive truth

Validation requirement:

- targeted `OBS-E-001` regression and uncertainty-heavy overlap controls

Status: resolved on shadow path by `STAB-05`; historical overlap-heavy redundant Supplemental restatements are now governed in Composition without strengthening baseline uncertainty, while fresh targeted-recovery reliability remains separately open under `OV3-RI-06`

## OV3-RI-06

Title: Fresh targeted-recovery reliability remains incomplete on `OBS-H-002`

Classification: `OPERATIONAL HARDENING`

Evidence:

- [Observation-V3-Production-Candidacy-Assessment.md](C:/mira/docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md:45)

Owner subsystem: `supplemental-realization`

Severity: medium-high

Closure impact: non-blocking unless lifecycle diagnosis proves otherwise

Cutover impact: blocking

Prerequisites: `OV3-RI-01`

Proposed resolution:

- harden targeted-recovery reliability and bounded cost/latency behavior

Validation requirement:

- repeated fresh `OBS-H-002` runs with cost/latency summaries

Status: open

## OV3-RI-07

Title: Active V3 path still carries V2-shaped internal residue

Classification: `TECHNICAL DEBT`

Evidence:

- [shadow-pipeline.ts](C:/mira/src/cognition/observation-v3/pipeline/shadow-pipeline.ts:45)
- [Observation-V3-Technical-Debt-Register.md](C:/mira/docs/v2-build/observation/Observation-V3-Technical-Debt-Register.md:1)

Owner subsystem: `descriptive-extraction / pipeline / memory-composition`

Severity: medium

Closure impact: non-blocking after hardening, but must remain explicit

Cutover impact: medium-high

Prerequisites: none

Proposed resolution:

- isolate coexistence bridges and remove misleading active-shape residue from native V3 seams where practical

Validation requirement:

- updated residue inventory and focused contract tests

Status: open

## OV3-RI-08

Title: Transition propagation remains under-realized end to end

Classification: `TECHNICAL DEBT`

Evidence:

- [Observation-V3-Constitutional-Architecture-Review-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Constitutional-Architecture-Review-2026-08.md:390)
- [Observation-V3-Technical-Debt-Register.md](C:/mira/docs/v2-build/observation/Observation-V3-Technical-Debt-Register.md:1)

Owner subsystem: `memory-composition / memory-realization`

Severity: medium

Closure impact: likely stewardship observation, not blocking

Cutover impact: medium

Prerequisites: none

Proposed resolution:

- either complete native transition propagation or keep the limitation explicitly bounded for closure

Validation requirement:

- fragmentation-heavy transition benchmarks

Status: open

## OV3-RI-09

Title: V3 has no primary-runtime persistence, read, routing, or rollback path

Classification: `RUNTIME CUTOVER BLOCKER`

Evidence:

- [src/domain/observation/README.md](C:/mira/src/domain/observation/README.md:3)
- [src/domain/observation/contracts.ts](C:/mira/src/domain/observation/contracts.ts:19)

Owner subsystem: `runtime integration`

Severity: high

Closure impact: non-blocking

Cutover impact: blocking

Prerequisites: constitutional closure

Proposed resolution:

- define and then implement a V3-native authoritative runtime path with rollback and coexistence boundaries

Validation requirement:

- integration tests, repository tests, rollout flag tests, rollback drills

Status: open

## OV3-RI-10

Title: Production evidence beyond the 17-case corpus is still insufficient

Classification: `RUNTIME CUTOVER BLOCKER`

Evidence:

- [Observation-V3-Production-Candidacy-Assessment.md](C:/mira/docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md:21)
- [Observation-V3-End-to-End-Semantic-Validation-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-End-to-End-Semantic-Validation-2026-08.md:76)

Owner subsystem: `validation / runtime readiness`

Severity: high

Closure impact: non-blocking after repairs

Cutover impact: blocking

Prerequisites: `OV3-RI-01` through `OV3-RI-06`

Proposed resolution:

- refresh the full baseline and add targeted benchmark families plus expanded real-world shadow validation

Validation requirement:

- full rerun plus fresh evidence families

Status: open

## OV3-RI-11

Title: Architecture document still carries resolved pre-hardening blocker language

Classification: `TECHNICAL DEBT`

Evidence:

- [Observation-V3-Architecture.md](C:/mira/docs/v2-build/observation/Observation-V3-Architecture.md:526)

Owner subsystem: `documentation`

Severity: low

Closure impact: non-blocking but should be corrected before closure review

Cutover impact: low

Prerequisites: none

Proposed resolution:

- refresh architecture status language and point future readers to the readiness review

Validation requirement:

- documentation consistency check

Status: open

## OV3-RI-12

Title: Resolved architecture blockers F1 and F2 require no further implementation repair

Classification: `NO ACTION REQUIRED`

Evidence:

- [Observation-V3-Constitutional-Hardening-Report-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Constitutional-Hardening-Report-2026-08.md:7)

Owner subsystem: `architecture`

Severity: none

Closure impact: none

Cutover impact: none

Prerequisites: none

Proposed resolution:

- keep as historical evidence; refresh status references only

Validation requirement:

- none beyond doc consistency

Status: closed-by-evidence

## OV3-RI-13

Title: Reserved policy fields and currently unused contract branches are acceptable in the frozen shadow boundary

Classification: `NO ACTION REQUIRED`

Evidence:

- [Observation-V3-Authority-Admission-Shadow-Stability-Review-2026-08.md](C:/mira/docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Stability-Review-2026-08.md:142)

Owner subsystem: `authority-admission`

Severity: none

Closure impact: none

Cutover impact: low

Prerequisites: none

Proposed resolution:

- document clearly; do not widen repair scope solely because these fields are reserved

Validation requirement:

- none beyond doc clarity

Status: accepted-by-design
