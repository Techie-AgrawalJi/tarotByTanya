export type TimeBlockKey = "morning" | "noon" | "evening";

export interface BookingSlotRange {
  id?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  bufferEndTime: string;
  durationMinutes: number;
  status?: string;
  paymentReference?: string;
  heldAt?: string;
}

export interface BookingTimeBlock {
  key: TimeBlockKey;
  startMinutes: number;
  endMinutes: number;
  label: string;
}

export interface SlotAvailabilityResult {
  available: boolean;
  nextAvailableSlot: string;
  conflict?: BookingSlotRange | null;
}

export const BUFFER_MINUTES = 5;
export const HELD_TTL_MINUTES = Number(process.env.HELD_TTL_MINUTES || 10);
export const STEP_MINUTES = Number(process.env.STEP_MINUTES || 10);

export const TIME_BLOCKS: Record<TimeBlockKey, BookingTimeBlock> = {
  morning: { key: "morning", startMinutes: 9 * 60, endMinutes: 12 * 60, label: "Morning" },
  noon: { key: "noon", startMinutes: 14 * 60, endMinutes: 17 * 60, label: "Noon" },
  evening: { key: "evening", startMinutes: 19 * 60, endMinutes: 23 * 60, label: "Evening" },
};

export function isValidTimeBlock(value: unknown): value is TimeBlockKey {
  return value === "morning" || value === "noon" || value === "evening";
}

export function minutesToTime24(minutes: number): string {
  const normalized = ((Math.floor(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number | null {
  const value = String(time || "").trim();
  if (!value) return null;

  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const period = ampmMatch[3].toUpperCase();

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return null;

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getBlockRange(blockKey: TimeBlockKey): BookingTimeBlock {
  return TIME_BLOCKS[blockKey];
}

function isExpiredHeldBooking(booking: BookingSlotRange): boolean {
  if ((booking.status || "").toUpperCase() !== "HELD") {
    return false;
  }

  const heldAt = booking.heldAt ? new Date(booking.heldAt).getTime() : 0;
  if (!heldAt) {
    return true;
  }

  return Date.now() - heldAt > HELD_TTL_MINUTES * 60 * 1000;
}

export function isActiveBooking(booking: BookingSlotRange): boolean {
  const status = String(booking.status || "BOOKED").toUpperCase();
  if (status === "CANCELLED" || status === "COMPLETED") {
    return false;
  }

  return true;
}

export function toBookingRange(booking: BookingSlotRange) {
  const startMinutes = parseTimeToMinutes(booking.startTime);
  const endMinutes = parseTimeToMinutes(booking.endTime);
  const bufferEndMinutes = parseTimeToMinutes(booking.bufferEndTime);

  if (startMinutes === null || endMinutes === null || bufferEndMinutes === null) {
    return null;
  }

  return {
    ...booking,
    startMinutes,
    endMinutes,
    bufferEndMinutes,
  };
}

export function getBookedRangesForBlock(bookings: BookingSlotRange[], slotDate: string, blockKey: TimeBlockKey) {
  const block = getBlockRange(blockKey);

  return bookings
    .filter((booking) => String(booking.slotDate || "").trim() === slotDate && isActiveBooking(booking))
    .map(toBookingRange)
    .filter((booking): booking is NonNullable<ReturnType<typeof toBookingRange>> => Boolean(booking))
    .filter((booking) => booking.startMinutes >= block.startMinutes && booking.startMinutes < block.endMinutes)
    .sort((left, right) => left.startMinutes - right.startMinutes);
}

export function overlaps(startMinutes: number, endMinutes: number, booking: { startMinutes: number; bufferEndMinutes: number }) {
  return !(endMinutes <= booking.startMinutes || startMinutes >= booking.bufferEndMinutes);
}

export function calculateSlotAvailability(params: {
  slotDate: string;
  blockKey: TimeBlockKey;
  startTime: string;
  durationMinutes: number;
  bookings: BookingSlotRange[];
}): SlotAvailabilityResult {
  const block = getBlockRange(params.blockKey);
  const startMinutes = parseTimeToMinutes(params.startTime);

  if (startMinutes === null || !params.slotDate || !Number.isFinite(params.durationMinutes) || params.durationMinutes <= 0) {
    return { available: false, nextAvailableSlot: minutesToTime24(block.startMinutes), conflict: null };
  }
  const endMinutes = startMinutes + params.durationMinutes;
  const bufferEndMinutes = endMinutes + BUFFER_MINUTES;

  if (startMinutes < block.startMinutes || bufferEndMinutes > block.endMinutes) {
    return {
      available: false,
      nextAvailableSlot: minutesToTime24(Math.max(startMinutes, block.startMinutes)),
      conflict: null,
    };
  }

  const activeBookings = getBookedRangesForBlock(params.bookings, params.slotDate, params.blockKey);
  const conflict = activeBookings.find((booking) => overlaps(startMinutes, bufferEndMinutes, booking)) || null;

  if (!conflict) {
    return {
      available: true,
      nextAvailableSlot: minutesToTime24(startMinutes),
      conflict: null,
    };
  }

  let candidate = Math.max(conflict.bufferEndMinutes, startMinutes);

  while (candidate + params.durationMinutes + BUFFER_MINUTES <= block.endMinutes) {
    const candidateEnd = candidate + params.durationMinutes + BUFFER_MINUTES;
    const candidateConflict = activeBookings.find((booking) => overlaps(candidate, candidateEnd, booking));

    if (!candidateConflict) {
      return {
        available: false,
        nextAvailableSlot: minutesToTime24(candidate),
        conflict,
      };
    }

    candidate = Math.max(candidate + STEP_MINUTES, candidateConflict.bufferEndMinutes);
  }

  return {
    available: false,
    nextAvailableSlot: "",
    conflict,
  };
}

export function buildBookedRangesResponse(bookings: BookingSlotRange[], slotDate: string, blockKey: TimeBlockKey) {
  return getBookedRangesForBlock(bookings, slotDate, blockKey).map((booking) => ({
    id: booking.id,
    slotDate: booking.slotDate,
    startTime: minutesToTime24(booking.startMinutes),
    endTime: minutesToTime24(booking.endMinutes),
    bufferEndTime: minutesToTime24(booking.bufferEndMinutes),
    durationMinutes: booking.durationMinutes,
    status: booking.status || "BOOKED",
    paymentReference: booking.paymentReference,
    heldAt: booking.heldAt,
  }));
}
