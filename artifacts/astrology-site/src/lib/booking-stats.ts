export const BOOKING_STATS_UPDATED_EVENT = "booking-stats-updated";
export const BOOKING_STATS_CACHE_KEY = "tarot-booking-stats-cache";

export type BookingStats = {
  uniqueClientsGuided: number;
  totalBookings: number;
};

export function readCachedBookingStats(): BookingStats | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(BOOKING_STATS_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<BookingStats>;
    if (typeof parsed.uniqueClientsGuided !== "number" || typeof parsed.totalBookings !== "number") {
      return null;
    }

    return {
      uniqueClientsGuided: parsed.uniqueClientsGuided,
      totalBookings: parsed.totalBookings,
    };
  } catch {
    return null;
  }
}

export function writeCachedBookingStats(stats: BookingStats): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(BOOKING_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage failures and fall back to network state.
  }
}