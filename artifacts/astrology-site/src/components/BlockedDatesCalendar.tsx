import { useEffect, useState, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  readBlockedDates,
  toggleBlockedDate,
  clearBlockedDates,
} from "@/lib/blockedDates";

// Use LOCAL date parts — never toISOString() which shifts to UTC
function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BlockedDatesCalendar({
  compact,
}: {
  compact?: boolean;
}) {
  const [blocked, setBlocked] = useState<string[]>([]);
  const [month, setMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  // Load from server on mount
  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dates = await readBlockedDates();
      setBlocked(dates);
    } catch {
      setError("Failed to load blocked dates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  async function handleDayClick(day: Date) {
    const iso = toIso(day);
    setSaving(true);
    setError("");
    try {
      const next = await toggleBlockedDate(iso);
      setBlocked(next);
      setLastSaved(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch {
      setError("Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!confirm("Clear all blocked dates?")) return;
    setSaving(true);
    setError("");
    try {
      await clearBlockedDates();
      setBlocked([]);
      setLastSaved(`Cleared at ${new Date().toLocaleTimeString()}`);
    } catch {
      setError("Failed to clear. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-white">
          Block Unavailable Dates
          {saving && (
            <span className="ml-2 text-xs text-amber-300 animate-pulse">
              Saving...
            </span>
          )}
          {loading && (
            <span className="ml-2 text-xs text-white/40">Loading...</span>
          )}
        </h3>
        <div className="flex gap-2 items-center">
          {lastSaved && !saving && (
            <span className="text-xs text-emerald-400">{lastSaved}</span>
          )}
          <button
            onClick={handleClear}
            disabled={saving || loading}
            className="rounded px-3 py-2 text-sm font-semibold text-red-100 bg-red-500/30 hover:bg-red-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
          <button
            onClick={loadFromServer}
            className="ml-2 underline text-red-200 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className={loading ? "opacity-50 pointer-events-none" : ""}>
        <style>{`
          .gold-daypicker { padding: ${compact ? "0.25rem" : "0.5rem"}; }
          .gold-daypicker .rdp-nav_button svg { stroke: #d4b46a!important; color: #d4b46a!important; }
          .gold-daypicker .rdp-nav_button { border-color: #d4b46a!important; }
          .gold-daypicker .rdp-day { font-size: ${compact ? "0.7rem" : "0.85rem"}; font-weight: 600; }
          .gold-daypicker .rdp-cell { padding: ${compact ? "0.12rem" : "0.2rem"}; }
          .gold-daypicker .rdp-caption { font-size: ${compact ? "0.85rem" : "0.95rem"}; font-weight: 600; color: white; }
          .gold-daypicker .rdp-head_cell { font-size: ${compact ? "0.6rem" : "0.75rem"}; }
          .rdp-day_selected:not([disabled]) { background-color: #d4b46a!important; color: #0a0a1a!important; font-weight: bold; }
          .rdp { border: none!important; }
          .rdp-day_blocked { background-color: rgba(239,68,68,0.8)!important; color: white!important; font-weight: bold; border-radius: 4px; }
        `}</style>
        <DayPicker
          className="gold-daypicker"
          mode="single"
          captionLayout={compact ? "label" : "dropdown"}
          month={month}
          onMonthChange={setMonth}
          onDayClick={handleDayClick}
          selected={undefined}
          modifiers={{
            blocked: (date) => blocked.includes(toIso(date)),
          }}
          modifiersClassNames={{
            blocked: "rdp-day_blocked",
          }}
          fromMonth={new Date(1970, 0)}
        />
      </div>

      <div className="mt-4 text-sm text-white/80 flex flex-wrap gap-4">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          Blocked (Unavailable)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-white/40 border border-white/60" />
          Available
        </span>
        <span className="text-xs text-white/40">
          Changes save automatically
        </span>
      </div>
    </div>
  );
}