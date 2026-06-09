export const BLOCKED_DATES_KEY = "blocked_dates";

export function readBlockedDates(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_DATES_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => String(d));
  } catch {
    return [];
  }
}

export function writeBlockedDates(dates: string[]) {
  try {
    const uniq = Array.from(new Set(dates)).sort();
    localStorage.setItem(BLOCKED_DATES_KEY, JSON.stringify(uniq));
  } catch {
    // ignore
  }
}

export function toggleBlockedDate(dateIso: string): string[] {
  const current = readBlockedDates();
  const idx = current.indexOf(dateIso);
  if (idx === -1) {
    const next = [...current, dateIso];
    writeBlockedDates(next);
    return next;
  }

  const next = current.filter((d) => d !== dateIso);
  writeBlockedDates(next);
  return next;
}

export function clearBlockedDates() {
  try {
    localStorage.removeItem(BLOCKED_DATES_KEY);
  } catch {
    // ignore
  }
}
