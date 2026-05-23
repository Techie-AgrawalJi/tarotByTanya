import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import {
  clearBookingDraft,
  loadBookingDraft,
  resolvePaymentGateway,
} from "@/lib/bookingCheckout";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  callback_url?: string;
  redirect?: boolean;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessPayload) => void;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (eventName: string, callback: (response: any) => void) => void;
};

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;

function getApiBaseUrl() {
  return ((import.meta as any).env.VITE_API_BASE_URL || (import.meta as any).env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, "");
}

function getAppUrl(pathname = "/") {
  const basePath = String(import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${window.location.origin}${basePath}${normalizedPath === "/" ? "/" : normalizedPath}`;
}

function getRazorpayKeyId() {
  return String((import.meta as any).env.VITE_RAZORPAY_KEY_ID || "").trim();
}

function makePaymentReference() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pay_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `pay_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function reserveSlotBeforePayment(API_BASE: string, paymentReference: string, draft: NonNullable<ReturnType<typeof loadBookingDraft>>) {
  const slotTiming = draft.slotTiming;
  if (!slotTiming) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/bookings/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...draft.payload,
      slotTiming,
      paymentReference,
      paymentId: paymentReference,
      paymentMethod: resolvePaymentGateway(String(draft.payload.presentCountry || draft.payload.country || "")) === "razorpay" ? "Razorpay" : "SMEpay",
      paymentAmount: draft.amount,
      status: "HELD",
    }),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Unable to reserve this slot.");
  }

  return json.booking;
}

async function confirmSuccessfulPayment(API_BASE: string, paymentReference: string) {
  try {
    const paymentResponse = await fetch(`${API_BASE}/api/payments/${encodeURIComponent(paymentReference)}`, {
      cache: "no-store",
    });
    const paymentJson = await paymentResponse.json().catch(() => null);
    if (paymentResponse.ok && paymentJson?.payment?.status === "PAID") {
      return true;
    }
  } catch {
    // ignore and fall through to booking lookup
  }

  try {
    const bookingsResponse = await fetch(`${API_BASE}/api/bookings`, { cache: "no-store" });
    const bookingsJson = await bookingsResponse.json().catch(() => null);
    const bookings = Array.isArray(bookingsJson?.bookings) ? bookingsJson.bookings : [];

    return bookings.some((booking: any) => {
      const bookingReference = String(booking.paymentReference || booking.raw?.paymentReference || "");
      const bookingGatewayPaymentId = String(booking.gatewayPaymentId || booking.razorpayPaymentId || booking.raw?.paymentId || booking.raw?.razorpay_payment_id || "");
      return bookingReference === paymentReference || bookingGatewayPaymentId === paymentReference;
    });
  } catch {
    return false;
  }
}

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is only available in the browser."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Unable to load Razorpay Checkout SDK.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay Checkout SDK."));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

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

  function goHome() {
    window.location.replace(getAppUrl("/"));
  }

  useEffect(() => {
    const currentDraft = loadBookingDraft();
    if (!currentDraft) {
      navigate("/");
      return;
    }

    setDraft(currentDraft);
  }, [navigate]);

  async function handleRazorpayPayment() {
    const amountPaise = Math.max(100, Math.round(draft?.amount ? draft.amount * 100 : 0));
    const API_BASE = getApiBaseUrl();
    const paymentReference = makePaymentReference();

    setPaymentState("redirecting");

    try {
      await reserveSlotBeforePayment(API_BASE, paymentReference, draft as NonNullable<typeof draft>);

      const createOrderResponse = await fetch(`${API_BASE}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `booking_${Date.now()}`,
          description: `${draft?.serviceLabel || "Booking"} - ${draft?.durationLabel || "Package"}`,
          payload: draft?.payload,
          paymentId: paymentReference,
        }),
      });

      const createOrderJson = await createOrderResponse.json().catch(() => null);
      if (!createOrderResponse.ok || !createOrderJson?.order_id) {
        throw new Error(createOrderJson?.error || "Unable to create Razorpay order.");
      }

      const keyId = getRazorpayKeyId();
      if (!keyId) {
        throw new Error("Razorpay key id is not configured.");
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout could not be initialized.");
      }

      let completed = false;

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: Number(createOrderJson.amount || amountPaise),
        currency: String(createOrderJson.currency || "INR"),
        order_id: String(createOrderJson.order_id),
        name: "Tarot By Tanya",
        description: `${draft?.serviceLabel || "Booking"} - ${draft?.durationLabel || "Package"}`,
        prefill: {
          name: String(draft?.payload.name || ""),
          email: String(draft?.payload.email || ""),
          contact: String(draft?.payload.phone || ""),
        },
        notes: {
          payment_record_id: String(createOrderJson.payment_id || paymentReference || ""),
        },
        theme: {
          color: "#d4b46a",
        },
        modal: {
          ondismiss: () => {
            if (completed) return;
            setPaymentState("error");
            setMessage("Payment window was closed before completion.");
          },
        },
            handler: async (response) => {
          try {
            setPaymentState("processing");

            const verifyResponse = await fetch(`${API_BASE}/api/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                payment_record_id: paymentReference,
              }),
            });

            const verifyJson = await verifyResponse.json().catch(() => null);
            if (!verifyResponse.ok || !verifyJson?.verified) {
              throw new Error(verifyJson?.error || "Unable to verify payment.");
            }
            
            completed = true;
            setPaymentState("success");
            setMessage("Payment verified and booking confirmed.");
            clearBookingDraft();
            // Show success UI briefly so user sees confirmation, then redirect home.
            setTimeout(() => {
              goHome();
            }, 6000);
          } catch (err) {
            const conflictMessage = err instanceof Error ? err.message : String(err || "");

            if (conflictMessage.includes("Slot already booked or reserved")) {
              const confirmed = await confirmSuccessfulPayment(API_BASE, paymentReference);
              if (confirmed) {
                completed = true;
                setPaymentState("success");
                setMessage("Payment verified and booking confirmed.");
                clearBookingDraft();
                setTimeout(() => {
                  goHome();
                }, 6000);
                return;
              }
            }

            setPaymentState("error");
            setMessage(err instanceof Error ? err.message : "Unable to verify payment.");
          }
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        if (completed) return;
        setPaymentState("error");
        setMessage(response?.error?.description || "Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (err) {
      setPaymentState("error");
      setMessage(err instanceof Error ? err.message : "Unable to open Razorpay checkout.");
    }
  }

  useEffect(() => {
    if (!draft || hasSubmitted) return;

    const paymentStatus = readPaymentStatus();
    if (!paymentStatus.isSuccess) return;

    // If SMEpay returned a payment_id/status in the query, we'll poll the server for a verified status
    const pollServerForStatus = async () => {
      setPaymentState("processing");
      setHasSubmitted(true);
      try {
        const API_BASE = getApiBaseUrl();
        const resp = await fetch(`${API_BASE}/api/payments/${paymentStatus.paymentId}`);
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json?.payment) throw new Error(json?.error || "Unable to read payment status");

        const payment = json.payment;
        if (payment.status === "PAID") {
          // booking should have been created server-side by webhook; check bookings via API or assume created
          setPaymentState("success");
          setMessage("Payment received and booking confirmed.");
          clearBookingDraft();
          // show confirmation to user before redirect
          setTimeout(() => goHome(), 6000);
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

  const paymentGateway = draft.paymentGateway ?? resolvePaymentGateway(String(draft.payload.presentCountry || draft.payload.country || ""));
  const gatewayLabel = paymentGateway === "razorpay" ? "Razorpay" : "SMEpay";

  return (
    <main className="min-h-screen bg-[#090712] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-white/10 bg-[#0b0b18]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-10">
        <button
          type="button"
          onClick={() => {
            // Navigate to the booking anchor which will reload the booking page and restore draft from sessionStorage.
            window.location.assign(getAppUrl("/#booking"));
          }}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-primary/70">{gatewayLabel} Checkout</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Complete payment to confirm booking</h1>
          <p className="text-white/65">
            Your booking will be created only after {gatewayLabel} confirms the payment.
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
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Country</p>
            <p className="mt-1 text-lg text-white">{String(draft.payload.presentCountry || draft.payload.country || "")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p>
              The amount is fixed and uneditable for this package. After {gatewayLabel} shows success, the booking will be sent automatically.
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
              onClick={paymentGateway === "razorpay" ? handleRazorpayPayment : async () => {
                setPaymentState("redirecting");

                try {
                  const API_BASE = getApiBaseUrl();
                  const paymentReference = makePaymentReference();
                  await reserveSlotBeforePayment(API_BASE, paymentReference, draft as NonNullable<typeof draft>);

                  const resp = await fetch(`${API_BASE}/api/payments/create-checkout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                      amount: draft.amount,
                      currency: "INR",
                      description: `${draft.serviceLabel} - ${draft.durationLabel}`,
                      payload: draft.payload,
                      gateway: paymentGateway,
                      presentCountry: draft.payload.presentCountry || draft.payload.country,
                      returnUrl: `${window.location.origin}/payment`,
                      paymentId: paymentReference,
                    }),
                  });

                  const json = await resp.json().catch(() => null);
                  if (!resp.ok || !json?.checkoutUrl) {
                    throw new Error(json?.error || "Unable to create checkout");
                  }

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
              {paymentState === "redirecting"
                ? paymentGateway === "razorpay"
                  ? `Opening ${gatewayLabel}...`
                  : `Redirecting to ${gatewayLabel}...`
                : `Pay with ${gatewayLabel}`}
            </button>

            <button
              type="button"
              onClick={() => {
                  // Always navigate to the booking anchor so the booking form mounts and restores draft reliably.
                  window.location.assign(getAppUrl("/#booking"));
                }}
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
