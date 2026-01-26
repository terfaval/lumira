# Ticket B — Latest pointer & schema contract audit completion

## 1) Writers: latest pointers

### observation_latest
- `app/api/observe/route.ts` -> `upsertObservationLatest(...)` after `insertObservationVersionIfMissing(...)`
- `src/orchestration/jobs/jobExtractObservation.ts` -> `upsertObservationLatest(...)` after `insertObservationVersionIfMissing(...)`
- Repository write helper: `src/db/repositories/observationRepo.ts` (`upsertObservationLatest`)

### session_index_latest
- `app/api/index-session/route.ts` -> `upsertSessionIndexLatest(...)` after `insertSessionIndexVersionIfMissing(...)`
- `src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts` -> `upsertSessionIndexLatest(...)` after `insertSessionIndexVersionIfMissing(...)`
- Repository write helper: `src/db/repositories/sessionIndexRepo.ts` (`upsertSessionIndexLatest`)

## 2) Consumers: observation_latest.payload -> expected fields

Legend:
- **DreamObservation** = `src/lib/dream/observation.ts` (entities.characters/places/objects/other + motifs/tone/structure/body + safety)
- **ObservationPayloadV0** = `src/domain/observe/extractObservationFromEntries.ts` (summary/scenes/entities.people/places/objects/themes_words/raw_facts)

| Consumer | File | Expected fields (contract) | Schema type |
|---|---|---|---|
| `fetchExistingObservation` | `app/api/observe/route.ts` | `parseDreamObservation(...)` -> DreamObservation shape | DreamObservation |
| `fetchObservation` (synthesize) | `app/api/synthesize/route.ts` | `parseDreamObservation(...)`, `compactDreamObservation(...)`, `anchorsFromObservation(...)` | DreamObservation |
| `work-block/next` | `app/api/work-block/next/route.ts` | `payload.entities.characters/places/objects/other`, `payload.motifs/tone/structure/body`, `payload.beats` | DreamObservation + non‑existent `beats` |
| `jobBuildSessionIndexFromObservation` | `src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts` -> `buildSessionIndexFromObservation` | `summary`, `raw_facts`, `entities.people/places/objects/themes_words`, `scenes.*` | ObservationPayloadV0 |
| `ensureAnchorsRanked` | `src/orchestration/ensureAnchorsRanked.ts` -> `rankAnchors` | `entities.people/places/objects/themes_words`, `scenes.*`, `raw_facts` | ObservationPayloadV0 |
| `jobUpdateLatent` | `src/orchestration/jobs/jobUpdateLatent.ts` -> `updateLatentFromMaterial` | `observation` passed into LLM prompt (no runtime guard) | ObservationPayloadV0 (per comments) |
| `extractSalientElements` | `src/domain/latent/extractSalientElements.ts` | `entities.places/people/objects/characters` | mixed (DreamObservation + V0) |
| `jobGenerateFrame` | `src/orchestration/jobs/jobGenerateFrame.ts` -> `generateFrameFromLatent` | `extractTopAnchors` uses `entities.people/places/objects`, `raw_facts`, `entities.themes_words`, `scenes.*` | ObservationPayloadV0 |

## 3) Consumers: session_index_latest.payload -> expected fields

**SessionIndexPayloadV0** (local schema):  
`anchor_summary`, `keyphrases`, `entities.people/places/objects`

| Consumer | File | Expected fields (contract) |
|---|---|---|
| `jobUpdateLatent` | `src/orchestration/jobs/jobUpdateLatent.ts` -> `updateLatentFromMaterial` | SessionIndexPayloadV0 (prompt input) |
| `jobGenerateFrame` | `src/orchestration/jobs/jobGenerateFrame.ts` -> `generateFrameFromLatent` | SessionIndexPayloadV0 (prompt input) |
| `app/api/session/ensure` | `app/api/session/ensure/route.ts` (fallback load only) | No direct field access |

## 4) Local repro steps

R1 — DreamObservation -> session index job (V0 consumer) mismatch
1) Create a session + raw entry, then call `POST /api/observe` for that session (this writes DreamObservation into `observation_versions` and updates `observation_latest`).
2) Call `POST /api/session/ensure` with `{ session_id, run: { session_index: true } }` (or call the job path in your harness).
Expected: `jobBuildSessionIndexFromObservation` reads DreamObservation but expects V0 -> low/empty `anchor_summary`/`keyphrases`.

R2 — DreamObservation -> frame anchors empty
1) Ensure `observation_latest` points to a DreamObservation (same as R1 step 1).
2) Trigger `jobGenerateFrame` (e.g., `POST /api/session/ensure` with `{ run: { frame: true } }`).
Expected: `extractTopAnchors` reads `entities.people/places/objects`, `raw_facts`, `scenes.*` -> missing -> `topAnchors` empty -> repairs/fallbacks more likely.

## 5) RetryableError logging

Where RetryableError reasons are logged:
- `src/lib/openai/modelRouting.ts` -> `logModelTrace(...)` on both success and retry paths (used by `callWithRetries`)
- Explicit log points:
  - `src/domain/work/composer/CardComposer.ts` (logs on parse/schema failures within inner loop)
  - `src/domain/frame/generateFrameFromLatent.ts` (logs on repair calls)

Routes/jobs that **do not** log RetryableError reasons (no `callWithRetries`):
- `app/api/synthesize/route.ts` (direct OpenAI call)
- `app/api/index-session/route.ts` (direct OpenAI + embeddings)
- `src/domain/index/buildSessionIndexFromObservation.ts` (direct OpenAI + embeddings)

