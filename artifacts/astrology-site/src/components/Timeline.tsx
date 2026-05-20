/**
 * Timeline component to display available slots for a selected date
 */

import { getAvailableSlots, minutesToTime, timeToMinutes, SlotOption } from "@/lib/slotManager";
import { BookedSession } from "@/lib/slotManager";

export interface TimelineProps {
  selectedDate: string;
  bookings: BookedSession[];
  durationMinutes: number;
  onSlotSelect: (time: string) => void;
  selectedSlot?: string;
}

export function Timeline({
  selectedDate,
  bookings,
  durationMinutes,
  onSlotSelect,
  selectedSlot,
}: TimelineProps) {
  const availableSlots = getAvailableSlots(selectedDate, durationMinutes, bookings);

  if (!selectedDate) {
    return (
      <div className="text-center text-foreground/60 py-6">
        <p className="text-sm">Select a date to see available slots</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Available Time Slots</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
        {availableSlots.length === 0 ? (
          <p className="col-span-full text-center text-foreground/60 text-sm py-4">
            No available slots for this duration on the selected date.
          </p>
        ) : (
          availableSlots.map((slot, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSlotSelect(slot.time)}
              disabled={!slot.isAvailable}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedSlot === slot.time
                  ? "bg-primary text-primary-foreground shadow-md"
                  : slot.isAvailable
                  ? "bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                  : "bg-white/5 text-foreground/40 cursor-not-allowed"
              }`}
            >
              <div className="text-xs opacity-75">{slot.isAvailable ? "🟢" : "🔴"}</div>
              <div>{slot.time}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function TimelineCompact({
  selectedDate,
  bookings,
}: {
  selectedDate: string;
  bookings: BookedSession[];
}) {
  if (!selectedDate) return null;

  // Show booked times and gaps
  const sortedBookings = bookings
    .filter((b) => b.status !== "CANCELLED")
    .sort((a, b) => timeToMinutes(a.startTime.replace(" ", " ")) - timeToMinutes(b.startTime.replace(" ", " ")));

  return (
    <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
      <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Today's Queue</h4>
      <div className="space-y-1 text-xs">
        {sortedBookings.length === 0 ? (
          <p className="text-foreground/60">No bookings yet. Slots are completely open.</p>
        ) : (
          <>
            {sortedBookings.map((booking) => (
              <div key={booking.id} className="flex items-center gap-2">
                <span className="text-sm">🔴</span>
                <span className="text-foreground/90">
                  {booking.startTime} – {booking.endTime} ({booking.durationMinutes} min)
                </span>
              </div>
            ))}
            <p className="text-foreground/60 pt-2">
              {sortedBookings.length} session(s) booked. Remaining gaps open for new bookings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
