import crypto from "crypto";
import { Router } from "express";
import { readPayments, writePayments, findPaymentById } from "../lib/paymentsStore";
import { readBookings, writeBookings } from "../lib/bookingsStore";
import { isGuideAvailable } from "../lib/guideAvailabilityStore";
import { recordConfirmedBooking } from "../lib/bookingMetricsStore";
import { sendBookingWhatsAppConfirmation } from "../lib/whatsapp";

const router = Router();

function makeId(prefix = "pay_") {
  return `${prefix}${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

function getRazorpayCredentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  };
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

async function createBookingFromPayment(paymentRecord: any, paymentRecordId: string, gatewayPaymentId = "") {
  if (!(await isGuideAvailable())) {
    const error = new Error("Guide is not available today.") as Error & { statusCode?: number };
    error.statusCode = 423;
    throw error;
  }

  const payload = paymentRecord.payload || {};
  const bookings = await readBookings();
  const existing = bookings.find((booking: any) => {
    const bookingPaymentReference = String(booking.paymentReference || "");
    const bookingGatewayPaymentId = String(booking.gatewayPaymentId || booking.razorpayPaymentId || booking.raw?.paymentId || booking.raw?.razorpay_payment_id || "");

    return (
      bookingPaymentReference === paymentRecordId ||
      (gatewayPaymentId && bookingGatewayPaymentId === gatewayPaymentId)
    );
  });

  if (existing) {
    return existing;
  }

  const booking = {
    id: payload.id || `booking_${Date.now()}`,
    clientName: payload.name || payload.clientName || "",
    clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
      slotDate: payload.slotTiming?.date || payload.date || "", // Ensure slotDate is included
    startTime: payload.slotTiming?.startTime || payload.startTime || "",
    endTime: payload.slotTiming?.endTime || payload.endTime || "",
    bufferEndTime: payload.slotTiming?.bufferEndTime || payload.bufferEndTime || "",
    durationMinutes: payload.slotTiming?.durationMinutes || payload.durationMinutes || 0,
    sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
    paymentMethod: "Razorpay",
    paymentAmount: paymentRecord.amount || 0,
    paymentStatus: "PAID",
    paymentReference: paymentRecordId,
    gatewayPaymentId,
    status: "BOOKED",
    bookingTime: new Date().toISOString(),
    raw: payload,
  };

  bookings.push(booking);
  await writeBookings(bookings);
  await recordConfirmedBooking(booking);
  await sendBookingWhatsAppConfirmation(booking);

  return booking;
}

async function createRazorpayOrder(params: { amount: number; currency: string; receipt: string }) {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    const error = new Error("Razorpay credentials are not configured.") as Error & { statusCode?: number };
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
    }),
  });

  const responseJson: any = await response.json().catch(() => null);

  if (response.status === 401) {
    const error = new Error("Razorpay authentication failed.") as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      responseJson?.error?.description || responseJson?.error || "Unable to create Razorpay order.",
    ) as Error & { statusCode?: number };
    error.statusCode = 500;
    throw error;
  }

  if (!responseJson?.id) {
    const error = new Error("Razorpay order id was not returned.") as Error & { statusCode?: number };
    error.statusCode = 500;
    throw error;
  }

  return responseJson;
}

router.post("/create-order", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = body.payload || {};
    const amount = toAmount(body.amount ?? body.amountPaise ?? payload.amount);
    const currency = String(body.currency || "INR").toUpperCase();
    const receipt = String(body.receipt || body.paymentId || `receipt_${Date.now()}`);
    const paymentId = String(body.paymentId || body.payment_record_id || makeId()).trim() || makeId();

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ ok: false, error: "Amount must be at least 100 paise." });
    }

    const order: any = await createRazorpayOrder({ amount, currency, receipt });
    const { keyId } = getRazorpayCredentials();
    const payments = await readPayments();

    payments.push({
      id: paymentId,
      orderId: order.id,
      amount,
      currency,
      receipt,
      status: "PENDING",
      payload,
      gateway: "razorpay",
      createdAt: new Date().toISOString(),
      gatewayResponse: order,
    });

    await writePayments(payments);

    return res.json({
      ok: true,
      order_id: order.id,
      amount: order.amount || amount,
      currency: order.currency || currency,
      receipt,
      payment_id: paymentId,
      key_id: keyId,
    });
  } catch (err) {
    const statusCode = typeof err === "object" && err && "statusCode" in err ? Number((err as { statusCode?: number }).statusCode) : 500;
    return res.status(statusCode === 401 ? 401 : statusCode === 400 ? 400 : 500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const body = req.body || {};
    const returnUrl = String(req.query.returnUrl || body.returnUrl || body.return_url || "");
    const orderId = String(body.razorpay_order_id || body.order_id || "");
    const paymentId = String(body.razorpay_payment_id || body.payment_id || "");
    const signature = String(body.razorpay_signature || body.signature || "");

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ ok: false, error: "Missing Razorpay payment fields." });
    }

    if (!(await isGuideAvailable())) {
      return res.status(423).json({ ok: false, error: "Guide is not available today." });
    }

    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      return res.status(500).json({ ok: false, error: "Razorpay credentials are not configured." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ ok: false, error: "Signature verification failed." });
    }

    const payments = await readPayments();
    const index = payments.findIndex((entry: any) => entry.orderId === orderId || entry.id === String(body.payment_record_id || body.paymentId || ""));

    if (index === -1) {
      return res.status(404).json({ ok: false, error: "Payment record not found." });
    }

    payments[index].status = "PAID";
    payments[index].razorpayOrderId = orderId;
    payments[index].razorpayPaymentId = paymentId;
    payments[index].razorpaySignature = signature;
    payments[index].updatedAt = new Date().toISOString();

    await writePayments(payments);

    // Reservation/HELD handling: prefer claiming an existing HELD reservation created at checkout.
    try {
      const payload = payments[index].payload || {};
      const slotDate = String(payload.slotTiming?.date || payload.date || "").trim();
      const slotStart = String(payload.slotTiming?.startTime || payload.startTime || "").trim();

      const HELD_TTL_MIN = Number(process.env.HELD_TTL_MINUTES) || 10;
      const HELD_TTL_MS = HELD_TTL_MIN * 60 * 1000;

      const bookings = await readBookings();

      // Find a HELD reservation that matches this payment (preferred)
      const heldByThis = bookings.find((b: any) => {
        if (b.status !== "HELD") return false;

        const bookingPaymentReference = String(b.paymentReference || "");
        const bookingGatewayPaymentId = String(b.gatewayPaymentId || b.razorpayPaymentId || b.raw?.paymentId || b.raw?.razorpay_payment_id || "");

        return bookingPaymentReference === payments[index].id || bookingGatewayPaymentId === paymentId;
      });

      if (heldByThis) {
        // Claim the reservation for this exact payment even if the hold window elapsed.
        // The payment itself is the source of truth; expiry is only used to block other users' holds.
        heldByThis.status = "BOOKED";
        heldByThis.paymentStatus = "PAID";
        // Keep the internal payment record id as the canonical reference.
        heldByThis.paymentReference = payments[index].id;
        heldByThis.gatewayPaymentId = paymentId;
        heldByThis.paymentMethod = "Razorpay";
        heldByThis.paymentAmount = payments[index].amount || heldByThis.paymentAmount || 0;
        heldByThis.bookingTime = heldByThis.bookingTime || new Date().toISOString();
        await writeBookings(bookings);
        await recordConfirmedBooking(heldByThis);
        await sendBookingWhatsAppConfirmation(heldByThis);
        const booking = heldByThis;
        if (returnUrl) {
          const url = new URL(returnUrl);
          url.searchParams.set("payment_status", "success");
          url.searchParams.set("payment_id", payments[index].id || "");
          url.searchParams.set("gateway_payment_id", paymentId);
          url.searchParams.set("order_id", orderId);
          return res.redirect(303, url.toString());
        }
        return res.json({ ok: true, verified: true, payment: payments[index], booking });
      }

      // If no held reservation for this payment, check whether another active HELD blocks the slot
      if (slotDate && slotStart) {
        const conflictHeld = bookings.find((b: any) => {
          if (b.status !== "HELD" && b.status !== "BOOKED") return false;
          const bDate = b.slotDate || (b.raw && b.raw.slotTiming && b.raw.slotTiming.date) || (b.raw && b.raw.date) || "";
          const bStart = b.startTime || (b.raw && b.raw.slotTiming && b.raw.slotTiming.startTime) || "";
          if (String(bDate) !== slotDate || String(bStart) !== slotStart) return false;
          if (b.status === "BOOKED" && b.status !== "CANCELLED") return true;
          if (b.status === "HELD") {
            const heldAt = b.heldAt ? new Date(b.heldAt).getTime() : 0;
            if (!heldAt) return true;
            if (Date.now() - heldAt <= HELD_TTL_MS) return true; // still reserved
            return false; // expired
          }
          return false;
        });

        if (conflictHeld) {
          // Mark payment as failed due to slot conflict to avoid creating duplicate booking
          payments[index].status = "FAILED";
          payments[index].failureReason = "Slot already booked or reserved";
          payments[index].updatedAt = new Date().toISOString();
          await writePayments(payments);

          if (returnUrl) {
            const url = new URL(returnUrl);
            url.searchParams.set("payment_status", "failed");
            url.searchParams.set("payment_id", payments[index].id || "");
            url.searchParams.set("error", "slot_already_booked");
            return res.redirect(303, url.toString());
          }

          return res.status(409).json({ ok: false, error: "Slot already booked or reserved", existing: conflictHeld });
        }
      }
    } catch (err) {
      console.error("Error while handling held reservation:", err);
      // fall through to create booking normally
    }

    const booking = await createBookingFromPayment(payments[index], payments[index].id, paymentId);

    if (returnUrl) {
      const url = new URL(returnUrl);
      // Use the internal payment record id so the frontend can look it up.
      url.searchParams.set("payment_status", "success");
      url.searchParams.set("payment_id", payments[index].id || "");
      // Also include gateway-specific ids for debugging if needed
      url.searchParams.set("gateway_payment_id", paymentId);
      url.searchParams.set("order_id", orderId);
      return res.redirect(303, url.toString());
    }

    return res.json({ ok: true, verified: true, payment: payments[index], booking });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET payment status
router.get("/payments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payment = await findPaymentById(id);
    if (!payment) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, payment });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Webhook endpoint for payment events.
// For now we accept a minimal payload: { paymentId, status, reference }
router.post("/payments/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const paymentId = String(body.paymentId || body.payment_id || body.id || "");
    const status = String((body.status || body.paymentStatus || "").toString()).toUpperCase();
    const reference = String(body.reference || body.txn_id || body.gateway_ref || "");

    if (!paymentId) return res.status(400).json({ ok: false, error: "missing payment id" });

    const payments = await readPayments();
    const index = payments.findIndex((p: any) => p.id === paymentId);
    if (index === -1) return res.status(404).json({ ok: false, error: "payment not found" });

    if (!(await isGuideAvailable())) {
      payments[index].status = "FAILED";
      payments[index].failureReason = "Guide not available today";
      payments[index].updatedAt = new Date().toISOString();
      await writePayments(payments);
      return res.status(423).json({ ok: false, error: "Guide is not available today." });
    }

    payments[index].status = status === "PAID" || status === "SUCCESS" ? "PAID" : status === "FAILED" ? "FAILED" : status;
    payments[index].reference = reference;
    payments[index].updatedAt = new Date().toISOString();

    await writePayments(payments);

    // If paid, create booking server-side from payload (idempotent: check bookings for existing raw.paymentReference)
    if (payments[index].status === "PAID") {
      const payload = payments[index].payload || {};
      const slotDate = String(payload.slotTiming?.date || payload.date || "").trim();
      const slotStart = String(payload.slotTiming?.startTime || payload.startTime || "").trim();

      const bookings = await readBookings();

      // avoid duplicate booking creation for same paymentReference
      const existingByRef = bookings.find((b: any) => b.paymentReference && b.paymentReference === (reference || payments[index].id));
      if (existingByRef) {
        return res.json({ ok: true });
      }

      // Check for slot conflict: same date and same start time
      if (slotDate && slotStart) {
        const conflict = bookings.find((b: any) => {
          const bDate = b.slotDate || (b.raw && b.raw.slotTiming && b.raw.slotTiming.date) || (b.raw && b.raw.date) || "";
          const bStart = b.startTime || (b.raw && b.raw.slotTiming && b.raw.slotTiming.startTime) || "";
          return String(bDate) === slotDate && String(bStart) === slotStart && b.status !== "CANCELLED";
        });

        if (conflict) {
          // Don't create duplicate booking; mark payment as FAILED for operator visibility
          payments[index].status = "FAILED";
          payments[index].failureReason = "Slot already booked (webhook)";
          payments[index].updatedAt = new Date().toISOString();
          await writePayments(payments);
          return res.json({ ok: false, error: "Slot already booked", existing: conflict });
        }
      }

      const booking = {
        id: payload.id || `booking_${Date.now()}`,
        clientName: payload.name || payload.clientName || "",
        clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
        startTime: payload.slotTiming?.startTime || payload.startTime || "",
        endTime: payload.slotTiming?.endTime || payload.endTime || "",
        bufferEndTime: payload.slotTiming?.bufferEndTime || payload.bufferEndTime || "",
        durationMinutes: payload.slotTiming?.durationMinutes || payload.durationMinutes || 0,
        sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
        paymentMethod: "Razorpay",
        paymentAmount: payments[index].amount || 0,
        paymentStatus: "PAID",
        paymentReference: reference || payments[index].id,
        status: "BOOKED",
        bookingTime: new Date().toISOString(),
        raw: payload,
      };

      // avoid duplicate booking by reference again
      const already = bookings.find((b: any) => b.paymentReference && b.paymentReference === booking.paymentReference);
      if (!already) {
        bookings.push(booking);
        await writeBookings(bookings);
        await recordConfirmedBooking(booking);
        await sendBookingWhatsAppConfirmation(booking);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;

// Admin helper: import local JSON data into Mongo (idempotent)
// POST /api/admin/import-local-data
router.post("/admin/import-local-data", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const paymentsPath = path.resolve(process.cwd(), "artifacts", "api-server", "data", "payments.json");
    const bookingsPath = path.resolve(process.cwd(), "artifacts", "api-server", "data", "bookings.json");

    let importedPayments: any[] = [];
    let importedBookings: any[] = [];

    try {
      const raw = await fs.readFile(paymentsPath, "utf8");
      importedPayments = JSON.parse(raw || "[]");
    } catch (err) {
      // ignore missing file
    }

    try {
      const raw = await fs.readFile(bookingsPath, "utf8");
      importedBookings = JSON.parse(raw || "[]");
    } catch (err) {
      // ignore missing file
    }

    const existingPayments = await readPayments();
    const existingBookings = await readBookings();

    const paymentsToInsert = importedPayments.filter((p: any) => !existingPayments.find((e: any) => String(e.id) === String(p.id) || String(e.orderId) === String(p.orderId)));
    const bookingsToInsert = importedBookings.filter((b: any) => !existingBookings.find((e: any) => String(e.id) === String(b.id) || String(e.paymentReference) === String(b.paymentReference)));

    const mergedPayments = existingPayments.concat(paymentsToInsert);
    const mergedBookings = existingBookings.concat(bookingsToInsert);

    await writePayments(mergedPayments);
    await writeBookings(mergedBookings);

    return res.json({ ok: true, imported: { payments: paymentsToInsert.length, bookings: bookingsToInsert.length } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Admin debug: list payments from DB (first 200)
router.get("/admin/db-payments", async (req, res) => {
  try {
    const payments = await readPayments();
    return res.json({ ok: true, count: payments.length, payments: payments.slice(-200) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Admin helper: reconcile PAID payments into bookings if missing
// POST /api/payments/reconcile
router.post("/payments/reconcile", async (req, res) => {
  try {
    const payments = await readPayments();
    const paid = payments.filter((p: any) => String((p.status || p.paymentStatus || "")).toUpperCase() === "PAID");
    const bookings = await readBookings();

    const created: any[] = [];

    for (const p of paid) {
      const already = bookings.find((b: any) => {
        const ref = String(b.paymentReference || "");
        const gatewayId = String(b.gatewayPaymentId || b.razorpayPaymentId || "");
        return ref === String(p.id) || gatewayId === String(p.razorpayPaymentId || p.gatewayPaymentId || p.gatewayResponse?.id || "");
      });

      if (already) continue;

      try {
        const booking = await createBookingFromPayment(p, String(p.id), String(p.razorpayPaymentId || p.gatewayPaymentId || ""));
        if (booking) created.push(booking);
      } catch (err) {
        // continue on error per-payment
        console.error("Reconcile: failed to create booking from payment", p.id, err);
      }
    }

    return res.json({ ok: true, reconciled: created.length, created });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
