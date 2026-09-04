# Autó a helyszínre — telepítési útmutató

Ez a mini webalkalmazás egyetlen dolgot csinál: a felhasználó feltölt egy
autófotót, és a szerver a fal.ai-jal beleilleszti egy előre beállított
háttérképbe. A háttér és a prompt fixen be van drótozva, a felhasználó
csak a "Autó a helyszínre" gombot látja.

## 1\. Cseréld le a háttérképet

Töröld le a `public/background.jpg` fájlt, és tedd a helyére a saját,
állandó háttérfotódat **pontosan `background.jpg` néven**, a `public`
mappába. (Ha PNG-t akarsz használni, nevezd át `background.jpg`-re, vagy
írd át a fájlnevet az `api/generate.js` tetején a `BACKGROUND\_FILENAME`
értéket.)

## 2\. Töltsd fel GitHubra

1. Hozz létre egy új, üres repót a [github.com/new](https://github.com/new) oldalon.
2. Ebben a mappában (`car-compositor`) futtasd:

```bash
git init
git add .
git commit -m "Első verzió"
git branch -M main
git remote add origin https://github.com/ugraigergo/car\_compositor
git push -u origin main
```

## 3\. Deployold Vercelre

1. Menj a [vercel.com](https://vercel.com)-ra, jelentkezz be GitHub fiókkal.
2. "Add New Project" → válaszd ki az imént feltöltött repót.
3. A build beállításokat nem kell módosítani (nincs framework, ez rendben van).
4. Mielőtt rákattintanál a "Deploy"-ra, nyisd meg az **Environment Variables**
szekciót, és add hozzá:

   * **Name**: `FAL\_KEY`
   * **Value**: a saját fal.ai API kulcsod
5. Kattints "Deploy"-ra. Pár másodperc múlva megkapod a saját linket, pl.
`https://car-compositor-xyz.vercel.app`.

## 4\. Használat telefonon, mint egy app

Nyisd meg a linket a telefonod böngészőjében, majd:

* **iPhone (Safari)**: Megosztás ikon → "Kezdőképernyőhöz adás"
* **Android (Chrome)**: ⋮ menü → "Hozzáadás a kezdőképernyőhöz"

Ezután egy ikon jelenik meg a kezdőképernyőn, amire kattintva úgy nyílik
meg az oldal, mintha egy app lenne — nincs böngészősáv, nincs URL.

## Ha módosítani akarod a promptot vagy a modellt

Az `api/generate.js` fájl tetején található a `PROMPT` konstans és a
`fal.subscribe(...)` hívásban a modell neve
(`fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product`). Ha más
modellt szeretnél kipróbálni, a [fal.ai/models](https://fal.ai/models)
oldalon böngészheted a lehetőségeket.

## Költség

A jelenlegi modell kb. $0.035 / megapixel képenként — egy 1–2 megapixeles
kép generálása néhány centbe kerül. Ehhez ráadásul a fal.ai storage
feltöltés (a beküldött autófotóé) ingyenes.

