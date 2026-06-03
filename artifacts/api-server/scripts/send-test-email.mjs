import fs from 'fs';
import path from 'path';

function parseDotEnv(filePath) {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const envPath = path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'), '..', '.env');
// Fallback: look in same folder as script's parent (artifacts/api-server/.env)
const candidate = path.resolve(process.cwd(), 'artifacts', 'api-server', '.env');
const envFile = fs.existsSync(envPath) ? envPath : candidate;
const env = parseDotEnv(envFile);

const apiKey = env.BREVO_API_KEY;
const senderEmail = env.BREVO_SENDER_EMAIL || env.BREVO_FROM_EMAIL;
const senderName = env.BREVO_SENDER_NAME || env.BREVO_FROM_NAME || 'Tarot By Tanya';

if (!apiKey || !senderEmail) {
  console.error('Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in .env');
  process.exit(1);
}

const recipient = process.env.TEST_RECIPIENT_EMAIL || 'jayantkumar28022001@gmail.com';
const subject = 'Test: Tarot By Tanya — Booking confirmation (test)';

// Sample booking details to mimic the full booking template (excluding client email, payment status, payment method, payment reference)
const booking = {
  clientName: 'Test User',
  phone: '+91 98765 43210',
  dob: '1990-01-01',
  birthLocation: 'Mumbai, Maharashtra, India',
  gender: 'Female',
  maritalStatus: 'Single',
  occupation: 'Designer',
  message: 'Looking for guidance on career and relationships.',
  sessionType: 'Tarot Reading',
  durationLabel: '30 Minutes',
  slotTiming: { date: '2026-06-10', timeBlock: 'evening', startTime: '19:30', endTime: '20:00' },
  paymentAmount: '₹699'
};

const rows = [
  ['Client name', booking.clientName],
  ['WhatsApp / Phone', booking.phone],
  ['Date of birth', booking.dob],
  ['Birth place', booking.birthLocation],
  ['Gender', booking.gender],
  ['Marital status', booking.maritalStatus],
  ['Occupation', booking.occupation],
  ['Message / Focus', booking.message],
  ['Session type', booking.sessionType],
  ['Package', booking.durationLabel],
  ['Date', booking.slotTiming.date],
  ['Time', `${booking.slotTiming.startTime} - ${booking.slotTiming.endTime}`],
  ['Slot', `${booking.slotTiming.timeBlock} · ${booking.slotTiming.startTime}`],
  ['Duration', booking.durationLabel],
  ['Payment amount', booking.paymentAmount],
];

const htmlRows = rows.map(([label, value]) => `\n        <tr>\n          <td style="padding:12px 0;color:#9fa8bc;font-size:14px;vertical-align:top;width:40%;">${label}</td>\n          <td style="padding:12px 0;color:#e8ebf5;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>\n        </tr>`).join('');

// Inline footer row (placed inside the booking details table) when guide contact is available
const footerInner = env.GUIDE_WHATSAPP_NUMBER
  ? `
                    <tr>
                      <td style="padding-top:18px;text-align:center;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;border-collapse:collapse;">
                          <tr>
                            <td style="background:#0f1020;border:1px solid rgba(212,180,106,0.12);border-radius:12px;padding:14px 16px;text-align:center;box-sizing:border-box;">
                              <div style="font-weight:800;color:#ffd88a;margin-bottom:6px;font-size:15px;">📲 Connect with ${env.GUIDE_CONTACT_NAME || 'Your guide'}</div>
                              <div style="margin-bottom:8px;color:#cdd6e6;font-size:14px;line-height:1.4;">Send a screenshot of this confirmation to the guide so they can match your booking and start the session.</div>
                              <div style="margin-top:12px;text-align:center;">
                                <a href="https://wa.me/${String(env.GUIDE_WHATSAPP_NUMBER).replace(/[^0-9+]/g,'').replace(/^\+/, '')}" style="display:inline-block;padding:8px 12px;background:#d4b46a;color:#0f1020;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;margin:0 auto;">${String(env.GUIDE_WHATSAPP_NUMBER).replace(/[^0-9+]/g,'')}</a>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
  `
  : '';

let htmlContent = `
  <div style="margin:0;padding:0;background:#f3efe7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3efe7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#0f1020;border:1px solid rgba(212,180,106,0.18);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,16,32,0.18);font-family:Arial,Helvetica,sans-serif;">
            <tr>
              <td style="padding:32px 34px 28px 34px;">
                <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#d4b46a;font-weight:700;">Tarot By Tanya</div>
                <h1 style="margin:14px 0 10px 0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:700;">Your booking is confirmed</h1>
                <p style="margin:0;color:#d7dbea;font-size:15px;line-height:1.7;max-width:560px;">Thank you, ${booking.clientName}. Your session has been secured. Please find your booking summary below.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 32px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:-12px;background:#151730;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;">
                  <tr>
                    <td style="padding-bottom:20px;">
                      <div style="color:#d4b46a;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">Booking summary</div>
                      <div style="margin-top:8px;color:#ffffff;font-size:22px;font-weight:700;">${booking.sessionType}</div>
                      <div style="margin-top:6px;color:#aeb5ca;font-size:14px;line-height:1.6;">${booking.slotTiming.date} · ${booking.slotTiming.startTime}</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${htmlRows}</table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:22px;">
                      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;color:#c8cfdf;font-size:14px;line-height:1.7;">We will use this email for any updates or follow-ups related to your reading.</div>
                    </td>
                  </tr>
                  ${env.GUIDE_WHATSAPP_NUMBER ? footerInner : ''}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

// (Footer is now inlined into the template via `footerInner`)

const textContent = [
  'Tarot By Tanya',
  'Your booking is confirmed.',
  '',
  ...rows.map(([label, value]) => `${label}: ${value}`),
  '',
  'We will use this email for any updates or follow-ups related to your reading.',
].join('\n');

const body = {
  sender: { email: senderEmail, name: senderName },
  to: [{ email: recipient, name: 'Recipient' }],
  subject,
  htmlContent,
  textContent,
};

const fetch = globalThis.fetch || (await import('node-fetch').then(m => m.default));

const apiUrl = env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';

console.log(`Sending test email to ${recipient} via ${apiUrl} using sender ${senderEmail}`);

const res = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  },
  body: JSON.stringify(body),
});

const json = await res.text();
console.log('Response status:', res.status);
console.log(json);

if (!res.ok) process.exit(2);
