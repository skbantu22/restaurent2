// UK-time date helpers shared by admin APIs
const TZ = "Europe/London";
export const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
export const firstOfMonthYmd = () => `${todayYmd().slice(0, 7)}-01`;
export const ymdOf = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
// Midnight (or 23:59:59) London time for a YYYY-MM-DD string, as a Date
export function londonDate(ymd, endOfDay = false) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0));
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(guess));
  const offset = (h - guess.getUTCHours() + 24) % 24;
  return new Date(guess.getTime() - offset * 3600000);
}
export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
