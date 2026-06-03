import { logger } from "./logger";

type BookingLike = Record<string, any>;

export type EmailConfirmationResult = {
  sent: boolean;
  messageId?: string;
  reason?: string;
  error?: string;
};

type BookingDetail = {
  label: string;
  value: string;
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

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateLabel(value: unknown): string {
  const text = trimValue(value);
  if (!text) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parsed);
  }

  return text;
}

function formatTimeRange(startTime: unknown, endTime: unknown): string {
  const start = trimValue(startTime);
  const end = trimValue(endTime);

  if (start && end) {
    return `${start} to ${end}`;
  }

  return start || end || "";
}

function formatAmount(value: unknown): string {
  const text = trimValue(value);
  if (!text) return "";
  if (/^₹/.test(text)) return text;

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    // Payments are often stored in paise (smallest currency unit). If the
    // numeric value looks like paise (multiple of 100) and is >= 100,
    // convert to rupees by dividing by 100. Otherwise assume it's already
    // in rupees.
    if (numeric >= 100 && numeric % 100 === 0) {
      const rupees = numeric / 100;
      return Number.isInteger(rupees) ? `₹${rupees}` : `₹${rupees.toFixed(2)}`;
    }

    // Fallback: format as rupees, keeping decimals when present
    return Number.isInteger(numeric) ? `₹${numeric}` : `₹${numeric.toFixed(2)}`;
  }

  return text;
}

function getRecipientEmail(booking: BookingLike): string {
  return trimValue(
    booking.clientEmail ||
      booking.email ||
      booking.raw?.email ||
      booking.raw?.clientEmail ||
      booking.payload?.email ||
      booking.payload?.clientEmail ||
      "",
  ).toLowerCase();
}

function getSenderDetails() {
  const senderEmail = trimValue(process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL);
  const senderName = trimValue(process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || "Tarot By Tanya");
  const replyToEmail = trimValue(process.env.BREVO_REPLY_TO_EMAIL || senderEmail);
  const apiKey = trimValue(process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY);
  const apiUrl = trimValue(process.env.BREVO_API_URL) || "https://api.brevo.com/v3/smtp/email";

  return { senderEmail, senderName, replyToEmail, apiKey, apiUrl };
}

function buildBookingDetails(booking: BookingLike): BookingDetail[] {
  const raw = booking.raw || {};
  const slotTiming = raw.slotTiming || booking.slotTiming || {};
  const paymentStatus = titleCase(firstNonEmpty(booking.paymentStatus, raw.paymentStatus, "Paid"));
  const sessionType = titleCase(firstNonEmpty(booking.sessionType, raw.service, raw.sessionType));
  const appointmentDate = formatDateLabel(firstNonEmpty(slotTiming.date, booking.slotDate, raw.date, booking.date));
  const timeRange = formatTimeRange(firstNonEmpty(slotTiming.startTime, booking.startTime, raw.startTime), firstNonEmpty(slotTiming.endTime, booking.endTime, raw.endTime));
  const paymentAmount = formatAmount(firstNonEmpty(booking.paymentAmount, raw.paymentAmount, raw.amount));

  return [
    { label: "Client name", value: firstNonEmpty(booking.clientName, raw.name, raw.clientName) },
    { label: "Client email", value: getRecipientEmail(booking) },
    { label: "Session type", value: sessionType },
    { label: "Date", value: appointmentDate },
    { label: "Time", value: timeRange },
    { label: "Duration", value: firstNonEmpty(booking.durationLabel, booking.durationMinutes ? `${booking.durationMinutes} minutes` : raw.duration, raw.durationMinutes ? `${raw.durationMinutes} minutes` : "") },
    { label: "Payment status", value: paymentStatus },
    { label: "Payment amount", value: paymentAmount },
    { label: "Payment method", value: firstNonEmpty(booking.paymentMethod, raw.paymentMethod, "Online payment") },
    { label: "Payment reference", value: firstNonEmpty(booking.paymentReference, booking.id, raw.paymentReference, raw.paymentId, raw.orderId) },
  ].filter((item) => Boolean(item.value));
}

function buildHtmlBody(booking: BookingLike): string {
  const raw = booking.raw || {};
  const guideContact = firstNonEmpty(
    booking.guidePhone,
    booking.raw?.guidePhone,
    booking.raw?.guide?.phone,
    process.env.GUIDE_WHATSAPP_NUMBER,
  );
  const guideName = firstNonEmpty(booking.raw?.guide?.name, process.env.GUIDE_CONTACT_NAME || "Your guide");
  const senderName = trimValue(process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || "Tarot By Tanya");
  const clientName = firstNonEmpty(booking.clientName, raw.name, raw.clientName, "Client");
  const sessionType = titleCase(firstNonEmpty(booking.sessionType, raw.service, raw.sessionType, "Tarot Reading"));
  const appointmentDate = formatDateLabel(firstNonEmpty(raw.slotTiming?.date, booking.slotDate, raw.date, booking.date));
  const timeRange = formatTimeRange(firstNonEmpty(raw.slotTiming?.startTime, booking.startTime, raw.startTime), firstNonEmpty(raw.slotTiming?.endTime, booking.endTime, raw.endTime));
  const paymentAmount = formatAmount(firstNonEmpty(booking.paymentAmount, raw.paymentAmount, raw.amount));
  const details = buildBookingDetails(booking);

  const rows = details
    .map(
      (detail) => `
        <tr>
          <td style="padding:12px 0;color:#9fa8bc;font-size:14px;vertical-align:top;width:40%;">${detail.label}</td>
          <td style="padding:12px 0;color:#e8ebf5;font-size:14px;font-weight:600;vertical-align:top;">${detail.value}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="margin:0;padding:0;background:#f3efe7;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your tarot session is confirmed for ${appointmentDate || timeRange}.</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3efe7;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#0f1020;border:1px solid rgba(212,180,106,0.18);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,16,32,0.18);font-family:Arial,Helvetica,sans-serif;">
              <tr>
                <td style="padding:0;background:linear-gradient(135deg,#0f1020 0%,#1f1a31 55%,#3b2f17 100%);">
                  <div style="padding:32px 34px 28px 34px;">
                    <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#d4b46a;font-weight:700;">${senderName}</div>
                    <h1 style="margin:14px 0 10px 0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:700;">Your booking is confirmed</h1>
                    <p style="margin:0;color:#d7dbea;font-size:15px;line-height:1.7;max-width:560px;">Thank you, ${clientName}. Your session has been secured and payment has been received. Please find your booking summary below.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 34px 32px 34px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:-12px;background:#151730;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;">
                    <tr>
                      <td style="padding-bottom:20px;">
                        <div style="color:#d4b46a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Booking summary</div>
                        <div style="margin-top:8px;color:#ffffff;font-size:22px;font-weight:700;">${sessionType}</div>
                        <div style="margin-top:6px;color:#aeb5ca;font-size:14px;line-height:1.6;">${appointmentDate || ""}${appointmentDate && timeRange ? " · " : ""}${timeRange || ""}</div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:22px;">
                        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;color:#c8cfdf;font-size:14px;line-height:1.7;">
                          Payment of ${paymentAmount || "your selected package"} is confirmed. We will use this email for any updates or follow-ups related to your reading.
                        </div>
                      </td>
                    </tr>
                    ${guideContact ? `
                      <tr>
                        <td style="padding-top:16px;">
                          <div style="margin-top:12px;padding:18px;border-radius:14px;background:#171427;color:#e8eaf6;font-size:14px;line-height:1.6;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                            <div style="font-weight:800;color:#ffd88a;margin-bottom:8px;font-size:16px;">📲 Connect with ${guideName}</div>
                            <div style="margin-bottom:10px;color:#cdd6e6;font-size:14px;">To connect with your guide via WhatsApp, please message or call:</div>
                            <a href="https://wa.me/${String(guideContact).replace(/[^0-9]/g,"")}" style="display:inline-block;padding:10px 14px;background:#d4b46a;color:#0f1020;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">${guideContact}</a>
                            <div style="margin-top:12px;color:#c8cfdf;font-size:13px;">Please take a screenshot of this email and send it to the number above via WhatsApp so the guide can match your booking.</div>
                          </div>
                        </td>
                      </tr>
                    ` : ""}
                  </table>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </div>`;
}

function buildTextBody(booking: BookingLike): string {
  const details = buildBookingDetails(booking);
  const guideContact = firstNonEmpty(
    booking.guidePhone,
    booking.raw?.guidePhone,
    booking.raw?.guide?.phone,
    process.env.GUIDE_WHATSAPP_NUMBER,
  );
  const guideName = firstNonEmpty(booking.raw?.guide?.name, process.env.GUIDE_CONTACT_NAME || "Your guide");

  const lines = [
    "Tarot By Tanya",
    "Your booking is confirmed.",
    "",
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    "",
    "Payment has been confirmed and your session is secured.",
  ];

  if (guideContact) {
    lines.push("");
    lines.push(`Connect with ${guideName}: ${guideContact}`);
    lines.push("Please take a screenshot of this email and send it to the number above via WhatsApp so the guide can match your booking.");
  }

  return lines.join("\n");
}

function extractErrorMessage(payload: any): string {
  return String(
    payload?.message ||
      payload?.error?.message ||
      payload?.errors?.[0]?.message ||
      payload?.error?.error_user_msg ||
      payload?.error ||
      "Unable to send booking confirmation email.",
  );
}

export async function sendBookingEmailConfirmation(booking: BookingLike): Promise<EmailConfirmationResult> {
  const recipientEmail = getRecipientEmail(booking);

  if (!recipientEmail) {
    return { sent: false, reason: "missing_email" };
  }

  const { senderEmail, senderName, replyToEmail, apiKey, apiUrl } = getSenderDetails();

  if (!apiKey || !senderEmail) {
    logger.warn({ bookingId: booking.id, recipientEmail }, "Brevo email confirmation is not configured.");
    return { sent: false, reason: "not_configured" };
  }

  const subject = `Your Tarot By Tanya booking is confirmed`;
  const htmlContent = buildHtmlBody(booking);
  const textContent = buildTextBody(booking);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName,
        },
        to: [{ email: recipientEmail, name: firstNonEmpty(booking.clientName, booking.raw?.name, "Client") }],
        replyTo: replyToEmail ? { email: replyToEmail } : undefined,
        subject,
        htmlContent,
        textContent,
        tags: ["booking-confirmation", "tarot-by-tanya"],
      }),
    });

    const responseJson: any = await response.json().catch(() => null);

    if (!response.ok) {
      const error = extractErrorMessage(responseJson);
      logger.warn({ bookingId: booking.id, recipientEmail, status: response.status, error }, "Brevo rejected booking confirmation email.");
      return {
        sent: false,
        reason: "provider_error",
        error,
      };
    }

    return {
      sent: true,
      messageId: String(responseJson?.messageId || responseJson?.message_id || responseJson?.id || ""),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ bookingId: booking.id, recipientEmail, error: message }, "Failed to send booking confirmation email.");
    return {
      sent: false,
      reason: "request_failed",
      error: message,
    };
  }
}