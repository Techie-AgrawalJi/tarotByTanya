function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDate(input?: string | number | Date | null) {
  if (!input) return "-";

  // Accept Date, timestamp, or string
  let d = input instanceof Date ? input : new Date(String(input));

  // If invalid date, try parsing YYYY-MM-DD manually
  if (isNaN(d.getTime())) {
    const s = String(input || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
    return s || "-";
  }

  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(input?: string | number | Date | null) {
  if (!input) return "-";

  const d = input instanceof Date ? input : new Date(String(input));
  if (isNaN(d.getTime())) return String(input || "-");

  const hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${formatDate(d)} ${String(hour12).padStart(2, "0")}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

export default formatDate;
