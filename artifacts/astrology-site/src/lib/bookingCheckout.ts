export interface BookingSlotTiming {
  date: string;
  startTime: string;
  endTime: string;
  bufferEndTime: string;
  durationMinutes: number;
  sessionSummary?: string;
}

export interface BookingDraft {
  payload: Record<string, unknown>;
  amount: number;
  amountLabel: string;
  serviceLabel: string;
  durationLabel: string;
  createdAt: string;
  paymentGateway?: "razorpay";
  slotTiming?: BookingSlotTiming;
}

export type PaymentGateway = "razorpay";

const BOOKING_DRAFT_KEY = "booking_draft";

export function parsePriceLabel(priceLabel: string): number {
  const digits = priceLabel.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function resolvePaymentGateway(): PaymentGateway {
  return "razorpay";
}

export function saveBookingDraft(draft: BookingDraft) {
  sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
}

export function loadBookingDraft(): BookingDraft | null {
  const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  sessionStorage.removeItem(BOOKING_DRAFT_KEY);
}

export function buildRazorpayCheckoutUrl(draft: BookingDraft): string | null {
  const baseUrl = (import.meta as any).env.VITE_RAZORPAY_CHECKOUT_URL;
  if (!baseUrl) return null;

  const checkoutUrl = new URL(baseUrl);
  checkoutUrl.searchParams.set("amount", String(draft.amount));
  checkoutUrl.searchParams.set("currency", (import.meta as any).env.VITE_RAZORPAY_CURRENCY || "INR");
  checkoutUrl.searchParams.set("description", `${draft.serviceLabel} - ${draft.durationLabel}`);
  checkoutUrl.searchParams.set("return_url", (import.meta as any).env.VITE_RAZORPAY_RETURN_URL || `${window.location.origin}/payment`);
  checkoutUrl.searchParams.set("cancel_url", (import.meta as any).env.VITE_RAZORPAY_CANCEL_URL || `${window.location.origin}/payment`);
  return checkoutUrl.toString();
}
