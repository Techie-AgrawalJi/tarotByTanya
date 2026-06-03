import { getBookingModel } from "./mongoose";
import fs from "fs/promises";
import path from "path";

type BookingRecord = Record<string, any>;

function normalizeBookingRecord(booking: BookingRecord): BookingRecord {
  const slotDate = String(booking.slotDate || booking.raw?.slotTiming?.date || booking.raw?.date || "").trim();
  const clientName = String(booking.clientName || booking.raw?.name || booking.raw?.clientName || booking.name || booking.fullName || "").trim();
  const clientPhone = String(booking.clientPhone || booking.raw?.phone || booking.raw?.clientPhone || booking.raw?.whatsapp || booking.whatsapp || "").trim();
  const clientEmail = String(booking.clientEmail || booking.raw?.email || booking.raw?.clientEmail || booking.email || "").trim();

  // Ensure a stable `id` field for client code (fall back to Mongo's _id)
  const id = String(booking.id || booking._id || booking._id?.toString() || "");

  // Ensure bookingTime exists for admin display
  const bookingTime = String(booking.bookingTime || booking.heldAt || booking.raw?.bookingTime || booking.raw?.createdAt || booking.raw?.created_at || "").trim();

  return {
    ...booking,
    id,
    slotDate,
    clientName,
    clientPhone,
    clientEmail,
    bookingTime,
  };
}

export async function readBookings() {
  // If no MongoDB URI configured, fall back to file-based storage for local/dev runs
  if (!process.env.MONGODB_URI) {
    try {
      const file = path.join(process.cwd(), "artifacts", "api-server", "data", "bookings.json");
      const raw = await fs.readFile(file, "utf8").catch(() => "[]");
      const parsed = JSON.parse(raw || "[]");
      return (Array.isArray(parsed) ? parsed : []).map(normalizeBookingRecord);
    } catch (err) {
      return [];
    }
  }

  const Booking = await getBookingModel();
  const bookings = await Booking.find({}).sort({ bookingTime: 1, _id: 1 }).lean<BookingRecord>().exec();
  return bookings.map(normalizeBookingRecord);
}

export async function writeBookings(bookings: BookingRecord[]): Promise<void> {
  if (!process.env.MONGODB_URI) {
    try {
      const fileDir = path.join(process.cwd(), "artifacts", "api-server", "data");
      await fs.mkdir(fileDir, { recursive: true }).catch(() => {});
      const file = path.join(fileDir, "bookings.json");
      const normalized = (bookings || []).map(normalizeBookingRecord);
      await fs.writeFile(file, JSON.stringify(normalized, null, 2), "utf8");
      return;
    } catch (err) {
      // ignore write errors for fallback
      return;
    }
  }

  const Booking = await getBookingModel();
  if (!bookings || bookings.length === 0) {
    await Booking.deleteMany({});
    return;
  }

  const normalizedBookings = bookings.map((b) => normalizeBookingRecord(b));
  const ids = normalizedBookings.map((b) => b.id).filter(Boolean);

  await Booking.bulkWrite(
    normalizedBookings.map((b) => ({
      updateOne: {
        filter: { id: b.id },
        update: { $set: b },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  // remove any stale bookings not present in the provided list
  if (ids.length > 0) {
    await Booking.deleteMany({ id: { $nin: ids } });
  }
}

export async function insertBooking(booking: BookingRecord) {
  const normalized = normalizeBookingRecord({
    ...booking,
    id: String(booking.id || `booking_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`),
  });

  if (!process.env.MONGODB_URI) {
    const file = path.join(process.cwd(), "artifacts", "api-server", "data", "bookings.json");
    const raw = await fs.readFile(file, "utf8").catch(() => "[]");
    const parsed = Array.isArray(JSON.parse(raw || "[]")) ? JSON.parse(raw || "[]") : [];
    parsed.push(normalized);
    await fs.mkdir(path.dirname(file), { recursive: true }).catch(() => {});
    await fs.writeFile(file, JSON.stringify(parsed, null, 2), "utf8");
    return normalized;
  }

  const Booking = await getBookingModel();
  await Booking.updateOne({ id: normalized.id }, { $set: normalized }, { upsert: true }).exec();
  return normalized;
}

export async function updateBookingById(id: string, update: Partial<BookingRecord>) {
  if (!process.env.MONGODB_URI) {
    const file = path.join(process.cwd(), "artifacts", "api-server", "data", "bookings.json");
    const raw = await fs.readFile(file, "utf8").catch(() => "[]");
    const parsed = Array.isArray(JSON.parse(raw || "[]")) ? JSON.parse(raw || "[]") : [];
    const idx = parsed.findIndex((b: any) => String(b.id) === String(id));
    if (idx === -1) return null;
    parsed[idx] = { ...parsed[idx], ...update };
    await fs.writeFile(file, JSON.stringify(parsed, null, 2), "utf8");
    return normalizeBookingRecord(parsed[idx]);
  }

  const Booking = await getBookingModel();
  await Booking.updateOne({ id }, { $set: update }).exec();
  const booking = await Booking.findOne({ id }).lean<BookingRecord>().exec();
  return booking ? normalizeBookingRecord(booking) : null;
}

export async function deleteBookingById(id: string) {
  if (!process.env.MONGODB_URI) {
    const file = path.join(process.cwd(), "artifacts", "api-server", "data", "bookings.json");
    const raw = await fs.readFile(file, "utf8").catch(() => "[]");
    const parsed = Array.isArray(JSON.parse(raw || "[]")) ? JSON.parse(raw || "[]") : [];
    const filtered = parsed.filter((b: any) => String(b.id) !== String(id));
    await fs.writeFile(file, JSON.stringify(filtered, null, 2), "utf8");
    return;
  }

  const Booking = await getBookingModel();
  await Booking.deleteOne({ id }).exec();
}

export async function clearBookings() {
  if (!process.env.MONGODB_URI) {
    const file = path.join(process.cwd(), "artifacts", "api-server", "data", "bookings.json");
    await fs.writeFile(file, "[]", "utf8");
    return;
  }

  const Booking = await getBookingModel();
  await Booking.deleteMany({});
}
