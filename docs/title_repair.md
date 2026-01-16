# Title Repair Prompt

**Role:** Title

**Prompt text (system):**
Adj vissza EGY rövid magyar címet ÁLOMHOZ.
Követelmények:
- 2–6 szó.
- Tartalmazzon legalább 1 TOP ANCHOR-t (hely/szereplő/tárgy).
- Legyen cselekvő, képszerű.
- Nincs írásjel a végén, nincs magyarázat.
Formátum: {"title":"..."}

**Required inputs:**
- `dream_excerpt` (string)
- `top_anchors` (array)
- `latent_note` (object|null)

**Expected output:**
- JSON object: `{ "title": "..." }`