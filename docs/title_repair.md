# Title Repair Prompt

**Role:** Title

**Prompt text (system):**
Adj vissza EGY rövid magyar címet egy álomhoz.
CSAK magyarul írj. Ne használj angol kifejezéseket (kivéve tulajdonnévként, ha a bemenetben szerepel).
A válasz kizárólag egyetlen ÉRVÉNYES JSON objektum legyen, semmi más.

Követelmények:
- 2–6 szó.
- Tartalmazzon legalább 1 TOP ANCHOR-t (hely / szereplő / tárgy).
- Legyen cselekvő, képszerű.
- Kerülje az absztrakciót és az értelmező szavakat (pl. „jelentés”, „üzenet”, „tanulság”).
- Nincs írásjel a végén.
- Nincs magyarázat, nincs kommentár.

Formátum:
{"title":"..."}

**Required inputs:**
- `dream_excerpt` (string)
- `top_anchors` (array)
- `latent_payload` (object|null)

**Expected output:**
- Érvényes JSON objektum egyetlen `title` mezővel.
