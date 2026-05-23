export type TimeBlockKey = "morning" | "noon" | "evening";

export interface BookingRange {
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

export interface AvailabilityCell {
  time: string;
  displayTime: string;
  status: "available" | "booked" | "buffer" | "unavailable";
  nextAvailableSlot: string;
}

export const TIME_BLOCKS: Record<TimeBlockKey, { startMinutes: number; endMinutes: number; label: string }> = {
  morning: { startMinutes: 9 * 60, endMinutes: 12 * 60, label: "Morning" },
  noon: { startMinutes: 14 * 60, endMinutes: 17 * 60, label: "Noon" },
  evening: { startMinutes: 19 * 60, endMinutes: 23 * 60, label: "Evening" },
};

const BUFFER_MINUTES = 5;
const STEP_MINUTES = 5;

export function getApiBaseUrl(): string {
  const configuredBase = String((import.meta as any).env?.VITE_API_BASE_URL ?? (import.meta as any).env?.VITE_API_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (configuredBase) {
    if (typeof window === "undefined") {
      return configuredBase;
    }

    const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
    const isLocalHostname = (hostname: string): boolean => localHostnames.has(hostname) || hostname.endsWith(".localhost");

    try {
      const url = new URL(configuredBase, "http://localhost");
      if (isLocalHostname(url.hostname) && !isLocalHostname(window.location.hostname)) {
        return window.location.origin.replace(/\/+$/, "");
      }
    } catch {
      if (/localhost|127\.0\.0\.1|::1/i.test(configuredBase) && !isLocalHostname(window.location.hostname)) {
        return window.location.origin.replace(/\/+$/, "");
      }
    }

    return configuredBase;
  }

  if (typeof window !== "undefined") {
    const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localHostnames.has(window.location.hostname) || window.location.hostname.endsWith(".localhost")) {
      return "http://localhost:5000";
    }

    return window.location.origin.replace(/\/+$/, "");
  }

  return "http://localhost:5000";
}

export function minutesToTime24(minutes: number): string {
  const normalized = ((Math.floor(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function minutesToDisplayTime(minutes: number): string {
  const normalized = ((Math.floor(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${mins.toString().padStart(2, "0")} ${period}`;
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

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isWithinBlock(minutes: number, blockKey: TimeBlockKey): boolean {
  const block = TIME_BLOCKS[blockKey];
  return minutes >= block.startMinutes && minutes < block.endMinutes;
}

function overlaps(startMinutes: number, endMinutes: number, booking: { startMinutes: number; bufferEndMinutes: number }) {
  return !(endMinutes <= booking.startMinutes || startMinutes >= booking.bufferEndMinutes);
}

function parseBookingRange(booking: BookingRange) {
  const startMinutes = parseTimeToMinutes(booking.startTime);
  const endMinutes = parseTimeToMinutes(booking.endTime);
  const bufferEndMinutes = parseTimeToMinutes(booking.bufferEndTime);

  if (startMinutes === null || endMinutes === null || bufferEndMinutes === null) {
    return null;
  }

  return { ...booking, startMinutes, endMinutes, bufferEndMinutes };
}

export function getActiveBookingsForBlock(bookings: BookingRange[], slotDate: string, blockKey: TimeBlockKey) {
  return bookings
    .filter((booking) => String(booking.slotDate || "").trim() === slotDate)
    .map(parseBookingRange)
    .filter((booking): booking is NonNullable<ReturnType<typeof parseBookingRange>> => Boolean(booking))
    .filter((booking) => isWithinBlock(booking.startMinutes, blockKey))
    .sort((left, right) => left.startMinutes - right.startMinutes);
}

export function buildAvailabilityGrid(params: {
  slotDate: string;
  blockKey: TimeBlockKey;
  durationMinutes: number;
  bookings: BookingRange[];
}): AvailabilityCell[] {
  const block = TIME_BLOCKS[params.blockKey];
  const activeBookings = getActiveBookingsForBlock(params.bookings, params.slotDate, params.blockKey);
  const cells: AvailabilityCell[] = [];

  for (let minutes = block.startMinutes; minutes <= block.endMinutes - params.durationMinutes; minutes += STEP_MINUTES) {
    const sessionEnd = minutes + params.durationMinutes;
    const bufferEnd = sessionEnd + BUFFER_MINUTES;
    const conflictingBooking = activeBookings.find((booking) => overlaps(minutes, bufferEnd, booking));

    let status: AvailabilityCell["status"] = "available";
    if (conflictingBooking) {
      const isInSession = minutes >= conflictingBooking.startMinutes && minutes < conflictingBooking.endMinutes;
      const isInBuffer = minutes >= conflictingBooking.endMinutes && minutes < conflictingBooking.bufferEndMinutes;
      status = isInSession ? "booked" : isInBuffer ? "buffer" : "unavailable";
    }

    cells.push({
      time: minutesToTime24(minutes),
      displayTime: minutesToDisplayTime(minutes),
      status,
      nextAvailableSlot: getNextAvailableSlot(minutes, params.durationMinutes, params.blockKey, activeBookings),
    });
  }

  return cells;
}

export function getNextAvailableSlot(
  startMinutes: number,
  durationMinutes: number,
  blockKey: TimeBlockKey,
  bookings: Array<{ startMinutes: number; endMinutes: number; bufferEndMinutes: number }>,
): string {
  const block = TIME_BLOCKS[blockKey];
  for (let candidate = Math.max(startMinutes, block.startMinutes); candidate <= block.endMinutes - durationMinutes - BUFFER_MINUTES; candidate += STEP_MINUTES) {
    const end = candidate + durationMinutes + BUFFER_MINUTES;
    const conflict = bookings.find((booking) => overlaps(candidate, end, booking));
    if (!conflict) {
      return minutesToTime24(candidate);
    }

    candidate = Math.max(candidate, conflict.bufferEndMinutes - STEP_MINUTES);
  }

  return "";
}

export function getBlockSummaryLabel(blockKey: TimeBlockKey): string {
  const block = TIME_BLOCKS[blockKey];
  return `${minutesToDisplayTime(block.startMinutes)} - ${minutesToDisplayTime(block.endMinutes)}`;
}
