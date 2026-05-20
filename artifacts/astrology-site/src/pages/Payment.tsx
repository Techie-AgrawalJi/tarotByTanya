import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { addBooking } from "@/lib/bookingsStore";
import { type BookedSession } from "@/lib/slotManager";
import {
  buildSmepayCheckoutUrl,
  clearBookingDraft,
  loadBookingDraft,
} from "@/lib/bookingCheckout";

function readPaymentStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = (params.get("status") || params.get("payment_status") || params.get("paymentStatus") || "").toLowerCase();
  const paymentId = params.get("payment_id") || params.get("paymentId") || params.get("txn_id") || params.get("reference");
  return {
    isSuccess: status === "success" || status === "paid" || !!paymentId,
    paymentId: paymentId || "",
  };
}

export default function Payment() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState(() => loadBookingDraft());
  const [paymentState, setPaymentState] = useState<"idle" | "redirecting" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const currentDraft = loadBookingDraft();
    if (!currentDraft) {
      navigate("/");
      return;
    }

    setDraft(currentDraft);
  }, [navigate]);

  useEffect(() => {
    if (!draft || hasSubmitted) return;

    const paymentStatus = readPaymentStatus();
    if (!paymentStatus.isSuccess) return;

    // If SMEpay returned a payment_id/status in the query, we'll poll the server for a verified status
    const pollServerForStatus = async () => {
      setPaymentState("processing");
      setHasSubmitted(true);
      try {
        const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
        const resp = await fetch(`${API_BASE}/api/payments/${paymentStatus.paymentId}`);
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json?.payment) throw new Error(json?.error || "Unable to read payment status");

        const payment = json.payment;
        if (payment.status === "PAID") {
          // booking should have been created server-side by webhook; check bookings via API or assume created
          setPaymentState("success");
          setMessage("Payment received and booking confirmed.");
          clearBookingDraft();
        } else if (payment.status === "FAILED") {
          setPaymentState("error");
          setMessage("Payment failed. No booking was created.");
        } else {
          // still pending — retry a few times
          setTimeout(pollServerForStatus, 2000);
        }
      } catch (err) {
        setPaymentState("error");
        setMessage(err instanceof Error ? err.message : "Unable to verify payment status.");
      }
    };

    pollServerForStatus();
  }, [draft, hasSubmitted]);

  if (!draft) {
    return null;
  }

  // We now request a server-created checkout URL; fallback to client-built URL
  const checkoutUrl = buildSmepayCheckoutUrl(draft);

  return (
    <main className="min-h-screen bg-[#090712] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-[#0b0b18]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70">SMEpay Checkout</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Complete payment to confirm booking</h1>
          <p className="text-white/65">
            Your booking will be created only after SMEpay confirms the payment.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Service</p>
            <p className="mt-1 text-lg text-white">{draft.serviceLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Package</p>
            <p className="mt-1 text-lg text-white">{draft.durationLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Amount</p>
            <p className="mt-1 text-2xl font-semibold text-primary">₹{draft.amount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Name</p>
            <p className="mt-1 text-lg text-white">{String(draft.payload.name || "")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p>
              The amount is fixed and uneditable for this package. After SMEpay shows success, the booking will be sent automatically.
            </p>
          </div>
        </div>

        {paymentState === "success" ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-semibold text-white">Booking confirmed</h2>
            <p className="mt-2 text-white/70">{message}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Return home
            </button>
          </div>
        ) : paymentState === "error" ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-center">
            <h2 className="text-2xl font-semibold text-white">Payment callback received</h2>
            <p className="mt-2 text-white/70">{message}</p>
            <p className="mt-3 text-sm text-white/55">You can try again from the payment page or contact support.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={async () => {
                setPaymentState("redirecting");

                try {
                  const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
                  const resp = await fetch(`${API_BASE}/api/payments/create-checkout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                      amount: draft.amount,
                      currency: "INR",
                      description: `${draft.serviceLabel} - ${draft.durationLabel}`,
                      payload: draft.payload,
                      returnUrl: `${window.location.origin}/payment`,
                    }),
                  });

                  const json = await resp.json().catch(() => null);
                  if (!resp.ok || !json?.checkoutUrl) {
                    throw new Error(json?.error || "Unable to create checkout");
                  }

                  // Save payment id in session so return page can read it if needed
                  try {
                    sessionStorage.setItem("pending_payment_id", json.paymentId);
                  } catch {}

                  window.location.href = json.checkoutUrl;
                } catch (err) {
                  setPaymentState("error");
                  setMessage(err instanceof Error ? err.message : "Unable to open checkout.");
                }
              }}
              disabled={paymentState === "redirecting" || paymentState === "processing"}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentState === "redirecting" ? "Opening SMEpay..." : "Pay with SMEpay"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-4 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
