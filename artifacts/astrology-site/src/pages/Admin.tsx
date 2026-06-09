import { type FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Eye, EyeOff, Mail, CalendarDays, X } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import {
  clearBookings,
  addBooking,
  getBookings,
  removeBooking,
  updateBookingStatus,
  updateBooking,
  subscribe,
} from "@/lib/bookingsStore";
import { type BookedSession } from "@/lib/slotManager";
import Candles from "../components/Candles";
import BlockedDatesCalendar from "@/components/BlockedDatesCalendar";
import { formatDate, formatDateTime } from "@/lib/format";

const ADMIN_EMAIL =
  (import.meta as any).env.VITE_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD =
  (import.meta as any).env.VITE_ADMIN_PASSWORD || "password123";

export default function Admin() {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("admin_token"),
  );
  const [bookings, setBookings] = useState<BookedSession[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  function loadBookingsFromServer() {
    const API_BASE = getApiBaseUrl();
    const url = `${API_BASE}/api/bookings?t=${Date.now()}`;
    return fetch(url, { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (json && json.bookings) {
          try {
            clearBookings();
            (json.bookings || []).forEach((b: any) => addBooking(b));
          } catch (e) {}
          setBookings(json.bookings);
        } else setBookings(getBookings());
      })
      .catch(() => setBookings(getBookings()));
  }

  useEffect(() => {
    const unsub = subscribe((nextBookings) => setBookings(nextBookings));
    return unsub;
  }, []);

  useEffect(() => {
    loadBookingsFromServer();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const intervalId = window.setInterval(() => {
      loadBookingsFromServer();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated]);

  function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      localStorage.setItem("admin_token", "1");
      setAuthenticated(true);
    } else {
      alert("Invalid admin credentials");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    // Prevent the "Read Carefully" modal from showing when returning to home
    sessionStorage.setItem("visited_admin", "1");
    window.location.href = "/";
  }

  if (!isAuthenticated) {
    return (
      <main
        className="admin-font relative isolate flex min-h-screen items-center justify-center overflow-hidden text-white"
        style={{ background: "#12112a" }}
      >
        <Candles />
        <section className="relative z-10 w-full px-4 py-8">
          <div className="mx-auto w-full max-w-95 rounded-2xl border border-[rgba(212,180,106,0.28)] bg-[rgba(14,13,32,0.72)] px-9 py-9 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-md animate-[cardIn_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
            <div className="mb-7 flex justify-start">
              <Link href="/">
                <button className="inline-flex items-center gap-2 border-none bg-transparent text-sm md:text-base tracking-[0.04em] text-white/70 transition-colors hover:text-[#d4b46a]">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </Link>
            </div>
            <div className="mb-7 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,180,106,0.28)] bg-[rgba(212,180,106,0.18)] text-[20px]">
                🔮
              </div>
              <div className="font-serif text-[16px] font-semibold tracking-[0.09em] text-[#d4b46a]">
                DivineTanyaa
              </div>
            </div>
            <div className="mb-6 h-px bg-[rgba(255,255,255,0.07)]" />
            <p className="mb-7 text-center font-serif text-[10.5px] font-normal uppercase tracking-[0.22em] text-[rgba(255,255,255,0.28)]">
              Admin Login
            </p>
            <form onSubmit={handleLogin} className="space-y-[1.1rem]">
              <div className="space-y-1.5">
                <label className="font-serif text-[11px] md:text-sm uppercase tracking-[0.14em] text-white/70 font-semibold">
                  Email
                </label>
                <div className="relative">
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@divinetanyaa.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ textTransform: "none" }}
                    className="login-input-normal font-sans h-11 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.045)] px-3.5 pr-10 text-[15px] text-[rgba(255,255,255,0.82)] outline-none transition-colors placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(212,180,106,0.45)] focus:shadow-[0_0_0_3px_rgba(212,180,106,0.07)]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.2)]">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-serif text-[11px] md:text-sm uppercase tracking-[0.14em] text-white/70 font-semibold">
                  Password
                </label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ textTransform: "none" }}
                    className="login-input-normal font-sans h-11 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.045)] px-3.5 pr-10 text-[15px] text-[rgba(255,255,255,0.82)] outline-none transition-colors placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(212,180,106,0.45)] focus:shadow-[0_0_0_3px_rgba(212,180,106,0.07)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.2)] transition-colors hover:text-[#d4b46a]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="mt-7 h-12 w-full rounded-xl border border-[rgba(212,180,106,0.28)] bg-[linear-gradient(135deg,#b8922e,#d4b46a,#b8922e)] font-serif text-[12px] font-semibold uppercase tracking-[0.18em] text-[#1a1000] transition-opacity duration-200 hover:opacity-90 active:scale-[0.985]"
                style={{ backgroundSize: "200% auto" }}
              >
                Enter the Portal
              </button>
            </form>
            <p className="mt-5 text-center text-[12px] tracking-wider text-[rgba(255,255,255,0.15)]">
              Secured access only
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="admin-font relative isolate min-h-screen overflow-hidden bg-[#090712] text-foreground text-base md:text-lg lg:text-xl"
      style={{ textTransform: "none", fontFamily: "Raleway, sans-serif" }}
    >
      <Candles />

      {/* ── Desktop calendar: fixed top-right ── */}
      <div
        className="hidden lg:block fixed top-4 right-6 z-30"
        style={{ width: "300px" }}
      >
        <div
          className="glass-card border border-white/10 bg-[#080812]/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md rounded-xl overflow-hidden"
          style={{ fontSize: "15px", lineHeight: "1" }}
        >
          <style>{`
            .admin-cal-wrap { padding: 4px 6px; }
            .admin-cal-wrap > div.mb-6 { margin-bottom: 0 !important; }
            .admin-cal-wrap .flex.items-center.justify-between.mb-4 { margin-bottom: 4px !important; }
            .admin-cal-wrap h3 { font-size: 11px !important; line-height: 1.2 !important; }
            .admin-cal-wrap .flex.gap-2 button { font-size: 10px !important; padding: 2px 6px !important; }
            .admin-cal-wrap .gold-daypicker { padding: 0 !important; }
            .admin-cal-wrap .gold-daypicker .rdp { --rdp-cell-size: 26px; margin: 0 !important; }
            .admin-cal-wrap .gold-daypicker table { border-collapse: collapse !important; border-spacing: 0 !important; }
            .admin-cal-wrap .gold-daypicker .rdp-head_row,
            .admin-cal-wrap .gold-daypicker .rdp-row { gap: 0 !important; }
            .admin-cal-wrap .gold-daypicker .rdp-head_cell,
            .admin-cal-wrap .gold-daypicker .rdp-cell { padding: 1px !important; width: 26px !important; height: 26px !important; }
            .admin-cal-wrap .gold-daypicker .rdp-day { width: 24px !important; height: 24px !important; margin: 0 !important; font-size: 11px !important; }
            .admin-cal-wrap .gold-daypicker .rdp-caption { margin-bottom: 4px !important; font-size: 12px !important; }
            .admin-cal-wrap .gold-daypicker .rdp-month,
            .admin-cal-wrap .gold-daypicker .rdp-months { margin: 0 !important; padding: 0 !important; }
            .admin-cal-wrap .mt-4 { margin-top: 4px !important; font-size: 10px; }
            .admin-cal-wrap .mt-4 .h-3 { width: 8px !important; height: 8px !important; }
          `}</style>
          <div className="admin-cal-wrap">
            <BlockedDatesCalendar compact />
          </div>
        </div>
      </div>

      {/* ── Mobile calendar modal ── */}
      {calendarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="glass-card rounded-2xl border border-white/10 bg-[#080812]/95 p-4 w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#d4b46a] tracking-wider uppercase">
                Availability
              </span>
              <button
                onClick={() => setCalendarOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Close calendar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BlockedDatesCalendar compact />
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
            Hi, Tanya
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Availability button — mobile only */}
            <button
              onClick={() => setCalendarOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded bg-[rgba(212,180,106,0.12)] border border-[rgba(212,180,106,0.25)] px-3 py-2 text-[#d4b46a] text-sm"
            >
              <CalendarDays className="h-4 w-4" />
              Availability
            </button>

            <button
              onClick={async () => {
                if (!confirm("Clear all bookings?")) return;
                const API_BASE = getApiBaseUrl();
                try {
                  const response = await fetch(`${API_BASE}/api/bookings`, {
                    method: "DELETE",
                  });
                  const json = await response.json();
                  if (json.ok) {
                    clearBookings();
                    setBookings([]);
                    loadBookingsFromServer();
                  } else {
                    alert("Failed to clear bookings");
                  }
                } catch (error) {
                  alert("Failed to clear bookings");
                }
              }}
              className="rounded bg-white/5 px-3 py-2 text-white text-sm min-w-[5.5rem]"
            >
              Clear All
            </button>

            <button
              onClick={handleLogout}
              className="rounded bg-white/5 px-3 py-2 text-white text-sm min-w-[5.5rem]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Bookings table — full width */}
        <div className="glass-card rounded-2xl border border-white/10 bg-[#0b0b18]/60 p-6 w-full">
          <h3 className="mb-2 text-lg text-white">
            Total Bookings: {bookings.length}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-white/70">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Booked At</th>
                  <th className="px-3 py-2">Slot Date</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Buffer End</th>
                  <th className="px-3 py-2">Duration (min)</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, idx) => (
                  <tr
                    key={`${booking.id || "booking"}-${idx}`}
                    className={`border-t border-white/5 ${booking.status === "COMPLETED" ? "line-through opacity-60" : ""}`}
                  >
                    <td className="px-3 py-2 text-white">
                      {(booking as any).fullName ||
                        (booking as any).clientName ||
                        (booking as any).raw?.name ||
                        (booking as any).raw?.clientName ||
                        (booking as any).name ||
                        "-"}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {(booking as any).clientPhone ||
                        (booking as any).raw?.phone ||
                        (booking as any).raw?.clientPhone ||
                        (booking as any).whatsapp ||
                        "-"}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.bookingTime
                        ? formatDateTime(booking.bookingTime)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {formatDate(
                        booking.slotDate ||
                          (booking as any).raw?.slotTiming?.date ||
                          (booking as any).raw?.date,
                      )}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.sessionType}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.startTime}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.endTime}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.bufferEndTime}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {booking.durationMinutes ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        {booking.status !== "COMPLETED" ? (
                          <button
                            onClick={async () => {
                              try {
                                const payload = {
                                  status: "COMPLETED",
                                  cutThrough: true,
                                  actualEndTime: new Date().toISOString(),
                                } as any;
                                const response = await fetch(
                                  `${getApiBaseUrl()}/api/bookings/${booking.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(payload),
                                  },
                                );
                                const json = await response.json();
                                if (json.ok) {
                                  updateBooking(booking.id, {
                                    status: "COMPLETED",
                                    cutThrough: true,
                                    actualEndTime: payload.actualEndTime,
                                  });
                                  setBookings((current) =>
                                    current.map((entry) =>
                                      entry.id === booking.id
                                        ? {
                                            ...entry,
                                            status: "COMPLETED",
                                            cutThrough: true,
                                            actualEndTime: payload.actualEndTime,
                                          }
                                        : entry,
                                    ),
                                  );
                                  loadBookingsFromServer();
                                } else {
                                  alert("Failed to mark reading as completed");
                                }
                              } catch (error) {
                                alert("Failed to mark reading as completed");
                              }
                            }}
                            className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-200">
                              Completed
                            </span>
                            {booking.cutThrough ? (
                              <span className="rounded bg-yellow-600/15 px-2 py-1 text-yellow-200 text-xs">
                                Cut Through
                                {booking.actualEndTime
                                  ? ` • ${formatDateTime(booking.actualEndTime)}`
                                  : ""}
                              </span>
                            ) : null}
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this booking?")) return;
                            try {
                              const response = await fetch(
                                `${getApiBaseUrl()}/api/bookings/${booking.id}`,
                                { method: "DELETE" },
                              );
                              const json = await response.json();
                              if (json.ok) {
                                removeBooking(booking.id);
                                setBookings((current) =>
                                  current.filter(
                                    (entry) => entry.id !== booking.id,
                                  ),
                                );
                                loadBookingsFromServer();
                              } else {
                                alert("Failed to delete booking");
                              }
                            } catch (error) {
                              alert("Failed to delete booking");
                            }
                          }}
                          className="rounded bg-red-500/20 px-2 py-1 text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}