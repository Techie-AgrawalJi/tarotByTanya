import { Router } from "express";
import { readPayments, writePayments, findPaymentById } from "../lib/paymentsStore";
import { readBookings, writeBookings } from "../lib/bookingsStore";

const router = Router();

function makeId(prefix = "pay_") {
  return `${prefix}${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

// Create a checkout session and return a checkout URL
router.post("/payments/create-checkout", async (req, res) => {
  try {
    const body = req.body || {};
    const amount = Number(body.amount || (body.payload && body.payload.paymentAmount) || 0);
    const payload = body.payload || {};
    const description = String(body.description || `${payload.service || "booking"} ${payload.duration || ""}`);

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
      createdAt: new Date().toISOString(),
    };

    payments.push(newPayment);
    await writePayments(payments);

    // Attempt server-side SMEpay session creation when credentials are present
    const smepayCreateUrl = process.env.SMEPAY_CREATE_URL || process.env.SMEPAY_API_URL || "";
    const smepayApiKey = process.env.SMEPAY_API_KEY || process.env.SMEPAY_SECRET || "";

    let checkoutUrl = "";

    if (smepayCreateUrl && smepayApiKey) {
      try {
        const createBody = {
          amount,
          currency: newPayment.currency,
          description,
          payment_id: paymentId,
          return_url: body.returnUrl || `${req.protocol}://${req.get("host")}/payment`,
        };

        const resp = await fetch(smepayCreateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${smepayApiKey}`,
          },
          body: JSON.stringify(createBody),
        });

        const apiResp: any = await resp.json().catch(() => null);

        // store gateway response on the payment record
        const paymentsAfter = await readPayments();
        const idx = paymentsAfter.findIndex((p: any) => p.id === paymentId);
        if (idx !== -1) {
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

    // Fallback: build checkout URL from SMEpay base configured in env
    if (!checkoutUrl) {
      const base = process.env.SMEPAY_CHECKOUT_URL || process.env.SMEPAY_BASE_URL || "";
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

    return res.json({ ok: true, paymentId, checkoutUrl });
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
        paymentMethod: "SMEpay",
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
