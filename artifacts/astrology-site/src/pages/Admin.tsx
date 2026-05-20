import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail, Eye } from "lucide-react";
import {
  getBookings,
  subscribe,
  removeBooking,
  clearBookings,
} from "@/lib/bookingsStore";
import { BookedSession } from "@/lib/slotManager";
import { Starfield } from "@/components/Starfield";
import Candles from "@/components/Candles";

const ADMIN_EMAIL =
  (import.meta as any).env.VITE_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD =
  (import.meta as any).env.VITE_ADMIN_PASSWORD || "password123";

export default function Admin() {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("admin_token"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<BookedSession[]>([]);

  useEffect(() => {
    const unsub = subscribe((b) => setBookings(b));
    return unsub;
  }, []);

  useEffect(() => {
    // load persisted bookings from API first
    const API_BASE =
      (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
    fetch(`${API_BASE}/api/bookings`)
      .then((r) => r.json())
      .then((json) => {
        if (json && json.bookings) setBookings(json.bookings);
        else setBookings(getBookings());
      })
      .catch(() => setBookings(getBookings()));
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_token", "1");
      setAuthenticated(true);
    } else {
      alert("Invalid admin credentials");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
  }

  return (
    <main className="min-h-screen relative font-sans text-foreground">
      <Starfield />
      {/* Minimal brand header for admin pages (logo + site name only) */}
      <header className="container mx-auto px-4 md:px-8 pt-6">
        <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl md:text-2xl">
          <Link href="/">
            <button aria-label="View logo" className="inline-flex p-0">
              <img
                src="logo.png"
                alt="logo"
                className="h-10 w-10 md:h-12 md:w-12 object-contain"
              />
            </button>
          </Link>
          <Link href="/">
            <button
              onClick={() => {}}
              className="ml-2 cursor-pointer text-left text-white"
            >
              DivineTanyaa
            </button>
          </Link>
        </div>
      </header>
      <Candles />
      <div className="container mx-auto max-w-4xl py-12">
        {!isAuthenticated ? (
          <div className="mx-auto w-full px-4 sm:px-6 md:px-0 max-w-[92%] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
            <div className="glass-card rounded-2xl p-6 md:p-8 bg-[#0b0b18]/50 border border-white/10">
              <div className="flex justify-start mb-4">
                <Link href="/">
                  <button className="inline-flex items-center gap-2 px-2 py-1 rounded bg-transparent text-white/80 hover:opacity-90">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </Link>
              </div>

              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-[#0a0a0f] border-2 border-amber-400 flex items-center justify-center shadow-[0_6px_24px_rgba(201,168,76,0.08)]">
                  <img src="logo.png" alt="logo" className="w-10 h-10" />
                </div>
                <div className="text-2xl font-serif font-semibold text-amber-300">
                  DivineTanyaa
                </div>
                <hr className="w-3/4 border-t border-white/10 mt-2 mb-2" />
                <div className="text-xs tracking-widest text-white/60">
                  ADMIN PORTAL
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs text-white/60 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative mt-2">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@divinetanyaa.com"
                      className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/60 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-[#0a0a0a] font-semibold tracking-wider"
                >
                  Enter the Portal
                </button>
              </form>

            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <button className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white/5 text-white hover:bg-white/10">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </Link>
                <h2 className="text-2xl font-semibold text-white">
                  Admin Dashboard
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm("Clear all bookings?")) return;
                    const API_BASE =
                      (import.meta as any).env.VITE_API_BASE ||
                      "http://localhost:5000";
                    try {
                      const res = await fetch(`${API_BASE}/api/bookings`, {
                        method: "DELETE",
                      });
                      const j = await res.json();
                      if (j.ok) {
                        clearBookings();
                        setBookings([]);
                      } else {
                        alert("Failed to clear bookings");
                      }
                    } catch (err) {
                      alert("Failed to clear bookings");
                    }
                  }}
                  className="px-3 py-2 rounded bg-white/5 text-white"
                >
                  Clear All
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded bg-white/5 text-white"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-8 bg-[#0b0b18]/60 border border-white/10">
              <h3 className="text-lg text-white mb-2">
                Total Bookings: {bookings.length}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-white/70">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Service</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                      <th className="px-3 py-2">Buffer End</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-t border-white/5">
                        <td className="px-3 py-2 text-white/70">{b.id}</td>
                        <td className="px-3 py-2 text-white">{b.clientName}</td>
                        <td className="px-3 py-2 text-white/70">
                          {b.clientPhone}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {b.sessionType}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {b.startTime}
                        </td>
                        <td className="px-3 py-2 text-white/70">{b.endTime}</td>
                        <td className="px-3 py-2 text-white/70">
                          {b.bufferEndTime}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {b.durationMinutes}m
                        </td>
                        <td className="px-3 py-2 text-white/70">{b.status}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this booking?")) return;
                              const API_BASE =
                                (import.meta as any).env.VITE_API_BASE ||
                                "http://localhost:5000";
                              try {
                                const res = await fetch(
                                  `${API_BASE}/api/bookings/${b.id}`,
                                  { method: "DELETE" },
                                );
                                const j = await res.json();
                                if (j.ok) {
                                  removeBooking(b.id);
                                } else {
                                  alert("Failed to delete booking");
                                }
                              } catch (err) {
                                alert("Failed to delete booking");
                              }
                            }}
                            className="px-2 py-1 rounded bg-destructive text-white text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
