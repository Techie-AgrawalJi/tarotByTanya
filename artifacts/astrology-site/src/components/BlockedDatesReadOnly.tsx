import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { readBlockedDates } from "@/lib/blockedDates";

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function BlockedDatesReadOnly() {
  const blocked = readBlockedDates();

  return (
    <div>
      <style>{`
        .gold-daypicker { padding: 0.5rem; }
        .gold-daypicker .rdp-nav_button svg { stroke: #d4b46a!important; color: #d4b46a!important; }
        .gold-daypicker .rdp-nav_button { border-color: #d4b46a!important; }
        .gold-daypicker .rdp-day { font-size: 0.85rem; font-weight: 600; }
        .gold-daypicker .rdp-cell { padding: 0.2rem; }
        .gold-daypicker .rdp-caption { font-size: 0.95rem; font-weight: 600; color: white; }
        .gold-daypicker .rdp-head_cell { font-size: 0.75rem; }
        .rdp-day_selected:not([disabled]) { background-color: #d4b46a!important; color: #0a0a1a!important; font-weight: bold; }
        .rdp { border: none!important; }
      `}</style>
      <DayPicker
        className="gold-daypicker"
        fromMonth={new Date()}
        modifiers={{ blocked: (date) => blocked.includes(toIso(date)) }}
        modifiersClassNames={{ blocked: "bg-red-500/80 text-white font-bold rounded" }}
        disabled={(date) => blocked.includes(toIso(date))}
      />
    </div>
  );
}
