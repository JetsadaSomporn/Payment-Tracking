export function formatTHB(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(value);
}

export function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(amount) ? amount : null;
}

export function todayBangkokDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
