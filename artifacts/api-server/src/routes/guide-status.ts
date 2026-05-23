import { Router } from "express";
import { readGuideAvailability, setGuideAvailability } from "../lib/guideAvailabilityStore";

const router = Router();

router.get("/guide-status", async (_req, res) => {
  try {
    const guide = await readGuideAvailability();
    return res.json({ ok: true, guide });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/guide-status", async (req, res) => {
  try {
    const body = req.body || {};
    const available = Boolean(body.available);
    const message = String(body.message || "").trim();
    const guide = await setGuideAvailability({ available, message });
    return res.json({ ok: true, guide });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;