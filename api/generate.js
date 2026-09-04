import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

const BACKGROUND_FILENAME = "background.jpg";
const MODEL_ID = "fal-ai/flux-pro/kontext/max/multi";

// Az image_urls sorrendje számít: az első a háttér, a második az autó.
// A promptban erre hivatkozunk "az első kép" / "a második kép" formában.
const PROMPT =
  "Take the exact background scene from the first image, unchanged. " +
  "Place the car from the second image into that scene so it looks " +
  "naturally parked there: match the perspective, scale and camera angle " +
  "of the background, match the lighting and color tone of the scene, " +
  "and add a realistic contact shadow under the car. Do not alter the " +
  "background itself.";

// Ez a funkció csak ELINDÍTJA a generálást a fal.ai sorában, és azonnal
// visszaadja a request ID-t. Nem várja meg a végeredményt, ezért nem tud
// időtúllépésbe futni, akármeddig tart a tényleges kép elkészítése.
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
    res.status(500).json({ error: "Hiba történt a generálás indításakor." });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};
