import fs from "fs/promises";
import path from "path";
import {
  getBookingConfirmationMarkerModel,
  getBookingCounterModel,
  getSeenClientPhoneModel,
} from "./mongoose";

const BOOKING_COUNTER_ID = "booking-metrics";

export type BookingMetricsRecord = {
  id: string;
  bookingTotal: number;
  uniqueClientTotal: number;
  createdAt: Date;
  updatedAt: Date;
};

type BookingLike = Record<string, any>;

function normalizePhoneKey(value: unknown): string {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.trim();
}

function getBookingKey(booking: BookingLike): string {
  return String(
    booking.paymentReference ||
      booking.paymentId ||
      booking.gatewayPaymentId ||
      booking.id ||
      booking.raw?.paymentReference ||
      booking.raw?.paymentId ||
      booking.raw?.gatewayPaymentId ||
      "",
  ).trim();
}

function getBookingPhone(booking: BookingLike): string {
  return String(
    booking.clientPhone ||
      booking.phone ||
      booking.whatsapp ||
      booking.raw?.phone ||
      booking.raw?.clientPhone ||
      booking.raw?.whatsapp ||
      "",
  ).trim();
}

function normalizeMetrics(record: any): BookingMetricsRecord {
  const now = new Date();
  return {
    id: String(record?._id || record?.id || BOOKING_COUNTER_ID),
    bookingTotal: Number(record?.bookingTotal || 0),
    uniqueClientTotal: Number(record?.uniqueClientTotal || 0),
    createdAt: record?.createdAt ? new Date(record.createdAt) : now,
    updatedAt: record?.updatedAt ? new Date(record.updatedAt) : now,
  };
}

async function getMetricsDocument() {
  const now = new Date();

  if (!process.env.MONGODB_URI) {
    try {
      const file = path.join(process.cwd(), "artifacts", "api-server", "data", "metrics.json");
      const raw = await fs.readFile(file, "utf8").catch(() => "null");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed._id === BOOKING_COUNTER_ID) {
        return normalizeMetrics(parsed);
      }
      const created = { _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now };
      await fs.mkdir(path.dirname(file), { recursive: true }).catch(() => {});
      await fs.writeFile(file, JSON.stringify(created, null, 2), "utf8");
      return normalizeMetrics(created);
    } catch (err) {
      return normalizeMetrics({ _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now });
    }
  }

  const Counter = await getBookingCounterModel();
  const existing = await Counter.findOne({ _id: BOOKING_COUNTER_ID }).lean().exec();

  if (existing) {
    return normalizeMetrics(existing);
  }

  const created = await Counter.create({
    _id: BOOKING_COUNTER_ID,
    bookingTotal: 0,
    uniqueClientTotal: 0,
    createdAt: now,
    updatedAt: now,
  });

  return normalizeMetrics(created);
}

export async function readBookingMetrics(): Promise<BookingMetricsRecord> {
  return getMetricsDocument();
}

export async function resetBookingMetrics(): Promise<BookingMetricsRecord> {
  const now = new Date();

  if (!process.env.MONGODB_URI) {
    try {
      const dataDir = path.join(process.cwd(), "artifacts", "api-server", "data");
      await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
      const metricsFile = path.join(dataDir, "metrics.json");
      const markersFile = path.join(dataDir, "markers.json");
      const phonesFile = path.join(dataDir, "seenPhones.json");
      const reset = { _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now };
      await fs.writeFile(metricsFile, JSON.stringify(reset, null, 2), "utf8");
      await fs.writeFile(markersFile, JSON.stringify([], null, 2), "utf8");
      await fs.writeFile(phonesFile, JSON.stringify([], null, 2), "utf8");
      return normalizeMetrics(reset);
    } catch (err) {
      return normalizeMetrics({ _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now });
    }
  }

  const Counter = await getBookingCounterModel();
  const Marker = await getBookingConfirmationMarkerModel();
  const SeenPhone = await getSeenClientPhoneModel();

  await Promise.all([
    Counter.deleteMany({}),
    Marker.deleteMany({}),
    SeenPhone.deleteMany({}),
  ]);

  const reset = await Counter.create({
    _id: BOOKING_COUNTER_ID,
    bookingTotal: 0,
    uniqueClientTotal: 0,
    createdAt: now,
    updatedAt: now,
  });

  return normalizeMetrics(reset);
}

export async function bootstrapBookingMetrics(): Promise<BookingMetricsRecord> {
  const now = new Date();

  if (!process.env.MONGODB_URI) {
    try {
      const file = path.join(process.cwd(), "artifacts", "api-server", "data", "metrics.json");
      const raw = await fs.readFile(file, "utf8").catch(() => "null");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed._id === BOOKING_COUNTER_ID) {
        return normalizeMetrics(parsed);
      }
      const seeded = { _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now };
      await fs.mkdir(path.dirname(file), { recursive: true }).catch(() => {});
      await fs.writeFile(file, JSON.stringify(seeded, null, 2), "utf8");
      return normalizeMetrics(seeded);
    } catch (err) {
      return normalizeMetrics({ _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0, createdAt: now, updatedAt: now });
    }
  }

  const Counter = await getBookingCounterModel();

  const existing = await Counter.findOne({ _id: BOOKING_COUNTER_ID }).lean().exec();
  if (existing) {
    return normalizeMetrics(existing);
  }

  const seededNow = new Date();
  const seeded = await Counter.create({
    _id: BOOKING_COUNTER_ID,
    bookingTotal: 0,
    uniqueClientTotal: 0,
    createdAt: seededNow,
    updatedAt: seededNow,
  });

  return normalizeMetrics(seeded);
}

// Booking confirmation logic is intentionally isolated here.
// A booking counter increments only once per confirmed booking key.
// A client counter increments only once per unique normalized phone number.
export async function recordConfirmedBooking(booking: BookingLike): Promise<BookingMetricsRecord> {
  const bookingKey = getBookingKey(booking);
  const bookingPhone = getBookingPhone(booking);
  const phoneKey = normalizePhoneKey(bookingPhone);

  if (!bookingKey) {
    return readBookingMetrics();
  }

  if (!process.env.MONGODB_URI) {
    try {
      const dataDir = path.join(process.cwd(), "artifacts", "api-server", "data");
      await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
      const metricsFile = path.join(dataDir, "metrics.json");
      const markersFile = path.join(dataDir, "markers.json");
      const phonesFile = path.join(dataDir, "seenPhones.json");

      const rawMetrics = await fs.readFile(metricsFile, "utf8").catch(() => "null");
      const metrics = rawMetrics ? JSON.parse(rawMetrics) : { _id: BOOKING_COUNTER_ID, bookingTotal: 0, uniqueClientTotal: 0 };

      const rawMarkers = await fs.readFile(markersFile, "utf8").catch(() => "[]");
      const markers = Array.isArray(JSON.parse(rawMarkers || "[]")) ? JSON.parse(rawMarkers || "[]") : [];

      const rawPhones = await fs.readFile(phonesFile, "utf8").catch(() => "[]");
      const phones = Array.isArray(JSON.parse(rawPhones || "[]")) ? JSON.parse(rawPhones || "[]") : [];

      // if already recorded, return current metrics
      if (markers.find((m: any) => m._id === bookingKey || m.bookingKey === bookingKey)) {
        return normalizeMetrics(metrics);
      }

      const now = new Date();
      markers.push({ _id: bookingKey, bookingKey, bookingId: String(booking.id || bookingKey), paymentReference: String(booking.paymentReference || booking.paymentId || ""), clientPhone: bookingPhone, confirmedAt: now });

      const phoneKeyExists = phones.find((p: any) => p._id === phoneKey || p.phoneKey === phoneKey);
      if (!phoneKeyExists && phoneKey) {
        phones.push({ _id: phoneKey, phoneKey, phone: bookingPhone, firstSeenAt: now });
        metrics.uniqueClientTotal = Number(metrics.uniqueClientTotal || 0) + 1;
      }

      metrics.bookingTotal = Number(metrics.bookingTotal || 0) + 1;
      metrics.updatedAt = now;
      metrics.createdAt = metrics.createdAt || now;

      await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2), "utf8");
      await fs.writeFile(markersFile, JSON.stringify(markers, null, 2), "utf8");
      await fs.writeFile(phonesFile, JSON.stringify(phones, null, 2), "utf8");

      return normalizeMetrics(metrics);
    } catch (err) {
      return readBookingMetrics();
    }
  }

  const Counter = await getBookingCounterModel();
  const Marker = await getBookingConfirmationMarkerModel();
  const SeenPhone = await getSeenClientPhoneModel();

  const now = new Date();
  try {
    await Marker.create({
      _id: bookingKey,
      bookingKey,
      bookingId: String(booking.id || bookingKey),
      paymentReference: String(booking.paymentReference || booking.paymentId || ""),
      clientPhone: bookingPhone,
      confirmedAt: now,
    });
  } catch (error: any) {
    if (error?.code === 11000) return readBookingMetrics();
    throw error;
  }

  let phoneWasNew = false;
  if (phoneKey) {
    try {
      await SeenPhone.create({
        _id: phoneKey,
        phoneKey,
        phone: bookingPhone,
        firstSeenAt: now,
      });
      phoneWasNew = true;
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
  }

  return Counter.findOneAndUpdate(
    { _id: BOOKING_COUNTER_ID },
    {
      $inc: {
        bookingTotal: 1,
        ...(phoneWasNew ? { uniqueClientTotal: 1 } : {}),
      },
      $set: { updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { returnDocument: "after", upsert: true },
  )
    .lean()
    .exec()
    .then((doc) => normalizeMetrics(doc));
}
