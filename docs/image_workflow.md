🔁 Lumira background újragenerálási folyamat (LOCAL)
0️⃣ Előfeltétel

módosítottad a presetet (lumira_core_space_v1.ts)

nem fut a dev szerver

1️⃣ Local dev leállítása (ha fut)

Ha fut:

Ctrl + C

2️⃣ Presetek újraseedelése (EZ A “SEED PARANCS”)

👉 EZT keresed:

Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/image/presets/seed


✅ Ez:

upserteli a preset registryt

verziót frissít

NEM generál képet

csak adatot készít elő

Ha 200 OK, jó vagy.

3️⃣ Dev szerver indítása
npm run dev


Várd meg:

Ready on http://localhost:3000

4️⃣ Kép generálása (konkrét preset + variáns)

Most jön az igazi render.

Night újragenerálása:
Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/image/generate `
  -ContentType application/json `
  -Body '{
    "preset_id": "lumira_core_space",
    "variant": "night",
    "debug": true
  }'

5️⃣ Kép megnyitása

A válaszban kapsz:

url

supabase_path

👉 a url-t másold be böngészőbe
👉 EZ az új kép, nem cache

🧠 Gyors mentális modell (jegyezd meg)
Lépés	Mit csinál
/presets/seed	presetek frissítése
npm run dev	API él
/image/generate	tényleges render
Supabase URL	kanonikus output
❗ Gyakori hibák (ha nem változik a kép)

❌ nem fut a dev szerver → seed nem él

❌ cache-elt URL-t nézed → mindig új job_id

❌ rossz preset_id → ellenőrizd: lumira_core_space

❌ variáns elgépelés → night, nem Night