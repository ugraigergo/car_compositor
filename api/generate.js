import { fal } from "@fal-ai/client";

// IDE ÍRD A HASZNÁLNI KÍVÁNT MODELL PONTOS NEVÉT!
// Fontos: Ugyanennek kell lennie a status.js-ben is!
const MODEL_ID = "fal-ai/nano-banana-pro/edit";
const BACKGROUND_URL = "https://carcompositorweb.vercel.app/background.jpg";
const PLATE_URL = "https://carcompositorweb.vercel.app/plate.jpg";

const PROMPT =
  "TASK: Create a photorealistic composite image using three specific input images. " +
  "INPUT MAPPING: " +
  "- Image 1: The target environment (The Background). " +
  "- Image 2: The main subject (The Car). " +
  "- Image 3: A custom dealer graphic (The License Plate). " +
  "CRITICAL EXECUTION RULES: " +
  "1. 100% SUBJECT FIDELITY (FROM IMAGE 2): Extract the car from Image 2 perfectly. DO NOT alter the car's original design, structural details, body shape, grille (including the center logo), rims, headlights, or perspective. It must be a 1:1 pixel-perfect extraction with ZERO hallucination. " +
  "2. ZERO ROTATION / PERSPECTIVE (FROM IMAGE 2): Maintain the exact same pose, camera angle, and direction that the car from Image 2 has. It must face the identical direction in the new background as it does in its original image. " +
  "3. SEAMLESS COMPOSITING (ONTO IMAGE 1): Place the extracted car from Image 2 onto the background of Image 1. Generate accurate ground shadows, ambient occlusion, and adjust the car's surface reflections to perfectly match the lighting conditions of the environment from Image 1. The car must look like it physically belongs in that scene. " +
  "4. LICENSE PLATE INTEGRATION (FROM IMAGE 3): Locate the front license plate on the car from Image 2. Perfectly replace this with the exact graphic from Image 3. You MUST apply the correct perspective warp, scale, and lighting to Image 3 so it aligns perfectly with the angle of the car's bumper and looks like a physical plate. " +
  "5. OUTPUT FORMAT: The final composite must be in a 4:3 landscape aspect ratio.";

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
        image_urls: [BACKGROUND_URL, carImageUrl, PLATE_URL],
        prompt: PROMPT,
        image_size: "landscape_4_3"
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