import { Router } from "express";
import { readBookings, writeBookings } from "../lib/bookingsStore";
import { readPayments } from "../lib/paymentsStore";
import { findPaymentById } from "../lib/paymentsStore";
import { isGuideAvailable } from "../lib/guideAvailabilityStore";
import { readBookingMetrics, recordConfirmedBooking, resetBookingMetrics } from "../lib/bookingMetricsStore";
import { sendBookingEmailConfirmation } from "../lib/emailConfirmation";
import { getBookingCounterModel, getBookingConfirmationMarkerModel, getSeenClientPhoneModel } from "../lib/mongoose";
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

  for (const b of bookings) {
    if (!b.slotDate) {
      const inferred = (b.raw && (b.raw.slotTiming?.date || b.raw.date)) || "";
      if (inferred) { b.slotDate = inferred; changed = true; }
    }
    if (!b.clientName || String(b.clientName).trim() === "") {
      let inferredName = (b.raw && (b.raw.name || b.raw.clientName)) || b.name || b.fullName || "";
      if (!inferredName && b.paymentReference) {
        try {
          const payment = await findPaymentById(String(b.paymentReference));
          if (payment) {
            inferredName =
              payment.payerName || payment.customerName ||
              (payment.customer && (payment.customer.name || payment.customer.fullName)) ||
              payment.name || payment.raw?.name || payment.raw?.customer?.name || "";
          }
        } catch (e) { /* ignore */ }
      }
      if (inferredName) { b.clientName = inferredName; changed = true; }
    }
    if (!b.clientPhone || String(b.clientPhone).trim() === "") {
      let inferredPhone = (b.raw && (b.raw.phone || b.raw.clientPhone || b.raw.whatsapp)) || b.clientPhone || b.whatsapp || "";
      if (!inferredPhone && b.paymentReference) {
        try {
          const payment = await findPaymentById(String(b.paymentReference));
          if (payment) {
            inferredPhone = payment.phone || payment.contact || payment.raw?.phone || payment.raw?.contact || payment.customer?.phone || "";
          }
        } catch (e) { /* ignore */ }
      }
      if (inferredPhone) { b.clientPhone = inferredPhone; changed = true; }
    }
    if (!b.clientEmail || String(b.clientEmail).trim() === "") {
      let inferredEmail = (b.raw && (b.raw.email || b.raw.clientEmail)) || b.clientEmail || b.email || "";
      if (!inferredEmail && b.paymentReference) {
        try {
          const payment = await findPaymentById(String(b.paymentReference));
          if (payment) {
            inferredEmail = payment.email || payment.customer?.email || payment.payload?.email || payment.payload?.clientEmail || payment.raw?.email || "";
          }
        } catch (e) { /* ignore */ }
      }
      if (inferredEmail) { b.clientEmail = inferredEmail; changed = true; }
    }
    if (!b.bookingTime || String(b.bookingTime).trim() === "") {
      const inferredBookingTime = b.heldAt || b.raw?.bookingTime || b.raw?.createdAt || b.raw?.created_at || "";
      if (inferredBookingTime) {
        b.bookingTime = inferredBookingTime; changed = true;
      } else if (b.paymentReference) {
        try {
          const payment = await findPaymentById(String(b.paymentReference));
          if (payment) {
            b.bookingTime = payment.createdAt || payment.created_at || payment.raw?.createdAt || payment.raw?.created_at || b.bookingTime || "";
            if (b.bookingTime) changed = true;
          }
        } catch (e) { /* ignore */ }
      }
    }
  }

  // Do not persist normalization on read. This function is only intended to
  // normalize booking fields for runtime consumption and should not rewrite
  // the booking collection on every API request.
  return bookings;
}

function isSuccessfulPayment(payment: any): boolean {
  const status = String(payment?.status || payment?.paymentStatus || "").trim().toUpperCase();
  return status === "PAID" || status === "SUCCESS";
}

function getPaymentPhone(payment: any): string {
  return String(
    payment?.payload?.phone || payment?.payload?.clientPhone ||
    payment?.payload?.email || payment?.payload?.whatsapp ||
    payment?.phone || payment?.customer?.phone || payment?.customer?.email ||
    payment?.raw?.phone || payment?.raw?.clientPhone || payment?.raw?.email || payment?.raw?.whatsapp || "",
  ).trim();
}

// GET /api/bookings
router.get("/bookings", async (req, res) => {
  try {
    let bookings = await hydrateBookingsFromPaidPayments();
    bookings = bookings.map((b: any) => {
      const id = b.id || b._id || (b._id && b._id.toString && b._id.toString()) || "";
      const out = { ...b, id };
      if (out._id) delete out._id;
      return out;
    });
    res.json({ ok: true, bookings });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/bookings/stats
router.get("/bookings/stats", async (req, res) => {
  try {
    const counters = await readBookingMetrics();
    return res.json({
      ok: true,
      summary: {
        uniqueClientsGuided: counters.uniqueClientTotal,
        totalBookings: counters.bookingTotal,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
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
    const result = calculateSlotAvailability({ slotDate, blockKey: blockKey as TimeBlockKey, startTime, durationMinutes, bookings });

    return res.json({
      ok: true,
      available: result.available,
      nextAvailableSlot: result.nextAvailableSlot,
      conflict: result.conflict
        ? { id: result.conflict.id, startTime: result.conflict.startTime, endTime: result.conflict.endTime, bufferEndTime: result.conflict.bufferEndTime, status: result.conflict.status }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/bookings/create
router.post("/bookings/create", async (req, res) => {
  try {
    if (!(await isGuideAvailable())) {
      return res.status(423).json({ ok: false, error: "Guide is not available today." });
    }

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
      : Number.parseInt(startTime.slice(0, 2), 10) >= 19 ? "evening"
      : Number.parseInt(startTime.slice(0, 2), 10) >= 14 ? "noon"
      : "morning";

    const booking = await withBookingLock(async () => {
      const allBookings = await readBookings();
      const bookingsForCheck = normalizeBookings(allBookings);
      const result = calculateSlotAvailability({ slotDate, blockKey: normalizedBlockKey, startTime, durationMinutes, bookings: bookingsForCheck });

      if (!result.available) {
        const error = new Error(
          result.nextAvailableSlot
            ? `Sorry, this slot was just booked by someone else. Next available: ${result.nextAvailableSlot}`
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
        clientEmail: payload.email || payload.clientEmail || "",
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
        payload,
        raw: payload,
      };

      allBookings.push(newBooking);
      await writeBookings(allBookings);
      return newBooking;
    });

    // NOTE: No email here — status is HELD, not yet confirmed paid.
    // Email is sent in payment.ts once payment is verified.
    return res.json({ ok: true, booking });
  } catch (err) {
    const statusCode = typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode?: number }).statusCode) : 500;
    return res.status(statusCode === 409 ? 409 : 500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/bookings
// Direct booking creation (non-Razorpay flow or admin-created bookings)
router.post("/bookings", async (req, res): Promise<void> => {
  try {
    if (!(await isGuideAvailable())) {
      return void res.status(423).json({ ok: false, error: "Guide is not available today." });
    }

    const payload = req.body || {};
    const newBooking = {
      id: payload.id || `booking_${Date.now()}`,
      slotDate: payload.slotTiming?.date || payload.date || "",
      clientName: payload.name || payload.clientName || "",
      clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
      clientEmail: payload.email || payload.clientEmail || "",
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
      payload,
      raw: payload,
    };

    const bookings = await readBookings();
    bookings.push(newBooking);
    await writeBookings(bookings);
    await recordConfirmedBooking(newBooking);

    // Only send email for confirmed paid bookings in this direct-creation path
    const confirmedStatus = String(newBooking.status || "").trim().toUpperCase();
    const newPaymentStatus = String(newBooking.paymentStatus || "").trim().toUpperCase();
    if (
      (confirmedStatus === "BOOKED" || confirmedStatus === "PAID" || confirmedStatus === "COMPLETED") &&
      (newPaymentStatus === "PAID" || newPaymentStatus === "SUCCESS")
    ) {
      const clientConfirmation = await sendBookingEmailConfirmation(newBooking);
      if (!clientConfirmation.sent && clientConfirmation.reason && clientConfirmation.reason !== "missing_email") {
        console.warn("Booking confirmation email failed", { bookingId: newBooking.id, recipient: "client", reason: clientConfirmation.reason, error: clientConfirmation.error });
      }

      const guideConfirmation = await sendBookingEmailConfirmation(newBooking, { isGuideEmail: true });
      if (!guideConfirmation.sent && guideConfirmation.reason && guideConfirmation.reason !== "missing_email") {
        console.warn("Booking confirmation email failed", { bookingId: newBooking.id, recipient: "guide", reason: guideConfirmation.reason, error: guideConfirmation.error });
      }
    }

    return void res.json({ ok: true, booking: newBooking });
  } catch (err) {
    return void res.status(500).json({ ok: false, error: String(err) });
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
// NOTE: Email is intentionally NOT sent here. Status transitions (e.g. HELD → BOOKED)
// triggered by the admin panel should not re-send confirmation emails since the
// payment verification flow already sent it. Sending here caused duplicate emails.
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

    const previousStatus = String(bookings[index].status || "").trim().toUpperCase();

    bookings[index] = { ...bookings[index], status: nextStatus };
    await writeBookings(bookings);

    // Record metric when transitioning to BOOKED but do NOT re-send email
    if (nextStatus === "BOOKED" && previousStatus !== "BOOKED") {
      await recordConfirmedBooking(bookings[index]);
      // ❌ Removed: sendBookingEmailConfirmation was here and caused duplicate emails.
      // The email was already sent by payment.ts verify-payment when the payment was confirmed.
    }

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

// Admin debug routes
router.get("/admin/db-bookings", async (req, res) => {
  try {
    const bookings = await readBookings();
    return res.json({ ok: true, count: bookings.length, bookings: bookings.slice(-200) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/admin/db-booking-metrics", async (req, res) => {
  try {
    const Counter = await getBookingCounterModel();
    const Marker = await getBookingConfirmationMarkerModel();
    const SeenPhone = await getSeenClientPhoneModel();

    const [counter, counterDocs, markers, phones] = await Promise.all([
      Counter.findOne({ _id: "booking-metrics" }).lean().exec(),
      Counter.find({}).lean().exec(),
      Marker.find({}).lean().exec(),
      SeenPhone.find({}).lean().exec(),
    ]);

    return res.json({ ok: true, counter, counterDocs, markerCount: markers.length, phoneCount: phones.length, markers, phones });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/admin/reset-booking-metrics", async (req, res) => {
  try {
    const metrics = await resetBookingMetrics();
    return res.json({ ok: true, metrics });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;