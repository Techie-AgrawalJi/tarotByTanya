import mongoose from "mongoose";
import { readBookings } from "./bookingsStore";
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
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
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

function isConfirmedBooking(booking: BookingLike): boolean {
  const status = String(booking.status || booking.bookingStatus || booking.raw?.status || "").trim().toUpperCase();
  return status === "BOOKED" || status === "COMPLETED";
}

function normalizeMetrics(record: any): BookingMetricsRecord {
  const now = new Date();
  return {
    id: String(record?.id || BOOKING_COUNTER_ID),
    bookingTotal: Number(record?.bookingTotal || 0),
    uniqueClientTotal: Number(record?.uniqueClientTotal || 0),
    createdAt: record?.createdAt ? new Date(record.createdAt) : now,
    updatedAt: record?.updatedAt ? new Date(record.updatedAt) : now,
  };
}

async function getMetricsDocument() {
  const Counter = await getBookingCounterModel();
  const now = new Date();
  const existing = await Counter.findOne({ id: BOOKING_COUNTER_ID }).lean().exec();

  if (existing) {
    return normalizeMetrics(existing);
  }

  const created = await Counter.create({
    id: BOOKING_COUNTER_ID,
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

export async function bootstrapBookingMetrics(): Promise<BookingMetricsRecord> {
  const Counter = await getBookingCounterModel();
  const Marker = await getBookingConfirmationMarkerModel();
  const SeenPhone = await getSeenClientPhoneModel();

  const existing = await Counter.findOne({ id: BOOKING_COUNTER_ID }).lean().exec();
  if (existing) {
    return normalizeMetrics(existing);
  }

  const bookings = await readBookings();
  const completedBookings = bookings.filter(isConfirmedBooking);
  const seenBookingKeys = new Set<string>();
  const seenPhones = new Set<string>();
  const confirmationMarkers: BookingLike[] = [];
  const phoneMarkers: BookingLike[] = [];
  const now = new Date();

  for (const booking of completedBookings) {
    const bookingKey = getBookingKey(booking);
    if (!bookingKey || seenBookingKeys.has(bookingKey)) {
      continue;
    }
    seenBookingKeys.add(bookingKey);
    confirmationMarkers.push({
      id: bookingKey,
      bookingKey,
      bookingId: String(booking.id || bookingKey),
      paymentReference: String(booking.paymentReference || ""),
      clientPhone: getBookingPhone(booking),
      confirmedAt: booking.bookingTime || booking.updatedAt || now,
    });

    const phoneKey = normalizePhoneKey(getBookingPhone(booking));
    if (phoneKey && !seenPhones.has(phoneKey)) {
      seenPhones.add(phoneKey);
      phoneMarkers.push({
        id: phoneKey,
        phoneKey,
        phone: getBookingPhone(booking),
        firstSeenAt: booking.bookingTime || booking.updatedAt || now,
      });
    }
  }

  if (confirmationMarkers.length > 0) {
    await Marker.insertMany(confirmationMarkers, { ordered: false });
  }

  if (phoneMarkers.length > 0) {
    await SeenPhone.insertMany(phoneMarkers, { ordered: false });
  }

  const seeded = await Counter.create({
    id: BOOKING_COUNTER_ID,
    bookingTotal: confirmationMarkers.length,
    uniqueClientTotal: phoneMarkers.length,
    createdAt: now,
    updatedAt: now,
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

  const Counter = await getBookingCounterModel();
  const Marker = await getBookingConfirmationMarkerModel();
  const SeenPhone = await getSeenClientPhoneModel();
  const session = await mongoose.startSession();

  try {
    let nextCounter: BookingMetricsRecord | null = null;

    await session.withTransaction(async () => {
      const existingMarker = await Marker.findOne({ id: bookingKey }).session(session).lean().exec();
      if (existingMarker) {
        nextCounter = await getMetricsDocument();
        return;
      }

      const now = new Date();
      await Marker.updateOne(
        { id: bookingKey },
        {
          $setOnInsert: {
            id: bookingKey,
            bookingKey,
            bookingId: String(booking.id || bookingKey),
            paymentReference: String(booking.paymentReference || booking.paymentId || ""),
            clientPhone: bookingPhone,
            confirmedAt: now,
          },
        },
        { upsert: true, session },
      );

      const phoneWasNew = Boolean(phoneKey) && !(await SeenPhone.findOne({ phoneKey }).session(session).lean().exec());

      if (phoneWasNew && phoneKey) {
        await SeenPhone.updateOne(
          { phoneKey },
          {
            $setOnInsert: {
              id: phoneKey,
              phoneKey,
              phone: bookingPhone,
              firstSeenAt: now,
            },
          },
          { upsert: true, session },
        );
      }

      nextCounter = await Counter.findOneAndUpdate(
        { id: BOOKING_COUNTER_ID },
        {
          $setOnInsert: {
            id: BOOKING_COUNTER_ID,
            bookingTotal: 0,
            uniqueClientTotal: 0,
            createdAt: now,
          },
          $inc: {
            bookingTotal: 1,
            ...(phoneWasNew && phoneKey ? { uniqueClientTotal: 1 } : {}),
          },
          $set: {
            updatedAt: now,
          },
        },
        { returnDocument: "after", upsert: true, session },
      )
        .lean()
        .exec()
        .then((doc) => normalizeMetrics(doc));
    });

    return nextCounter || (await readBookingMetrics());
  } finally {
    session.endSession();
  }
}
