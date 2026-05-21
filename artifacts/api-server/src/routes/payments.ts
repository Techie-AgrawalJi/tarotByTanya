import crypto from "crypto";
import { Router } from "express";
import { readPayments, writePayments, findPaymentById } from "../lib/paymentsStore";
import { readBookings, writeBookings } from "../lib/bookingsStore";

const router = Router();

function makeId(prefix = "pay_") {
  return `${prefix}${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

function resolveGateway(input: unknown): "smepay" | "razorpay" {
  const normalized = String(input ?? "").trim().toLowerCase();

  if (!normalized) {
    return "smepay";
  }

  if (normalized === "india" || normalized === "in" || normalized.includes("india") || normalized.includes("bharat")) {
    return "smepay";
  }

  return "razorpay";
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

async function createBookingFromPayment(paymentRecord: any, paymentReference: string) {
  const payload = paymentRecord.payload || {};
  const bookings = await readBookings();
  const existing = bookings.find((booking: any) => booking.paymentReference === paymentReference);

  if (existing) {
    return existing;
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
    paymentMethod: paymentRecord.gateway === "razorpay" ? "Razorpay" : "SMEpay",
    paymentAmount: paymentRecord.amount || 0,
    paymentStatus: "PAID",
    paymentReference,
    status: "BOOKED",
    bookingTime: new Date().toISOString(),
    raw: payload,
  };

  bookings.push(booking);
  await writeBookings(bookings);

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

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ ok: false, error: "Amount must be at least 100 paise." });
    }

    const order: any = await createRazorpayOrder({ amount, currency, receipt });
    const { keyId } = getRazorpayCredentials();

    const paymentId = makeId();
    const payments = await readPayments();

    payments.push({
      id: paymentId,
      orderId: order.id,
      amount,
      currency,
      receipt,
      status: "PENDING",
      payload,
      description: String(body.description || `${payload.service || "booking"} ${payload.duration || ""}`),
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

    const booking = await createBookingFromPayment(payments[index], paymentId);

    if (returnUrl) {
      const url = new URL(returnUrl);
      url.searchParams.set("payment_status", "success");
      url.searchParams.set("payment_id", paymentId);
      url.searchParams.set("order_id", orderId);
      return res.redirect(303, url.toString());
    }

    return res.json({ ok: true, verified: true, payment: payments[index], booking });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Create a checkout session and return a checkout URL
router.post("/payments/create-checkout", async (req, res) => {
  try {
    const body = req.body || {};
    const amount = Number(body.amount || (body.payload && body.payload.paymentAmount) || 0);
    const payload = body.payload || {};
    const description = String(body.description || `${payload.service || "booking"} ${payload.duration || ""}`);
    const gateway = resolveGateway(body.gateway || payload.presentCountry || payload.country || body.presentCountry || body.country);

    if (!amount || amount <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid amount" });
    }

    const paymentId = makeId();

    const payments = await readPayments();
    const newPayment = {
      id: paymentId,
      amount,
      currency: body.currency || "INR",
      status: "PENDING",
      payload,
      description,
      gateway,
      createdAt: new Date().toISOString(),
    };

    payments.push(newPayment);
    await writePayments(payments);

    const gatewayName = gateway === "razorpay" ? "Razorpay" : "SMEpay";
    const createUrl =
      gateway === "razorpay"
        ? process.env.RAZORPAY_CREATE_URL || process.env.RAZORPAY_API_URL || ""
        : process.env.SMEPAY_CREATE_URL || process.env.SMEPAY_API_URL || "";
    const apiKey =
      gateway === "razorpay"
        ? process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_SECRET || ""
        : process.env.SMEPAY_API_KEY || process.env.SMEPAY_SECRET || "";

    let checkoutUrl = "";

    if (createUrl && apiKey) {
      try {
        const createBody = {
          amount,
          currency: newPayment.currency,
          description,
          payment_id: paymentId,
          return_url: body.returnUrl || `${req.protocol}://${req.get("host")}/payment`,
        };

        const resp = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(createBody),
        });

        const apiResp: any = await resp.json().catch(() => null);

        // store gateway response on the payment record
        const paymentsAfter = await readPayments();
        const idx = paymentsAfter.findIndex((p: any) => p.id === paymentId);
        if (idx !== -1) {
          paymentsAfter[idx].gateway = gateway;
          paymentsAfter[idx].gatewayResponse = apiResp || null;
          await writePayments(paymentsAfter);
        }

        if (resp.ok && apiResp) {
          // common fields returned by gateway
          checkoutUrl = apiResp.checkout_url || apiResp.url || apiResp.redirect_url || "";
        }
      } catch (err) {
        // ignore and fallback to composed URL below
        checkoutUrl = "";
      }
    }

    // Fallback: build checkout URL from the configured gateway base URL
    if (!checkoutUrl) {
      const base =
        gateway === "razorpay"
          ? process.env.RAZORPAY_CHECKOUT_URL || process.env.RAZORPAY_BASE_URL || ""
          : process.env.SMEPAY_CHECKOUT_URL || process.env.SMEPAY_BASE_URL || "";
      if (base) {
        try {
          const url = new URL(base);
          url.searchParams.set("amount", String(amount));
          url.searchParams.set("currency", newPayment.currency);
          url.searchParams.set("description", description);
          url.searchParams.set("payment_id", paymentId);
          url.searchParams.set("return_url", body.returnUrl || `${req.protocol}://${req.get("host")}/payment`);
          checkoutUrl = url.toString();
        } catch (err) {
          // fallback
          checkoutUrl = `${base}?amount=${amount}&payment_id=${paymentId}`;
        }
      }
    }

    if (!checkoutUrl) {
      return res.status(500).json({ ok: false, error: `${gatewayName} checkout is not configured.` });
    }

    return res.json({ ok: true, paymentId, checkoutUrl, gateway });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
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

// Webhook endpoint: SMEpay will POST here to notify of payment events.
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

    payments[index].status = status === "PAID" || status === "SUCCESS" ? "PAID" : status === "FAILED" ? "FAILED" : status;
    payments[index].reference = reference;
    payments[index].updatedAt = new Date().toISOString();

    await writePayments(payments);

    // If paid, create booking server-side from payload (idempotent: check bookings for existing raw.paymentReference)
    if (payments[index].status === "PAID") {
      const payload = payments[index].payload || {};
      const booking = {
        id: payload.id || `booking_${Date.now()}`,
        clientName: payload.name || payload.clientName || "",
        clientPhone: payload.phone || payload.clientPhone || payload.whatsapp || "",
        startTime: payload.slotTiming?.startTime || payload.startTime || "",
        endTime: payload.slotTiming?.endTime || payload.endTime || "",
        bufferEndTime: payload.slotTiming?.bufferEndTime || payload.bufferEndTime || "",
        durationMinutes: payload.slotTiming?.durationMinutes || payload.durationMinutes || 0,
        sessionType: (payload.service || payload.sessionType || "").toString().toLowerCase(),
        paymentMethod: payments[index].gateway === "razorpay" ? "Razorpay" : "SMEpay",
        paymentAmount: payments[index].amount || 0,
        paymentStatus: "PAID",
        paymentReference: reference || payments[index].id,
        status: "BOOKED",
        bookingTime: new Date().toISOString(),
        raw: payload,
      };

      const bookings = await readBookings();

      // avoid duplicate booking creation for same paymentReference
      const already = bookings.find((b: any) => b.paymentReference && b.paymentReference === booking.paymentReference);
      if (!already) {
        bookings.push(booking);
        await writeBookings(bookings);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
