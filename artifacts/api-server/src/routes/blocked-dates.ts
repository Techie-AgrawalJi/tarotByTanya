import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

// ── Mongoose model ────────────────────────────────────────────────────────────
const BLOCKED_DATES_DOC_ID = "blocked-dates";

const blockedDatesSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    dates: { type: [String], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "blocked_dates" },
);

const BlockedDatesModel =
  mongoose.models["BlockedDates"] ||
  mongoose.model("BlockedDates", blockedDatesSchema);

async function readBlockedDatesFromDb(): Promise<string[]> {
  const doc = await BlockedDatesModel.findOne({ id: BLOCKED_DATES_DOC_ID })
    .lean()
    .exec();
  if (!doc) return [];
  const raw = (doc as any).dates;
  return Array.isArray(raw) ? raw.map(String) : [];
}

async function writeBlockedDatesToDb(dates: string[]): Promise<string[]> {
  const uniq = Array.from(new Set(dates)).sort();
  await BlockedDatesModel.findOneAndUpdate(
    { id: BLOCKED_DATES_DOC_ID },
    { $set: { id: BLOCKED_DATES_DOC_ID, dates: uniq, updatedAt: new Date() } },
    { upsert: true },
  ).exec();
  return uniq;
}

// ── GET /api/blocked-dates ────────────────────────────────────────────────────
// Returns the current list of blocked date strings (YYYY-MM-DD).
router.get("/blocked-dates", async (_req, res) => {
  try {
    const dates = await readBlockedDatesFromDb();
    return res.json({ ok: true, dates });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── POST /api/blocked-dates ───────────────────────────────────────────────────
// Replaces the blocked dates list with the supplied array.
// Body: { dates: string[] }
router.post("/blocked-dates", async (req, res) => {
  try {
    const body = req.body || {};
    const incoming = body.dates;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ ok: false, error: "dates must be an array." });
    }
    const sanitized = incoming
      .map((d) => String(d).trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    const dates = await writeBlockedDatesToDb(sanitized);
    return res.json({ ok: true, dates });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── PATCH /api/blocked-dates/toggle ──────────────────────────────────────────
// Toggles a single date on/off.
// Body: { date: string }
router.patch("/blocked-dates/toggle", async (req, res) => {
  try {
    const body = req.body || {};
    const date = String(body.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ ok: false, error: "date must be YYYY-MM-DD." });
    }
    const current = await readBlockedDatesFromDb();
    const next = current.includes(date)
      ? current.filter((d) => d !== date)
      : [...current, date];
    const dates = await writeBlockedDatesToDb(next);
    return res.json({ ok: true, dates });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── DELETE /api/blocked-dates ─────────────────────────────────────────────────
// Clears all blocked dates.
router.delete("/blocked-dates", async (_req, res) => {
  try {
    await writeBlockedDatesToDb([]);
    return res.json({ ok: true, dates: [] });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;