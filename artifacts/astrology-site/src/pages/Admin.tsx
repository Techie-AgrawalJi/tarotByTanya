import { type FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
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

const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = (import.meta as any).env.VITE_ADMIN_PASSWORD || "password123";

export default function Admin() {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("admin_token"),
  );
  const [bookings, setBookings] = useState<BookedSession[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [guideAvailable, setGuideAvailable] = useState(true);
  const [guideStatusLoading, setGuideStatusLoading] = useState(true);
  const [guideStatusSaving, setGuideStatusSaving] = useState(false);
  const [guideStatusMessage, setGuideStatusMessage] = useState("");

  function loadBookingsFromServer() {
    const API_BASE = getApiBaseUrl();
    // Add cache-busting to avoid stale 304 responses from dev server
    const url = `${API_BASE}/api/bookings?t=${Date.now()}`;
    return fetch(url, { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        if (json && json.bookings) {
          // keep the shared bookings store in sync so subscribers see the data
          try {
            clearBookings();
            (json.bookings || []).forEach((b: any) => addBooking(b));
          } catch (e) {
            // ignore store update errors
          }
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
    const controller = new AbortController();

    fetch(`${getApiBaseUrl()}/api/guide-status`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load guide availability.");
        }

        setGuideAvailable(Boolean(json.guide?.available));
        setGuideStatusMessage(String(json.guide?.message || "").trim());
      })
      .catch(() => {
        setGuideAvailable(true);
        setGuideStatusMessage("");
      })
      .finally(() => {
        setGuideStatusLoading(false);
      });

    return () => controller.abort();
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
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_token", "1");
      setAuthenticated(true);
    } else {
      alert("Invalid admin credentials");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    window.location.href = "/";
  }

  if (!isAuthenticated) {
    return (
      <main
        className="relative isolate flex min-h-screen items-center justify-center overflow-hidden font-serif text-white"
        style={{ background: "#12112a" }}
      >
        <Candles />

        <section className="relative z-10 w-full px-4 py-8">
          <div className="mx-auto w-full max-w-95 rounded-2xl border border-[rgba(212,180,106,0.28)] bg-[rgba(14,13,32,0.72)] px-9 py-9 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-md animate-[cardIn_0.9s_cubic-bezier(0.22,1,0.36,1)_both]">
            <div className="mb-7 flex justify-start">
              <Link href="/">
                <button className="inline-flex items-center gap-1.5 border-none bg-transparent text-[13px] tracking-[0.04em] text-[rgba(255,255,255,0.28)] transition-colors hover:text-[#d4b46a]">
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
              ADMIN PORTAL
            </p>

            <form onSubmit={handleLogin} className="space-y-[1.1rem]">
              <div className="space-y-1.5">
                <label className="font-serif text-[10px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.28)]">
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
                <label className="font-serif text-[10px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.28)]">
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
    <main className="relative isolate min-h-screen overflow-hidden bg-[#090712] font-sans text-foreground">
      <Candles />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Admin Dashboard</h2>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const nextAvailable = !guideAvailable;
                setGuideStatusSaving(true);
                try {
                  const response = await fetch(`${getApiBaseUrl()}/api/guide-status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      available: nextAvailable,
                      message: nextAvailable ? "Guide is available today." : "Guide is not available today.",
                    }),
                  });
                  const json = await response.json().catch(() => null);
                  if (json.ok) {
                    setGuideAvailable(Boolean(json.guide?.available));
                    setGuideStatusMessage(String(json.guide?.message || "").trim());
                  } else {
                    alert(json?.error || "Failed to update guide availability");
                  }
                } catch {
                  alert("Failed to update guide availability");
                } finally {
                  setGuideStatusSaving(false);
                }
              }}
              className={`rounded px-3 py-2 text-white transition-colors ${guideAvailable ? "bg-amber-500/20 hover:bg-amber-500/30" : "bg-emerald-500/20 hover:bg-emerald-500/30"}`}
              disabled={guideStatusLoading || guideStatusSaving}
            >
              {guideStatusSaving
                ? "Saving..."
                : guideAvailable
                  ? "Mark Guide Unavailable"
                  : "Mark Guide Available"}
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
              className="rounded bg-white/5 px-3 py-2 text-white"
            >
              Clear All
            </button>

            <button onClick={handleLogout} className="rounded bg-white/5 px-3 py-2 text-white">
              Logout
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 bg-[#0b0b18]/60 p-8">
          <h3 className="mb-2 text-lg text-white">Total Bookings: {bookings.length}</h3>
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
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, idx) => (
                  <tr
                    key={`${booking.id || 'booking'}-${idx}`}
                    className={`border-t border-white/5 ${booking.status === "COMPLETED" ? "line-through opacity-60" : ""}`}
                  >
                    <td className="px-3 py-2 text-white">{(booking as any).fullName || (booking as any).clientName || (booking as any).raw?.name || (booking as any).raw?.clientName || (booking as any).name || "-"}</td>
                    <td className="px-3 py-2 text-white/70">{(booking as any).clientPhone || (booking as any).raw?.phone || (booking as any).raw?.clientPhone || (booking as any).whatsapp || "-"}</td>
                    <td className="px-3 py-2 text-white/70">{booking.bookingTime ? new Date(booking.bookingTime).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2 text-white/70">{booking.slotDate || (booking as any).raw?.slotTiming?.date || (booking as any).raw?.date || "-"}</td>
                    <td className="px-3 py-2 text-white/70">{booking.sessionType}</td>
                    <td className="px-3 py-2 text-white/70">{booking.startTime}</td>
                    <td className="px-3 py-2 text-white/70">{booking.endTime}</td>
                    <td className="px-3 py-2 text-white/70">{booking.bufferEndTime}</td>
                    <td className="px-3 py-2 text-white/70">{booking.durationMinutes}m</td>
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

                                const response = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload),
                                });
                                const json = await response.json();
                                if (json.ok) {
                                  // keep booking visible but mark as completed and record cut info
                                  updateBooking(booking.id, {
                                    status: "COMPLETED",
                                    cutThrough: true,
                                    actualEndTime: payload.actualEndTime,
                                  });
                                  setBookings((current) =>
                                    current.map((entry) =>
                                      entry.id === booking.id
                                        ? { ...entry, status: "COMPLETED", cutThrough: true, actualEndTime: payload.actualEndTime }
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
                            <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-200">Completed</span>
                            {booking.cutThrough ? (
                              <span className="rounded bg-yellow-600/15 px-2 py-1 text-yellow-200 text-xs">
                                Cut Through{booking.actualEndTime ? ` • ${new Date(booking.actualEndTime).toLocaleString()}` : ""}
                              </span>
                            ) : null}
                          </div>
                        )}

                        <button
                          onClick={async () => {
                            if (!confirm("Delete this booking?")) return;
                            try {
                              const response = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}`, {
                                method: "DELETE",
                              });
                              const json = await response.json();
                              if (json.ok) {
                                removeBooking(booking.id);
                                setBookings((current) => current.filter((entry) => entry.id !== booking.id));
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
