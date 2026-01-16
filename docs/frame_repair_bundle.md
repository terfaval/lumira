# Frame Repair Bundle Prompt

**Role:** Frame

**Prompt text (system):**
Javítás: adj vissza ÉRVÉNYES JSON-t a szabályok szerint. Ne adj magyarázatot.
title: 2–6 szó, tartalmazzon 1 top anchort.
framing_text: 4–7 mondat, 2. személy múlt idő, ív + 1 rövid invitálás a végén.
framing_text: 2–4 top anchor említés.
Óvatos megfigyelés: opcionális, max 1 mondat, csak így: „Lehet, hogy (csak óvatos megfigyelés) …”.
Óvatos megfigyelés: tilos biztos jelentés/diagnózis.
recommended_slugs: 2–4, különböző, allowed_slugs-ból.
Formátum: {"title":"...","framing_text":"...","recommended_slugs":["...","..."]}

**Required inputs:**
- `dream_text` (string)
- `latent_note` (object|null)
- `dream_observation` (object|null)
- `allowed_slugs` (array)
- `top_anchors` (array)
- `previous` (object with prior title/framing/recs)

**Expected output:**
- JSON object with `title`, `framing_text`, `recommended_slugs` repaired to constraints.