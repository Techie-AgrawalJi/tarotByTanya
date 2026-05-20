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

    const submitBooking = async () => {
      setPaymentState("processing");
      setHasSubmitted(true);

      try {
        const payload = {
          ...draft.payload,
          paymentMethod: "SMEpay",
          paymentAmount: draft.amount,
          paymentStatus: "PAID",
          paymentReference: paymentStatus.paymentId,
        };

        const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
        const response = await fetch(`${API_BASE}/api/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const json = await response.json().catch(() => null);

        if (!response.ok || !json?.booking) {
          throw new Error(json?.error || "Payment succeeded but booking submission failed");
        }

        const serverBooking = json.booking as Partial<BookedSession> & {
          paymentAmount?: number;
          paymentStatus?: string;
          paymentReference?: string;
        };

        addBooking({
          id: serverBooking.id || `booking_${Date.now()}`,
          clientName: serverBooking.clientName || String((draft.payload.name as string) || ""),
          clientPhone: serverBooking.clientPhone || String((draft.payload.phone as string) || ""),
          startTime: serverBooking.startTime || draft.slotTiming?.startTime || "",
          endTime: serverBooking.endTime || draft.slotTiming?.endTime || "",
          bufferEndTime: serverBooking.bufferEndTime || draft.slotTiming?.bufferEndTime || "",
          durationMinutes: serverBooking.durationMinutes || draft.slotTiming?.durationMinutes || 0,
          sessionType: serverBooking.sessionType || String((draft.payload.service as string) || "tarot").toLowerCase() as BookedSession["sessionType"],
          paymentMethod: serverBooking.paymentMethod || "SMEpay",
          paymentAmount: serverBooking.paymentAmount || draft.amount,
          paymentStatus: (serverBooking.paymentStatus as BookedSession["paymentStatus"]) || "PAID",
          paymentReference: serverBooking.paymentReference || paymentStatus.paymentId,
          status: serverBooking.status || "BOOKED",
          bookingTime: serverBooking.bookingTime || new Date().toISOString(),
        });

        clearBookingDraft();
        setPaymentState("success");
        setMessage("Payment received and booking confirmed.");
      } catch (error) {
        setPaymentState("error");
        setMessage(error instanceof Error ? error.message : "Unable to confirm booking after payment.");
      }
    };

    submitBooking();
  }, [draft, hasSubmitted]);

  if (!draft) {
    return null;
  }

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
              onClick={() => {
                if (!checkoutUrl) {
                  setPaymentState("error");
                  setMessage("SMEpay checkout URL is not configured.");
                  return;
                }

                setPaymentState("redirecting");
                window.location.href = checkoutUrl;
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
