type BookingLike = Record<string, any>;

export type WhatsAppConfirmationResult = {
  sent: boolean;
  messageId?: string;
  reason?: string;
  error?: string;
};

function trimValue(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = trimValue(value);
    if (text) return text;
  }

  return "";
}

function normalizePhoneNumber(phone: unknown): string {
  const digits = trimValue(phone).replace(/\D+/g, "");
  if (!digits) return "";

  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  if (digits.length === 10) {
    const defaultCountryCode = trimValue(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91").replace(/\D+/g, "");
    return defaultCountryCode ? `${defaultCountryCode}${digits}` : digits;
  }

  return digits;
}

function formatLine(label: string, value: unknown): string {
  const text = trimValue(value);
  return text ? `${label}: ${text}` : "";
}

function buildBookingDetailsMessage(booking: BookingLike): string {
  const raw = booking.raw || {};
  const slotTiming = raw.slotTiming || booking.slotTiming || {};
  const serviceLabel = firstNonEmpty(raw.service, booking.sessionType, booking.service, raw.sessionType);
  const durationLabel = firstNonEmpty(raw.duration, booking.durationLabel, booking.durationMinutes ? `${booking.durationMinutes} minutes` : "");
  const appointmentDate = firstNonEmpty(slotTiming.date, booking.slotDate, raw.date, booking.date);
  const startTime = firstNonEmpty(slotTiming.startTime, booking.startTime, raw.startTime);
  const endTime = firstNonEmpty(slotTiming.endTime, booking.endTime, raw.endTime);

  const lines = [
    "Tarot By Tanya",
    "Booking confirmed",
    "",
    formatLine("Name", firstNonEmpty(booking.clientName, raw.name, raw.clientName)),
    formatLine("WhatsApp Number", firstNonEmpty(booking.clientPhone, raw.phone, raw.clientPhone, raw.whatsapp)),
    formatLine("Date of Birth", firstNonEmpty(raw.dob, booking.dob)),
    formatLine("Birth Place", firstNonEmpty(raw.birthLocation, raw.placeOfBirth, booking.birthLocation)),
    formatLine("Gender", firstNonEmpty(raw.gender, booking.gender)),
    formatLine("Marital Status", firstNonEmpty(raw.maritalStatus, booking.maritalStatus)),
    formatLine("Occupation", firstNonEmpty(raw.occupation, booking.occupation)),
    formatLine("Service", serviceLabel),
    formatLine("Duration", durationLabel),
    formatLine("Date", appointmentDate),
    formatLine("Start Time", startTime),
    formatLine("End Time", endTime),
    formatLine("Your Note", firstNonEmpty(raw.message, booking.message)),
    formatLine("Payment Amount", booking.paymentAmount ? `₹${booking.paymentAmount}` : raw.paymentAmount),
    formatLine("Payment Reference", firstNonEmpty(booking.paymentReference, booking.id, raw.paymentReference, raw.paymentId)),
  ].filter(Boolean);

  lines.push("", "If any detail is incorrect, reply to this WhatsApp message.");

  return lines.join("\n");
}

export async function sendBookingWhatsAppConfirmation(booking: BookingLike): Promise<WhatsAppConfirmationResult> {
  const recipient = normalizePhoneNumber(
    booking.clientPhone || booking.phone || booking.whatsapp || booking.raw?.phone || booking.raw?.clientPhone || booking.raw?.whatsapp,
  );

  if (!recipient) {
    return { sent: false, reason: "missing_phone" };
  }

  const accessToken = trimValue(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN);
  const phoneNumberId = trimValue(process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (!accessToken || !phoneNumberId) {
    return { sent: false, reason: "not_configured" };
  }

  const apiVersion = trimValue(process.env.WHATSAPP_API_VERSION || "v20.0");
  const apiUrl = trimValue(process.env.WHATSAPP_CLOUD_API_URL) || `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const message = buildBookingDetailsMessage(booking);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    const responseJson: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        sent: false,
        reason: "provider_error",
        error: String(responseJson?.error?.message || responseJson?.error?.error_user_msg || responseJson?.error || "Unable to send WhatsApp confirmation."),
      };
    }

    return {
      sent: true,
      messageId: String(responseJson?.messages?.[0]?.id || responseJson?.messages?.[0]?.message_id || ""),
    };
  } catch (error) {
    return {
      sent: false,
      reason: "request_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}