/**
 * Slot Management System for Tarot Bookings
 * Handles availability, buffer times, and real-time queue management
 */

export type SlotStatus = "OPEN" | "FILLING" | "FULL" | "BLOCKED" | "UPCOMING" | "COMPLETED";

export interface TimeBlock {
  id: string;
  startTime: string; // "09:00"
  endTime: string;   // "12:00"
  label: string;     // "MORNING BLOCK"
  status: SlotStatus;
}

export interface BookedSession {
  id: string;
  clientName: string;
  clientPhone: string;
  startTime: string; // "10:00 AM"
  endTime: string;   // "11:00 AM"
  bufferEndTime: string; // "11:10 AM" (10 min after endTime)
  durationMinutes: number;
  sessionType: "tarot" | "spell casting & healer" | "manifestation rituals" | "face reading & name";
  status: "HELD" | "BOOKED" | "CANCELLED" | "COMPLETED";
  bookingTime?: string; // ISO timestamp when booked
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus?: "PENDING" | "PAID" | "FAILED";
  paymentReference?: string;
  // Optional full name field for clarity and server compatibility
  fullName?: string;
  // Optional slot date (YYYY-MM-DD) when date is stored separately from startTime
  slotDate?: string;
  // If admin cuts the reading short, mark this and record actual end time
  cutThrough?: boolean;
  actualEndTime?: string; // ISO timestamp when the reading was cut/completed
}

export interface SlotOption {
  time: string; // "10:00 AM"
  isAvailable: boolean;
  nextAvailableBuffer?: string; // "10:10 AM"
}

// Working hours for Tarot sessions
const WORKING_HOURS = {
  MORNING: { start: 9, end: 12, label: "MORNING BLOCK" },
  AFTERNOON: { start: 14, end: 17, label: "AFTERNOON BLOCK" },
  EVENING: { start: 19, end: 23, label: "EVENING BLOCK" },
};

const BUFFER_MINUTES = 10;
const SLOT_GRANULARITY = 15; // 15-minute increments for checking start times (supports all durations: 15, 20, 30, 45, 60 min)
const MIN_SESSION_MINUTES = 15;

/**
 * Convert minutes to HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
}

/**
 * Convert time string "10:00 AM" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Check if a slot (start time) can fit a session of given duration
 * Returns { canFit, endTime, bufferEndTime, nextAvailableTime }
 */
export function canFitSession(
  startTimeStr: string,
  durationMinutes: number,
  bookings: BookedSession[],
  dateString: string
): {
  canFit: boolean;
  endTime?: string;
  bufferEndTime?: string;
  nextAvailableTime?: string;
} {
  const startMinutes = timeToMinutes(startTimeStr);
  const endMinutes = startMinutes + durationMinutes;
  const bufferEndMinutes = endMinutes + BUFFER_MINUTES;

  // Check if within working hours
  let withinHours = false;
  for (const block of Object.values(WORKING_HOURS)) {
    if (startMinutes >= block.start * 60 && bufferEndMinutes <= block.end * 60) {
      withinHours = true;
      break;
    }
  }

  if (!withinHours) {
    return { canFit: false, nextAvailableTime: minutesToTime(9 * 60) };
  }

  // Check conflicts with existing bookings
  for (const booking of bookings) {
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") continue;
    
    const bookingStart = timeToMinutes(booking.startTime.replace(" ", " "));
    const bookingBuffer = timeToMinutes(booking.bufferEndTime.replace(" ", " "));

    // Check overlap
    if (!(bufferEndMinutes <= bookingStart || startMinutes >= bookingBuffer)) {
      return {
        canFit: false,
        nextAvailableTime: minutesToTime(bookingBuffer),
      };
    }
  }

  return {
    canFit: true,
    endTime: minutesToTime(endMinutes),
    bufferEndTime: minutesToTime(bufferEndMinutes),
  };
}

/**
 * Get all available slot options for a given date and duration
 */
export function getAvailableSlots(
  dateString: string,
  durationMinutes: number,
  bookings: BookedSession[]
): SlotOption[] {
  const slots: SlotOption[] = [];
  
  // Check each block
  for (const block of Object.values(WORKING_HOURS)) {
    const blockStart = block.start * 60;
    const blockEnd = block.end * 60;

    // Generate slots at granularity intervals
    for (let minutes = blockStart; minutes <= blockEnd - durationMinutes - BUFFER_MINUTES; minutes += SLOT_GRANULARITY) {
      const timeStr = minutesToTime(minutes);
      const result = canFitSession(timeStr, durationMinutes, bookings, dateString);

      slots.push({
        time: timeStr,
        isAvailable: result.canFit,
        nextAvailableBuffer: result.bufferEndTime,
      });
    }
  }

  return slots;
}

/**
 * Get session duration in minutes from service type
 */
export function getSessionDurationFromService(service: string): number {
  const durationMap: Record<string, number> = {
    "Chat Session - 20 Minutes": 20,
    "Chat Session - 30 Minutes": 30,
    "Chat Session - 60 Minutes": 60,
    "Video Call - 30 Minutes": 30,
    "Video Call - 1 Hour": 60,
    "Call - 15 Minutes": 15,
    "Call - 20 Minutes": 20,
    "Call - 30 Minutes": 30,
    "Call - 45 Minutes": 45,
    "Call - 1 Hour": 60,
  };
  return durationMap[service] || 30;
}

/**
 * Get time blocks for a day with their status
 */
export function getTimeBlocksForDay(dateString: string, bookings: BookedSession[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const now = new Date();
  const isToday = dateString === now.toISOString().split("T")[0];
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  for (const [key, block] of Object.entries(WORKING_HOURS)) {
    const blockStart = block.start * 60;
    const blockEnd = block.end * 60;

    let status: SlotStatus = "OPEN";

    // Check if block has passed
    if (isToday && currentMinutes > blockEnd) {
      status = "COMPLETED";
    } else if (isToday && currentMinutes < blockStart) {
      status = "UPCOMING";
    } else {
      // Calculate remaining time in block
      const blockBookings = bookings.filter(
        (b) =>
          b.status !== "CANCELLED" &&
          b.status !== "COMPLETED" &&
          timeToMinutes(b.startTime.replace(" ", " ")) >= blockStart &&
          timeToMinutes(b.startTime.replace(" ", " ")) < blockEnd
      );

      const totalBooked = blockBookings.reduce((sum, b) => sum + b.durationMinutes, 0);
      const blockDuration = blockEnd - blockStart;
      const remaining = blockDuration - totalBooked - blockBookings.length * BUFFER_MINUTES;

      if (remaining <= 0) {
        status = "FULL";
      } else if (remaining < 30) {
        status = "FILLING";
      }
    }

    blocks.push({
      id: key,
      startTime: minutesToTime(blockStart),
      endTime: minutesToTime(blockEnd),
      label: block.label,
      status,
    });
  }

  return blocks;
}

/**
 * Create a new booking
 */
export function createBooking(
  clientName: string,
  clientPhone: string,
  startTime: string,
  durationMinutes: number,
  sessionType: "tarot" | "spell casting & healer" | "manifestation rituals" | "face reading & name" = "tarot"
): BookedSession {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  const bufferEndMinutes = endMinutes + BUFFER_MINUTES;

  return {
    id: `booking_${Date.now()}`,
    clientName,
    clientPhone,
    startTime,
    endTime: minutesToTime(endMinutes),
    bufferEndTime: minutesToTime(bufferEndMinutes),
    durationMinutes,
    sessionType,
    status: "HELD",
    bookingTime: new Date().toISOString(),
  };
}

/**
 * Format session summary for display
 */
export function formatSessionSummary(booking: BookedSession): string {
  return `Your session: ${booking.startTime} – ${booking.endTime}\nNext slot after you: ${booking.bufferEndTime}`;
}

/**
 * Get next available start time for a given block (MORNING/AFTERNOON/EVENING)
 * Returns { canFit, startTime, endTime, bufferEndTime, reason }
 */
export function getNextAvailableStartForBlock(
  dateString: string,
  bookings: BookedSession[],
  durationMinutes: number,
  blockKey: keyof typeof WORKING_HOURS
): {
  canFit: boolean;
  startTime?: string;
  endTime?: string;
  bufferEndTime?: string;
  reason?: string;
} {
  const block = WORKING_HOURS[blockKey];
  const blockStart = block.start * 60;
  const blockEnd = block.end * 60;

  // Filter bookings in this block and sort by start time
  const blockBookings = bookings
    .filter((b) => b.status !== "CANCELLED" && timeToMinutes(b.startTime.replace(" ", " ")) >= blockStart && timeToMinutes(b.startTime.replace(" ", " ")) < blockEnd)
    .sort((a, z) => timeToMinutes(a.startTime.replace(" ", " ")) - timeToMinutes(z.startTime.replace(" ", " ")));

  let candidateStart = blockStart;

  if (blockBookings.length > 0) {
    const last = blockBookings[blockBookings.length - 1];
    candidateStart = timeToMinutes(last.bufferEndTime.replace(" ", " "));
  }

  // Clamp to block start
  if (candidateStart < blockStart) candidateStart = blockStart;

  const endMinutes = candidateStart + durationMinutes;
  const bufferEndMinutes = endMinutes + BUFFER_MINUTES;

  if (bufferEndMinutes <= blockEnd) {
    return {
      canFit: true,
      startTime: minutesToTime(candidateStart),
      endTime: minutesToTime(endMinutes),
      bufferEndTime: minutesToTime(bufferEndMinutes),
    };
  }

  return {
    canFit: false,
    reason: `Not enough time in ${block.label}`,
  };
}
