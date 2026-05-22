import { getBookingModel } from "./mongoose";

type BookingRecord = Record<string, any>;

function normalizeBookingRecord(booking: BookingRecord): BookingRecord {
  const slotDate = String(booking.slotDate || booking.raw?.slotTiming?.date || booking.raw?.date || "").trim();
  const clientName = String(booking.clientName || booking.raw?.name || booking.raw?.clientName || booking.name || booking.fullName || "").trim();
  const clientPhone = String(booking.clientPhone || booking.raw?.phone || booking.raw?.clientPhone || booking.raw?.whatsapp || booking.whatsapp || "").trim();

  return {
    ...booking,
    slotDate,
    clientName,
    clientPhone,
  };
}

export async function readBookings() {
  const Booking = await getBookingModel();
  const bookings = await Booking.find({}).sort({ bookingTime: 1, _id: 1 }).lean<BookingRecord>().exec();
  return bookings.map(normalizeBookingRecord);
}

export async function writeBookings(bookings: BookingRecord[]) {
  const Booking = await getBookingModel();

  await Booking.deleteMany({});

  if (bookings.length > 0) {
    await Booking.insertMany(bookings.map(normalizeBookingRecord), { ordered: true });
  }
}
