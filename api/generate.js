import { fal } from "@fal-ai/client";

// IDE ÍRD A HASZNÁLNI KÍVÁNT MODELL PONTOS NEVÉT!
// Fontos: Ugyanennek kell lennie a status.js-ben is!
const MODEL_ID = "fal-ai/nano-banana-pro/edit";
const BACKGROUND_URL = "https://carcompositorweb.vercel.app/background.jpg";

const PROMPT =
  "Composite the exact car from the second image onto the background of the first image. " +
  "CRITICAL: You must preserve the car exactly as it is with 100% fidelity. " +
  "Do not redraw, alter, or hallucinate any details of the car. " +
  "Keep the exact original license plate text, wheels, rims, proportions, and body shapes. " +
  "Your ONLY job is to extract the car, place it on the background, match the ambient lighting, " +
  "and generate realistic contact shadows under the tires.";

function validateFalKey(key) {
  if (!key) return "Hiányzik a FAL_KEY környezeti változó a szerveren.";
  const trimmed = key.trim();
  if (trimmed !== key) {
    return "A FAL_KEY elején vagy végén szóköz/sortörés van, távolítsd el.";
  }
  if (!/^[^:\s]+:[^:\s]+$/.test(trimmed)) {
    return "A FAL_KEY formátuma hibás. 'azonosító:titok' formátumúnak kell lennie.";
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Csak POST kérést fogadok." });
    return;
  }

  const keyError = validateFalKey(process.env.FAL_KEY);
  if (keyError) {
    res.status(500).json({ error: keyError });
    return;
  }

  fal.config({ credentials: process.env.FAL_KEY });

  try {
    const { image, mimeType } = req.body || {};

    if (!image) {
      res.status(400).json({ error: "Nem érkezett autó kép." });
      return;
    }

    // A feltöltött adatból egyenesen Data URI-t csinálunk, 
    // így elkerüljük a fal.storage.upload és Blob okozta pattern hibákat.
    const carImageUrl = `data:${mimeType || "image/jpeg"};base64,${image}`;

    const { request_id } = await fal.queue.submit(MODEL_ID, {
      input: {
        image_urls: [BACKGROUND_URL, carImageUrl],
        prompt: PROMPT,
      },
    });

    res.status(200).json({ requestId: request_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: `Hiba történt a generálás indításakor: ${err.message || err}`,
    });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};