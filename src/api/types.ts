// Cross-cutting helpers used by hooks/pages.

import type { DailyActivityRecord } from "./daily-activity-records"
import { RevenueType } from "./daily-activity-records"

export interface MonthAggregate {
  nb: number
  po: number
  total: number
  records: number
}

export function aggregateMonth(
  records: DailyActivityRecord[],
  year: number,
  month0: number,
): MonthAggregate {
  let nb = 0
  let po = 0
  let count = 0
  for (const r of records) {
    const d = new Date(r.startDate)
    if (d.getFullYear() !== year || d.getMonth() !== month0) continue
    if (r.revenueType === RevenueType.BaseSalary) nb += r.conventionalHours
    else po += r.conventionalHours
    count += 1
  }
  return {
    nb: Math.round(nb * 10) / 10,
    po: Math.round(po * 10) / 10,
    total: Math.round((nb + po) * 10) / 10,
    records: count,
  }
}

export function recordActualHours(record: DailyActivityRecord): number {
  const start = new Date(record.startDate)
  const end = new Date(record.endDate)
  const ms = end.getTime() - start.getTime()
  return ms > 0 ? ms / (60 * 60 * 1000) : 0
}
