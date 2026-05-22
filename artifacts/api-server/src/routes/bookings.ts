import { Router } from "express";
import { readBookings, writeBookings } from "../lib/bookingsStore";
import {
  BUFFER_MINUTES,
  buildBookedRangesResponse,
  calculateSlotAvailability,
  isValidTimeBlock,
  minutesToTime24,
  type BookingSlotRange,
  type TimeBlockKey,
} from "../lib/bookingSlots";

const router = Router();
let bookingWriteQueue: Promise<unknown> = Promise.resolve();

function withBookingLock<T>(task: () => Promise<T>): Promise<T> {
  const next = bookingWriteQueue.then(task, task);
  bookingWriteQueue = next.then(() => undefined, () => undefined);
  return next;
}

function normalizeBookings(bookings: any[]): BookingSlotRange[] {
  return bookings.map((booking: any) => ({
    id: booking.id,
    slotDate: String(booking.slotDate || booking.raw?.slotTiming?.date || booking.raw?.date || "").trim(),
    startTime: String(booking.startTime || booking.raw?.slotTiming?.startTime || booking.raw?.startTime || "").trim(),
    endTime: String(booking.endTime || booking.raw?.slotTiming?.endTime || booking.raw?.endTime || "").trim(),
    bufferEndTime: String(booking.bufferEndTime || booking.raw?.slotTiming?.bufferEndTime || booking.raw?.bufferEndTime || "").trim(),
    durationMinutes: Number(booking.durationMinutes || booking.raw?.slotTiming?.durationMinutes || booking.raw?.durationMinutes || 0),
    status: String(booking.status || "BOOKED").toUpperCase(),
    paymentReference: booking.paymentReference || "",
    heldAt: booking.heldAt || "",
  }));
}

function parseAvailabilityQuery(req: any) {
  const slotDate = String(req.query.date || "").trim();
  const blockKey = String(req.query.timeBlock || "").trim().toLowerCase();
  return { slotDate, blockKey } as const;
}

async function hydrateBookingsFromPaidPayments() {
  const bookings = await readBookings();
  let changed = false;

  // Backfill slotDate for older booking entries that may not have the normalized field
  for (const b of bookings) {
    if (!b.slotDate) {
      const inferred = (b.raw && (b.raw.slotTiming?.date || b.raw.date)) || "";
      if (inferred) {
        b.slotDate = inferred;
        changed = true;
      }
    }
    // Normalize client name and phone from legacy/raw payloads so admin shows details
    if (!b.clientName || String(b.clientName).trim() === "") {
      const inferredName = (b.raw && (b.raw.name || b.raw.clientName)) || b.name || b.fullName || "";
      if (inferredName) {
        b.clientName = inferredName;
        changed = true;
      }
    }

    if (!b.clientPhone || String(b.clientPhone).trim() === "") {
      const inferredPhone = (b.raw && (b.raw.phone || b.raw.clientPhone || b.raw.whatsapp)) || b.clientPhone || b.whatsapp || "";
      if (inferredPhone) {
        b.clientPhone = inferredPhone;
        changed = true;
      }
    }
  }

  if (changed) {
    await writeBookings(bookings);
  }

  return bookings;
}

// GET /api/bookings
router.get("/bookings", async (req, res) => {
  try {
    const bookings = normalizeBookings(await hydrateBookingsFromPaidPayments());
    res.json({ ok: true, bookings });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/bookings/availability?date=YYYY-MM-DD&timeBlock=morning
router.get("/bookings/availability", async (req, res) => {
  try {
    const { slotDate, blockKey } = parseAvailabilityQuery(req);

    if (!slotDate || !isValidTimeBlock(blockKey)) {
      return res.status(400).json({ ok: false, error: "Invalid date or time block." });
    }

    const bookings = normalizeBookings(await hydrateBookingsFromPaidPayments());
    const bookedRanges = buildBookedRangesResponse(bookings, slotDate, blockKey as TimeBlockKey);

    return res.json({ ok: true, date: slotDate, timeBlock: blockKey, bookings: bookedRanges });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/bookings/validate
router.post("/bookings/validate", async (req, res) => {
  try {
    const body = req.body || {};
    const slotDate = String(body.date || "").trim();
    const blockKey = String(body.timeBlock || "").trim().toLowerCase();
    const startTime = String(body.startTime || "").trim();
    const durationMinutes = Number(body.durationMinutes || 0);

    if (!slotDate || !isValidTimeBlock(blockKey) || !startTime || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid slot validation payload." });
    }

    const bookings = normalizeBookings(await hydrateBookingsFromPaidPayments());
    const result = calculateSlotAvailability({
      slotDate,
      blockKey: blockKey as TimeBlockKey,
      startTime,
      durationMinutes,
      bookings,
    });

    return res.json({
      ok: true,
      available: result.available,
      nextAvailableSlot: result.nextAvailableSlot,
      conflict: result.conflict
        ? {
            id: result.conflict.id,
            startTime: result.conflict.startTime,
            endTime: result.conflict.endTime,
            bufferEndTime: result.conflict.bufferEndTime,
            status: result.conflict.status,
          }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/bookings/create
router.post("/bookings/create", async (req, res) => {
  try {
    const payload = req.body || {};
    const slotDate = String(payload.slotTiming?.date || payload.date || "").trim();
    const startTime = String(payload.slotTiming?.startTime || payload.startTime || "").trim();
    const durationMinutes = Number(payload.slotTiming?.durationMinutes || payload.durationMinutes || 0);
    const blockKey = String(payload.timeBlock || payload.slotTiming?.timeBlock || "").trim().toLowerCase();
    const paymentReference = String(payload.paymentReference || payload.payment_id || payload.paymentId || "").trim();

    if (!slotDate || !startTime || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || !paymentReference) {
      return res.status(400).json({ ok: false, error: "Missing slot details or payment reference." });
    }

    const normalizedBlockKey = isValidTimeBlock(blockKey)
      ? (blockKey as TimeBlockKey)
      : Number.parseInt(startTime.slice(0, 2), 10) >= 19
        ? "evening"
        : Number.parseInt(startTime.slice(0, 2), 10) >= 14
          ? "noon"
          : "morning";

    const booking = await withBookingLock(async () => {
      const currentBookings = normalizeBookings(await readBookings());
      const result = calculateSlotAvailability({
        slotDate,
        blockKey: normalizedBlockKey,
        startTime,
        durationMinutes,
        bookings: currentBookings,
      });

      if (!result.available) {
        const error = new Error(
          result.nextAvailableSlot
            ? `Sorry, this slot was just booked by someone else. Please select a new time. Next available slot: ${result.nextAvailableSlot}`
            : "Sorry, this slot was just booked by someone else. Please select a new time.",
        ) as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }

      const startMinutes = Number.parseInt(startTime.slice(0, 2), 10) * 60 + Number.parseInt(startTime.slice(3, 5), 10);
      const endMinutes = startMinutes + durationMinutes;
      const bufferEndMinutes = endMinutes + BUFFER_MINUTES;
      const now = new Date().toISOString();

      const newBooking = {
        id: payload.id || `booking_${Date.now()}`,
        slotDate,
        clientName: payload.name || payload.clientName || "",
        clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
        startTime: minutesToTime24(startMinutes),
        endTime: minutesToTime24(endMinutes),
        bufferEndTime: minutesToTime24(bufferEndMinutes),
        durationMinutes,
        sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
        paymentMethod: payload.paymentMethod || payload.payment || "",
        paymentAmount: payload.paymentAmount || 0,
        paymentStatus: "PENDING",
        paymentReference,
        status: "HELD",
        heldAt: now,
        bookingTime: now,
        raw: payload,
      };

      currentBookings.push(newBooking);
      await writeBookings(currentBookings);
      return newBooking;
    });

    return res.json({ ok: true, booking });
  } catch (err) {
    const statusCode = typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode?: number }).statusCode) : 500;
    return res.status(statusCode === 409 ? 409 : 500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/bookings
router.post("/bookings", async (req, res) => {
  try {
    const payload = req.body || {};
    const newBooking = {
      id: payload.id || `booking_${Date.now()}`,
      slotDate: payload.slotTiming?.date || payload.date || "",
      clientName: payload.name || payload.clientName || "",
      clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
      startTime: payload.slotTiming?.startTime || payload.startTime || "",
      endTime: payload.slotTiming?.endTime || payload.endTime || "",
      bufferEndTime: payload.slotTiming?.bufferEndTime || payload.bufferEndTime || "",
      durationMinutes: payload.slotTiming?.durationMinutes || payload.durationMinutes || 0,
      sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
      paymentMethod: payload.paymentMethod || payload.payment || "",
      paymentAmount: payload.paymentAmount || 0,
      paymentStatus: payload.paymentStatus || "PAID",
      paymentReference: payload.paymentReference || "",
      status: payload.status || "BOOKED",
      bookingTime: new Date().toISOString(),
      raw: payload,
    };

    const bookings = await readBookings();
    bookings.push(newBooking);
    await writeBookings(bookings);

    res.json({ ok: true, booking: newBooking });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /api/bookings/:id
router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let bookings = await readBookings();
    bookings = bookings.filter((booking: { id: string }) => booking.id !== id);
    await writeBookings(bookings);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// PATCH /api/bookings/:id
router.patch("/bookings/:id", async (req, res): Promise<void> => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const nextStatus = (payload.status || "").toString().toUpperCase();

    if (!["HELD", "BOOKED", "CANCELLED", "COMPLETED"].includes(nextStatus)) {
      return void res.status(400).json({ ok: false, error: "Invalid booking status" });
    }

    const bookings = await readBookings();
    const index = bookings.findIndex((booking: { id: string }) => booking.id === id);

    if (index === -1) {
      return void res.status(404).json({ ok: false, error: "Booking not found" });
    }

    bookings[index] = {
      ...bookings[index],
      status: nextStatus,
    };

    await writeBookings(bookings);
    return void res.json({ ok: true, booking: bookings[index] });
  } catch (err) {
    return void res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /api/bookings (clear all)
router.delete("/bookings", async (req, res) => {
  try {
    await writeBookings([]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
