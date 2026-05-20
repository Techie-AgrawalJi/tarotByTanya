import { BookedSession } from "./slotManager";

let bookings: BookedSession[] = [];
const subscribers: ((b: BookedSession[]) => void)[] = [];

export function getBookings() {
  return bookings.slice();
}

export function addBooking(b: BookedSession) {
  bookings = [...bookings, b];
  subscribers.forEach((s) => s(getBookings()));
}

export function removeBooking(id: string) {
  bookings = bookings.filter((b) => b.id !== id);
  subscribers.forEach((s) => s(getBookings()));
}

export function updateBookingStatus(id: string, status: BookedSession["status"]) {
  bookings = bookings.map((booking) => (booking.id === id ? { ...booking, status } : booking));
  subscribers.forEach((s) => s(getBookings()));
}

export function clearBookings() {
  bookings = [];
  subscribers.forEach((s) => s(getBookings()));
}

export function subscribe(fn: (b: BookedSession[]) => void) {
  subscribers.push(fn);
  fn(getBookings());
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}
