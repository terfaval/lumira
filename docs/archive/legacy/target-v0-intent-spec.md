# Target v0 Intent Specification

## Observation
**Intent**
- Extract non-interpretive observations from dream text and Q/A context into a strict JSON schema with evidence.

**MUST**
- Use evidence quotes or tight paraphrases for every label.
- Preserve full schema keys for entities, beats, motifs, tone, structure, body, safety.
- Remain descriptive only; no interpretation or advice.

**MUST NOT**
- Infer meaning, diagnose, or add psychoanalytic interpretations.
- Invent anchors not present in observed text.

---

## Latent
**Intent**
- Synthesize anchors, candidate directions, and a question seed from observation with strict JSON output.

**MUST**
- Treat observation as primary truth for anchors and target_anchor.
- Apply safety and too-short gating to prevent recommendations.
- Keep preferred_style within allowed style list.

**MUST NOT**
- Invent anchors outside observation labels/evidence.
- Produce recommendations when safety flags are triggered.

---

## Frame
**Intent**
- Generate a short framing paragraph and title that reflect observed anchors and a gentle, non-diagnostic stance.

**MUST**
- Write in Hungarian, second-person past tense.
- Produce 4–7 sentence framing with a brief invitational close.
- Include top anchors (title: ≥1; framing: ≥2–4).
- Avoid strong interpretation; allow at most one cautious observation.

**MUST NOT**
- Use diagnostic or authoritative claims.
- Deviate from the required tone or sentence window.

---

## Direction
**Intent**
- Recommend 2–4 direction slugs aligned with observation-derived anchors and catalog constraints.

**MUST**
- Only output allowed slugs from the catalog.
- Provide 2–4 distinct recommendations.

**MUST NOT**
- Recommend directions when safety gating blocks output.
- Output non-catalog slugs or duplicates.

---

## Work
**Intent**
- Compose a work block (lead_in + question) aligned to direction profile, observation, and novelty constraints.

**MUST**
- Output strict JSON with lead_in + question format rules.
- Follow direction question_style and anchor policy (required/preferred/optional).
- Avoid repeating previous questions or reusing anchor keys.
- Use safety tone modifiers when safety flags present.

**MUST NOT**
- Interpret or diagnose.
- Ask multi-question prompts or include lists/colons in the question sentence.

---

## Glossary
**Intent**
- Serve as cross-session memory for user-defined anchors, notes, and recurrence signals.

**MUST**
- Index occurrences against sessions and observation traces.
- Respect do_not_surface flags in selection and phrasing.

**MUST NOT**
- Inject glossary notes without traceable occurrence evidence.
- Override observation-derived anchors with unverified glossary terms.