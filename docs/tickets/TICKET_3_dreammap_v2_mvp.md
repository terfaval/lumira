# TICKET 3 — DreamMap v2 MVP

## Scope summary
- Node identity = glossary_terms.id (term_id). archetype_term_id is metadata only.
- Evidence-first edges from dream_entry_highlights; glossary_occurrences only as fallback evidence.
- XY projection uses AXIS_LEXICON_V2 (deterministic, hardcoded, debuggable).

## MVP notes / constraints
- Pruning: MVP does not guarantee graph connectivity; top-weight trimming only.
- Build endpoints exist regardless of flag; UI gating uses NEXT_PUBLIC_DREAMMAP_V2.
- If <2 terms have highlight evidence in timeframe, build returns nodes only with meta.reason = "insufficient_evidence".

## Full-scope reminder (separate track)
- Highlight -> pin flow: ensure all highlight call sites use allowCreate:false (check Highlights step page, DreamRawPanel, session summary highlights, any quick-add UI).
- Pin action parity: anywhere saved highlights are listed, ensure "Pin to Lexikon" is available (or reuse HighlightsPanel handler).
