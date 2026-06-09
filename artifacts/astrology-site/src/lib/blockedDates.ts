// blockedDates.ts
// All blocked-date state is stored on the server (MongoDB via /api/blocked-dates).
// localStorage is used only as a short-lived read cache so the UI feels instant.

const CACHE_KEY = "blocked_dates_cache";
const CACHE_TTL_MS = 30_000; // 30 seconds

function getApiBase(): string {
  if (typeof window !== "undefined" && (window as any).__API_BASE_URL) {
    return String((window as any).__API_BASE_URL).replace(/\/+$/, "");
  }
  // Vite env variable (set in your .env as VITE_API_BASE_URL)
  const viteBase =
    typeof import.meta !== "undefined"
      ? (import.meta as any).env?.VITE_API_BASE_URL
      : undefined;
  if (viteBase) return String(viteBase).replace(/\/+$/, "");
  return "";
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache(): { dates: string[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(dates: string[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ dates, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

// ── Public API (all async) ────────────────────────────────────────────────────

/** Fetch blocked dates from the server. Falls back to cache on network error. */
export async function readBlockedDates(): Promise<string[]> {
  // Return fresh cache immediately to avoid flicker
  const cache = readCache();
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.dates;
  }

  try {
    const res = await fetch(`${getApiBase()}/api/blocked-dates`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.ok && Array.isArray(json.dates)) {
      writeCache(json.dates);
      return json.dates;
    }
  } catch {
    // network failure — fall back to cache if available
  }

  return cache?.dates ?? [];
}

/** Replace the full blocked-dates list on the server. */
export async function writeBlockedDates(dates: string[]): Promise<string[]> {
  const uniq = Array.from(new Set(dates)).sort();
  writeCache(uniq); // optimistic update
  try {
    const res = await fetch(`${getApiBase()}/api/blocked-dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates: uniq }),
    });
    const json = await res.json();
    if (json?.ok && Array.isArray(json.dates)) {
      writeCache(json.dates);
      return json.dates;
    }
  } catch {
    // optimistic update already applied; will sync on next read
  }
  return uniq;
}

/** Toggle a single date on the server. Returns the updated list. */
export async function toggleBlockedDate(dateIso: string): Promise<string[]> {
  // Optimistic local toggle first so UI responds instantly
  const cache = readCache();
  const current = cache?.dates ?? [];
  const optimistic = current.includes(dateIso)
    ? current.filter((d) => d !== dateIso)
    : [...current, dateIso];
  writeCache(optimistic);

  try {
    const res = await fetch(`${getApiBase()}/api/blocked-dates/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateIso }),
    });
    const json = await res.json();
    if (json?.ok && Array.isArray(json.dates)) {
      writeCache(json.dates);
      return json.dates;
    }
  } catch {
    // optimistic result already returned
  }
  return optimistic;
}

/** Clear all blocked dates on the server. */
export async function clearBlockedDates(): Promise<void> {
  clearCache();
  try {
    await fetch(`${getApiBase()}/api/blocked-dates`, { method: "DELETE" });
  } catch {
    // ignore
  }
}

/** Synchronous read from cache only — for places that can't await. */
export function readBlockedDatesSync(): string[] {
  return readCache()?.dates ?? [];
}