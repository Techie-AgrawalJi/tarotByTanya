import { Router } from "express";
import { readBookings, writeBookings } from "../lib/bookingsStore";
import { readPayments } from "../lib/paymentsStore";

const router = Router();

async function hydrateBookingsFromPaidPayments() {
  const [bookings, payments] = await Promise.all([readBookings(), readPayments()]);
  let changed = false;

  for (const payment of payments) {
    if (payment.status !== "PAID") {
      continue;
    }

    const paymentReference = payment.razorpayPaymentId || payment.reference || payment.id;
    const alreadyExists = bookings.some((booking: { paymentReference?: string }) => booking.paymentReference === paymentReference);

    if (alreadyExists) {
      continue;
    }

    const payload = payment.payload || {};
    bookings.push({
      id: payload.id || `booking_${Date.now()}`,
      clientName: payload.name || payload.clientName || "",
      clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
      startTime: payload.slotTiming?.startTime || payload.startTime || "",
      endTime: payload.slotTiming?.endTime || payload.endTime || "",
      bufferEndTime: payload.slotTiming?.bufferEndTime || payload.bufferEndTime || "",
      durationMinutes: payload.slotTiming?.durationMinutes || payload.durationMinutes || 0,
      sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
      paymentMethod: payment.gateway === "razorpay" ? "Razorpay" : "SMEpay",
      paymentAmount: payment.amount || 0,
      paymentStatus: "PAID",
      paymentReference,
      status: "BOOKED",
      bookingTime: payment.updatedAt || payment.createdAt || new Date().toISOString(),
      raw: payload,
    });
    changed = true;
  }

  if (changed) {
    await writeBookings(bookings);
  }

  return bookings;
}

// GET /api/bookings
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await hydrateBookingsFromPaidPayments();
    res.json({ ok: true, bookings });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/bookings
router.post("/bookings", async (req, res) => {
  try {
    const payload = req.body || {};
    const newBooking = {
      id: payload.id || `booking_${Date.now()}`,
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
