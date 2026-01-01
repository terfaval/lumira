# MIRA – jelenlegi útvonal- és képernyő-összefoglaló

## Fő belépési pontok
- `/` – Auth gate, belépett felhasználót a dream tér alap belépőjére (`/new`) viszi.
- `/login`, `/signup` – auth.

## Álomtér
- `/new` – "üres közép" rögzítés, innen indul az új álomsesszió.
- `/sessions` – folyamatban lévő sessionök listája és folytatás.
- `/session/[id]` – összkép/áttekintés (olvasás + továbblépési linkek).
- `/session/[id]/frame` – keretezés.
- `/session/[id]/direction` – irányválasztás katalógus alapján.
- `/session/[id]/work` – blokk/kártya alapú feldolgozás.
- `/archive` – archivált/lezárt sessionök olvasása.

## Esti tér
- `/evening` – esti tér nyitó.
- `/evening/cards` – esti kártya katalógus.
- `/evening/card/[slug]` – kártya előnézet.
- `/evening/run/[slug]` – lépés-alapú kártyafuttatás, kilépés a katalógusra.