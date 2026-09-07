import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

// ENNEK PONTOSAN MEG KELL EGYEZNIE A generate.js-BEN LÉVŐVEL!
const MODEL_ID = "fal-ai/nano-banana/edit";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Csak GET kérést fogadok." });
    return;
  }

  const { requestId } = req.query;

  if (!requestId) {
    res.status(400).json({ error: "Hiányzik a requestId." });
    return;
  }

  try {
    const status = await fal.queue.status(MODEL_ID, {
      requestId,
      logs: false,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(MODEL_ID, { requestId });
      const outputUrl = result?.data?.images?.[0]?.url;

      if (!outputUrl) {
        res.status(502).json({
          error: "A fal.ai nem adott vissza képet.",
          raw: result?.data || null,
        });
        return;
      }

      res.status(200).json({ status: "COMPLETED", imageUrl: outputUrl });
      return;
    }

    // IN_QUEUE vagy IN_PROGRESS
    res.status(200).json({ status: status.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hiba történt az állapot lekérdezésekor." });
  }
}