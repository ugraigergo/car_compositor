import { fal } from "@fal-ai/client";

// A fal.ai kulcsot a Vercel "Environment Variables" beállításából olvassuk,
// SOHA nem írjuk bele a kódba.
fal.config({
  credentials: process.env.FAL_KEY,
});

// A háttérkép fix, statikus fájlként van a /public mappában.
// A generate.js automatikusan a saját domainedről tölti be, tehát
// nem kell semmilyen linket megadni, csak lecserélni a fájlt.
const BACKGROUND_FILENAME = "background.jpg";

// Ezt a promptot a felhasználó soha nem látja, ez a "rejtett" instrukció.
const PROMPT =
  "Blend and integrate the car from the second image into the background " +
  "scene from the first image, with correct perspective, scale, ground " +
  "contact shadow, and matching lighting so it looks like the car is " +
  "really parked there.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Csak POST kérést fogadok." });
    return;
  }

  if (!process.env.FAL_KEY) {
    res.status(500).json({
      error: "Hiányzik a FAL_KEY környezeti változó a szerveren.",
    });
    return;
  }

  try {
    const { image, mimeType } = req.body || {};

    if (!image) {
      res.status(400).json({ error: "Nem érkezett autó kép." });
      return;
    }

    // 1) A base64-ként beküldött autó képet feltöltjük a fal.ai tárhelyére,
    //    mert a modell egy publikus URL-t vár bemenetként.
    const buffer = Buffer.from(image, "base64");
    const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });
    const carImageUrl = await fal.storage.upload(blob);

    // 2) A saját domainünkről (Vercel adja a host fejlécben) összeállítjuk
    //    a fix háttérkép publikus URL-jét.
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["host"];
    const backgroundImageUrl = `${protocol}://${host}/${BACKGROUND_FILENAME}`;

    // 3) Meghívjuk a compositing modellt a háttérrel és az autóval.
    const result = await fal.subscribe(
      "fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product",
      {
        input: {
          image_urls: [backgroundImageUrl, carImageUrl],
          prompt: PROMPT,
        },
        logs: false,
      }
    );

    const outputUrl = result?.data?.images?.[0]?.url;

    if (!outputUrl) {
      res.status(502).json({
        error: "A fal.ai nem adott vissza képet.",
        raw: result?.data || null,
      });
      return;
    }

    res.status(200).json({ imageUrl: outputUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hiba történt a generálás közben." });
  }
}

// A base64 kép miatt nagyobb payloadot engedünk a Vercel funkciónak.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};
