export const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
]

export const MONTHS_RO_SHORT = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Noi",
  "Dec",
]

export const DAYS_RO = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
]

export const DAY_SHORT_RO = ["L", "Ma", "Mi", "J", "V", "S", "D"]

export function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function fmtDateLong(date: Date): string {
  return `${DAYS_RO[date.getDay()]}, ${date.getDate()} ${MONTHS_RO[
    date.getMonth()
  ].toLowerCase()} ${date.getFullYear()}`
}

export function fmtDateShort(date: Date): string {
  return `${date.getDate()} ${MONTHS_RO_SHORT[date.getMonth()]}`
}

export function fmtDateInput(value: string): string {
  if (!value) return ""
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

export function shiftMonth(
  { year, month }: { year: number; month: number },
  delta: number,
): { year: number; month: number } {
  let m = month + delta
  let y = year
  while (m < 0) {
    m += 12
    y -= 1
  }
  while (m > 11) {
    m -= 12
    y += 1
  }
  return { year: y, month: m }
}

export function sameYmd(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b)
}

export function buildMonthCells(
  year: number,
  month: number,
): Array<Date | null> {
  const first = new Date(year, month, 1)
  const firstDow = (first.getDay() + 6) % 7 // Monday-first
  const last = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= last; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
