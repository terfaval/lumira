# AI Provider Decision Guide (Image + Text)

Goal: help decide when to keep the current provider vs. route some requests to another API, for both image generation and text generation.

## Current baseline in this repo

Image pipeline:
- Entry point: `app/api/image/generate/route.ts` builds the OpenAI renderer and calls `generateImage(...)`.
- Pipeline: `src/domain/image/pipeline/generateImage.ts` assembles prompt/negative prompt, creates an image job, renders via the selected renderer, and uploads to Supabase.
- Renderers: `src/domain/image/render/OpenAIImageAdapter.ts`.

Text generation:
- OpenAI chat completions are called in multiple domains:
  - Observe extraction: `app/api/observe/route.ts`, `src/domain/observe/extractObservationFromEntries.ts`
  - Frame generation / repair: `src/domain/frame/generateFrameFromLatent.ts`
  - Latent updates: `src/domain/latent/updateLatentFromMaterial.ts`
  - Indexing: `src/domain/index/buildSessionIndexFromObservation.ts`
  - Work card compose: `src/domain/work/composer/CardComposer.ts`
- Shared wrapper and model env: `src/lib/openai/server.ts` (model names like `OPENAI_EMBED_MODEL`).

Implication: today the system assumes a single primary text provider, and image provider is runtime-switchable with env only (no per-request routing).

## Decision criteria (image)

Use these to compare current provider vs. alternatives:
- Visual fidelity vs. prompt adherence
- Style consistency with existing presets
- Resolution / aspect ratio constraints
- Latency (p50/p95) and variability
- Cost per image + retries
- Failure modes (timeouts, safety blocks, invalid outputs)
- IP/licensing terms (training data, commercial rights)
- Operational burden (self-hosting, GPU capacity, queueing, updates)
- Feature needs: reference image, ControlNet, LoRA, inpainting, etc.

Typical signs you should add a second image provider:
- You need strict style control or custom nodes (consider a workflow-specific renderer).
- You need fast, cheap, consistent "good enough" images at scale (API wins).
- You need a fallback when the primary provider rate-limits or fails.

## Decision criteria (text)

Use these to compare OpenAI vs. other LLM APIs:
- Instruction adherence on Hungarian prompts (especially structured JSON)
- Determinism / repair frequency (how often you need retries)
- Latency and cost for long context
- Safety and policy fit with the product
- Output calibration (tone, subtlety, avoiding hallucination)
- Tooling: function calling, structured output, JSON schema, embeddings
- Stability and backward compatibility

Typical signs you should add a second text provider:
- A subtask is narrow and can be done cheaper (e.g., embeddings, simple extraction).
- A subtask is fragile and another model is more reliable (e.g., strict JSON).
- You want routing by language / content type / latency target.

## Routing strategy options

Option A: single provider per capability (status quo)
- Simple, but you cannot optimize by task or cost.

Option B: "primary + fallback"
- Select primary by env.
- On hard failure or timeout, retry once with a fallback provider.

Option C: per-task routing
- Define a router for each major task, e.g.:
  - image_background: openai vs secondary renderer
  - observe_extract: model A
  - frame_generate: model B
  - glossary/index/embedding: model C

Option D: hybrid by data sensitivity
- Local/hosted for sensitive data; external API for non-sensitive.

## Suggested decision flow (practical)

1) Pick one narrow task to evaluate (example: "frame generation" or "image background").
2) Define success metrics:
   - Accuracy / quality rubric (human review)
   - Parse success rate for JSON
   - Average cost
   - p95 latency
3) Run an offline A/B with a fixed dataset.
4) If improvement is clear, add routing behind a feature flag.
5) Add a fallback path with clear observability.

## Implementation touchpoints (if you decide to route)

Image:
- Add a `ImageRendererRouter` that picks a renderer per request, not only by env.
- Use request attributes to route:
  - preset_id / variant / reference_image / size / style complexity
- Keep the existing `ImageRenderer` interface so the pipeline stays stable.

Text:
- Introduce a provider-agnostic interface (e.g., `TextGenerator`).
- Implement adapters for each provider.
- Centralize routing policy (a router module) so tasks can request by "capability."

## Simple scoring matrix (start here)

Score each provider 1-5 (higher is better), multiply by weight:
- Quality / faithfulness (x3)
- JSON/structure reliability (x3, for text)
- Latency (x2)
- Cost (x2)
- Operational burden (x2)
- Policy fit / safety (x2)
- Feature coverage (x2)

Sum the weighted scores, but treat it as a guide, not a verdict.

## Risk checklist

- Vendor lock-in (API or model churn)
- Output shifts after silent model updates
- Safety policy blocking edge cases
- Cost spikes or rate-limit throttling
- Increased complexity from multiple providers

## Quick recommendations for this repo (starting point)

Image:
- Keep OpenAI as default for now (simple, fast), use a secondary renderer for:
  - fine control (reference images, LoRA, custom style)
  - tricky prompts that require strict adherence
- Add a fallback for OpenAI failures to a secondary renderer (or vice versa).

Text:
- Keep OpenAI for the structured JSON-heavy tasks (frame/observe/index) unless another provider beats it on parse success.
- Consider a cheaper model for low-risk tasks (short prompts, non-critical outputs).

## Migration checklist

- Define task-level routes and SLAs
- Add logging: provider, model, cost, latency, parse success
- Feature-flag provider routing
- Offline evaluation suite (golden set)
- Error budget + fallback behavior
- Update env/config docs

If you want, I can turn this into an actionable plan:
1) add the router interfaces + feature flags
2) create a small evaluation harness
3) wire telemetry for cost/latency/error
