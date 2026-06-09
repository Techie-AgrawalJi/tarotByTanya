import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { readBlockedDates, writeBlockedDates, toggleBlockedDate, clearBlockedDates } from "@/lib/blockedDates";

// Use LOCAL date parts — never toISOString() which shifts to UTC
function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BlockedDatesCalendar({ compact }: { compact?: boolean }) {
  const [blocked, setBlocked] = useState<string[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  useEffect(() => {
    setBlocked(readBlockedDates());
  }, []);

  function handleDayClick(day: Date) {
    const iso = toIso(day);
    const next = toggleBlockedDate(iso);
    setBlocked(next);
  }

  function handleSave() {
    writeBlockedDates(blocked);
    alert("Blocked dates saved");
  }

  function handleClear() {
    if (!confirm("Clear all blocked dates?")) return;
    clearBlockedDates();
    setBlocked([]);
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-white">Block Unavailable Dates</h3>
        <div className="flex gap-2">
          <button onClick={handleSave} className="rounded px-3 py-2 text-sm font-semibold text-emerald-100 bg-emerald-500/30 hover:bg-emerald-500/50 transition">Save Changes</button>
          <button onClick={handleClear} className="rounded px-3 py-2 text-sm font-semibold text-red-100 bg-red-500/30 hover:bg-red-500/50 transition">Clear All</button>
        </div>
      </div>

      <div>
        <style>{`
          .gold-daypicker { padding: ${compact ? '0.25rem' : '0.5rem'}; }
          .gold-daypicker .rdp-nav_button svg { stroke: #d4b46a!important; color: #d4b46a!important; }
          .gold-daypicker .rdp-nav_button { border-color: #d4b46a!important; }
          .gold-daypicker .rdp-day { font-size: ${compact ? '0.7rem' : '0.85rem'}; font-weight: 600; }
          .gold-daypicker .rdp-cell { padding: ${compact ? '0.12rem' : '0.2rem'}; }
          .gold-daypicker .rdp-caption { font-size: ${compact ? '0.85rem' : '0.95rem'}; font-weight: 600; color: white; }
          .gold-daypicker .rdp-head_cell { font-size: ${compact ? '0.6rem' : '0.75rem'}; }
          .rdp-day_selected:not([disabled]) { background-color: #d4b46a!important; color: #0a0a1a!important; font-weight: bold; }
          .rdp { border: none!important; }
        `}</style>
        <DayPicker
          className="gold-daypicker"
          mode="single"
          captionLayout={compact ? "label" : "dropdown"}
          month={month}
          onMonthChange={setMonth}
          onDayClick={handleDayClick}
          selected={undefined}
          modifiers={{ blocked: (date) => blocked.includes(toIso(date)) }}
          modifiersClassNames={{ blocked: "bg-red-500/80 text-white font-bold rounded" }}
          fromMonth={new Date(1970, 0)}
        />
      </div>

      <div className="mt-4 text-sm text-white/80 flex gap-6">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" /> Blocked (Unavailable)</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-white/40 border border-white/60" /> Available</span>
      </div>
    </div>
  );
}