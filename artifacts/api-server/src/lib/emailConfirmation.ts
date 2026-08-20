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

type EmailConfirmationOptions = {
  isGuideEmail?: boolean;
  recipientEmail?: string;
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

function getGuideRecipientEmail(_booking: BookingLike): string {
  return trimValue(process.env.GUIDE_EMAIL || "").toLowerCase();
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

  const clientPhone = firstNonEmpty(booking.phone, booking.clientPhone, raw.phone, raw.clientPhone);
  const clientDob = firstNonEmpty(booking.dob, raw.dob, booking.raw?.dob);
  const birthPlace = firstNonEmpty(booking.birthLocation, raw.birthLocation, raw.placeOfBirth, raw.cityOfBirth);
  const gender = firstNonEmpty(booking.gender, raw.gender);
  const maritalStatus = firstNonEmpty(booking.maritalStatus, raw.maritalStatus);
  const occupation = firstNonEmpty(booking.occupation, raw.occupation);
  const message = firstNonEmpty(booking.message, raw.message, booking.payload?.message);
  const packageLabel = firstNonEmpty(booking.durationLabel, booking.duration, raw.durationLabel, raw.duration);
 
  return [
    { label: "Name", value: firstNonEmpty(booking.clientName, raw.name, raw.clientName) },
    { label: "WhatsApp No.", value: clientPhone },
    { label: "DOB", value: clientDob },
    { label: "Birth place", value: birthPlace },
    { label: "Gender", value: gender },
    { label: "Marital status", value: maritalStatus },
    { label: "Occupation", value: occupation },
    { label: "Message / Focus", value: message },
    { label: "Session type", value: sessionType },
    { label: "Package", value: packageLabel },
    { label: "Date", value: appointmentDate },
    { label: "Time", value: timeRange },
    { label: "Duration", value: firstNonEmpty(booking.durationLabel, booking.durationMinutes ? `${booking.durationMinutes} minutes` : raw.duration, raw.durationMinutes ? `${raw.durationMinutes} minutes` : "") },
    { label: "Payment amount", value: paymentAmount },
  ].filter((item) => Boolean(item.value));
}

function buildHtmlBody(booking: BookingLike, options: EmailConfirmationOptions = {}): string {
  const raw = booking.raw || {};
  const isGuideEmail = Boolean(options.isGuideEmail);
  const guideContact = firstNonEmpty(
    booking.guidePhone,
    booking.raw?.guidePhone,
    booking.raw?.guide?.phone,
    process.env.GUIDE_WHATSAPP_NUMBER,
  );
  const clientContact = firstNonEmpty(
    booking.clientPhone,
    booking.phone,
    booking.raw?.phone,
    booking.raw?.clientPhone,
    booking.raw?.whatsapp,
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

  const emailTitle = isGuideEmail ? "New booking received" : "Your booking is confirmed";
  const emailSubtitle = isGuideEmail
    ? `A new booking has been confirmed. Connect with the client using the contact information below.`
    : `Thank you, ${clientName}. Your session has been secured. Please find your booking details below.`;
  const footerMessage = isGuideEmail
    ? "Please contact the client using the number above to confirm their session."
    : "We will use this email for any updates or follow-ups related to your reading.";
  const contactPhone = isGuideEmail ? clientContact : guideContact;
  const contactHeading = isGuideEmail ? "📲 Contact the client" : `📲 Connect with ${guideName}`;
  const contactDescription = isGuideEmail
    ? "Reach out to the client on WhatsApp so you can confirm their booking and start the session on time."
    : "Reach out to the Guide on WhatsApp so they can confirm your booking and start the session on time.";

  return `
    <style>
      @media (max-width: 600px) {
        .details-box-container {
          padding: 0 16px 24px 16px !important;
        }
        .contact-box-container {
          padding: 0 16px 24px 16px !important;
        }
        .header-container {
          padding: 24px 16px 20px 16px !important;
        }
      }
    </style>
    <div style="margin:0;padding:0;background:#f3efe7;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${isGuideEmail ? `A new booking has been confirmed.` : `Your tarot session is confirmed for ${appointmentDate || timeRange}.`}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3efe7;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#0f1020;border:1px solid rgba(212,180,106,0.18);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,16,32,0.18);font-family:Arial,Helvetica,sans-serif;">
              <tr>
                <td style="padding:0;background:linear-gradient(135deg,#0f1020 0%,#1f1a31 55%,#3b2f17 100%);">
                  <div class="header-container" style="padding:32px 34px 28px 34px;">
                    <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#d4b46a;font-weight:700;">${senderName}</div>
                    <h1 style="margin:14px 0 10px 0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:700;">${emailTitle}</h1>
                    <p style="margin:0;color:#d7dbea;font-size:15px;line-height:1.7;max-width:560px;">${emailSubtitle}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="details-box-container" style="padding:0 34px 24px 34px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#151730;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;">
                    <tr>
                      <td style="padding-bottom:8px;">
                        <div style="color:#d4b46a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Booking details</div>
                        <div style="margin-top:6px;color:#ffffff;font-size:20px;font-weight:700;">${sessionType}${appointmentDate ? ` · ${appointmentDate}` : ""}</div>
                        <div style="margin-top:6px;color:#aeb5ca;font-size:13px;line-height:1.5;">${appointmentDate && timeRange ? `${timeRange}` : timeRange || ""}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:8px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;">
                          ${rows}
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:18px;color:#c8cfdf;font-size:14px;line-height:1.6;">
                        ${footerMessage}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${contactPhone ? `
              <tr>
                <td class="contact-box-container" style="padding:0 34px 32px 34px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1020;border:1px solid rgba(212,180,106,0.12);border-radius:12px;padding:18px 20px;box-sizing:border-box;">
                    <tr>
                      <td style="text-align:center;">
                        <div style="font-weight:800;color:#ffd88a;margin-bottom:6px;font-size:15px;">${contactHeading}</div>
                        <div style="margin-bottom:12px;color:#cdd6e6;font-size:14px;line-height:1.5;">${contactDescription}</div>
                        <div style="margin-top:12px;text-align:center;">
                          <a href="https://wa.me/${String(contactPhone).replace(/[^0-9]/g,"")}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;background:#25D366;color:#0f1020;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;margin:0 auto;">
                            <span style="vertical-align:middle;color:#0f1020;">${contactPhone}</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ""}
            </table>
          </td>
        </tr>
      </table>
      </div>`;
}

function buildTextBody(booking: BookingLike, options: EmailConfirmationOptions = {}): string {
  const isGuideEmail = Boolean(options.isGuideEmail);
  const details = buildBookingDetails(booking);
  const guideContact = firstNonEmpty(
    booking.guidePhone,
    booking.raw?.guidePhone,
    booking.raw?.guide?.phone,
    process.env.GUIDE_WHATSAPP_NUMBER,
  );
  const clientContact = firstNonEmpty(
    booking.clientPhone,
    booking.phone,
    booking.raw?.phone,
    booking.raw?.clientPhone,
    booking.raw?.whatsapp,
  );
  const guideName = firstNonEmpty(booking.raw?.guide?.name, process.env.GUIDE_CONTACT_NAME || "Your guide");

  const lines = [
    "Tarot By Tanya",
    isGuideEmail ? "New booking received." : "Your booking is confirmed.",
    "",
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    "",
  ];

  if (isGuideEmail && clientContact) {
    lines.push(`Client contact: ${clientContact}`);
    lines.push("Please contact the client on WhatsApp to confirm the session details.");
  }

  if (!isGuideEmail && guideContact) {
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

export async function sendBookingEmailConfirmation(
  booking: BookingLike,
  options: EmailConfirmationOptions = {},
): Promise<EmailConfirmationResult> {
  const recipientEmail = options.recipientEmail || (options.isGuideEmail ? getGuideRecipientEmail(booking) : getRecipientEmail(booking));

  if (!recipientEmail) {
    return { sent: false, reason: "missing_email" };
  }

  const { senderEmail, senderName, replyToEmail, apiKey, apiUrl } = getSenderDetails();

  if (!apiKey || !senderEmail) {
    logger.warn({ bookingId: booking.id, recipientEmail }, "Brevo email confirmation is not configured.");
    return { sent: false, reason: "not_configured" };
  }

  const clientName = firstNonEmpty(booking.clientName, booking.raw?.name, booking.raw?.clientName, "Client");
  const subject = options.isGuideEmail
    ? `New Tarot By Tanya booking received from ${clientName}`
    : `Your Tarot By Tanya booking is confirmed`;
  const htmlContent = buildHtmlBody(booking, options);
  const textContent = buildTextBody(booking, options);

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