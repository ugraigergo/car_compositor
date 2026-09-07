import { fal } from "@fal-ai/client";

const BACKGROUND_FILENAME = "background.jpg";
const MODEL_ID = "fal-ai/nano-banana/edit";

// Az image_urls sorrendje: első a háttér, második az autó.
const PROMPT =
  "Using the first image as the exact background scene, place the car " +
  "from the second image into that scene as if it is really parked " +
  "there. Keep the background completely unchanged. Match the car's " +
  "perspective, scale and camera angle to the background, adjust its " +
  "lighting to match the scene, and add a realistic contact shadow " +
  "under the wheels.";

// A fal.ai kulcsnak "azonosító:titok" formátumúnak kell lennie.
// Ha ez hibás (pl. csak az egyik fele lett bemásolva, vagy van benne
// szóköz/idézőjel), pontosan ezt kapjuk: "The string did not match the
// expected pattern." Ezt itt előre ellenőrizzük, hogy egyértelmű,
// magyar hibaüzenetet kapj helyette.
function validateFalKey(key) {
  if (!key) return "Hiányzik a FAL_KEY környezeti változó a szerveren.";
  const trimmed = key.trim();
  if (trimmed !== key) {
    return "A FAL_KEY elején vagy végén szóköz/sortörés van, távolítsd el.";
  }
  if (!/^[^:\s]+:[^:\s]+$/.test(trimmed)) {
    return "A FAL_KEY formátuma hibás. A fal.ai kulcsnak 'azonosító:titok' " +
      "formátumúnak kell lennie, egy kettősponttal. Ellenőrizd a " +
      "fal.ai/dashboard/keys oldalon, hogy a TELJES kulcsot másoltad-e be, " +
      "és a Vercel Environment Variables-be nem került bele idézőjel.";
  }
  return null;
}

// Ez a funkció csak ELINDÍTJA a generálást a fal.ai sorában, és azonnal
// visszaadja a request ID-t. Nem várja meg a végeredményt, ezért nem tud
// időtúllépésbe futni, akármeddig tart a tényleges kép elkészítése.
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

  fal.config({
    credentials: process.env.FAL_KEY,
  });

  try {
    const { image, mimeType } = req.body || {};

    if (!image) {
      res.status(400).json({ error: "Nem érkezett autó kép." });
      return;
    }

    const buffer = Buffer.from(image, "base64");
    const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });
    const carImageUrl = await fal.storage.upload(blob);

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["host"];
    const backgroundImageUrl = `${protocol}://${host}/${BACKGROUND_FILENAME}`;

    const { request_id } = await fal.queue.submit(MODEL_ID, {
      input: {
        image_urls: [backgroundImageUrl, carImageUrl],
        prompt: PROMPT,
      },
    });

    res.status(200).json({ requestId: request_id });
  } catch (err) {
    console.error(err);
    // A pontos hibát is visszaadjuk, hogy ne kelljen a Vercel logokban
    // keresgélni minden alkalommal.
    res.status(500).json({
      error: `Hiba történt a generálás indításakor: ${err.message || err}`,
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};
