import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/common/KPI"
import { MONTHS_RO } from "@/utils/dates"
import type { SupplementaryActivity } from "@/api/supplementary-activities"
import { SUPP_TYPES } from "./supp-types"

interface SupplementarySummaryProps {
  year: number
  month: number
  entries: SupplementaryActivity[]
}

export function SupplementarySummary({ year, month, entries }: SupplementarySummaryProps) {
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const monthTotal = monthEntries.reduce((acc, e) => acc + (e.totalHours || 0), 0)
  const byType: Record<string, { hours: number; count: number }> = {}
  for (const e of monthEntries) {
    const bucket = byType[e.activityType] ?? (byType[e.activityType] = { hours: 0, count: 0 })
    bucket.hours += e.totalHours
    bucket.count += 1
  }
  const distinct = Object.keys(byType).length
  const visibleTypes = [
    ...SUPP_TYPES.filter((t) => byType[t]),
    ...Object.keys(byType).filter((t) => !SUPP_TYPES.includes(t)),
  ]

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex-1">
          Centralizator complementar · {MONTHS_RO[month]} {year}
        </CardTitle>
        <Badge>Total {monthTotal.toFixed(1)} h</Badge>
      </CardHeader>
      <div className="grid grid-cols-3 border-b border-border">
        <KPI label="Total ore" value={monthTotal} unit="ore complementare" accent />
        <KPI label="Activități" value={monthEntries.length} unit="înregistrări" separator />
        <KPI label="Categorii" value={distinct} unit="tipuri distincte" separator />
      </div>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-surface-2 text-[11px] font-medium uppercase tracking-[0.03em] text-text-muted">
            <th className="px-3 py-2.5 text-left">Tip activitate</th>
            <th className="px-3 py-2.5 text-right">Înregistrări</th>
            <th className="px-3 py-2.5 text-right">Total ore</th>
            <th className="px-3 py-2.5 text-left">Distribuție</th>
          </tr>
        </thead>
        <tbody>
          {visibleTypes.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                Nicio activitate complementară în această lună.
              </td>
            </tr>
          )}
          {visibleTypes.map((t) => {
            const v = byType[t]
            const pct = monthTotal > 0 ? Math.round((v.hours / monthTotal) * 100) : 0
            return (
              <tr key={t} className="border-t border-border hover:bg-hover">
                <td className="px-3 py-2.5 font-medium">{t}</td>
                <td className="px-3 py-2.5 text-right font-mono tnum">{v.count}</td>
                <td className="px-3 py-2.5 text-right font-mono tnum font-semibold">
                  {v.hours.toFixed(1)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 max-w-[200px] flex-1 overflow-hidden rounded-full border border-border bg-surface-2">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-9 font-mono tnum text-[11.5px] text-text-muted">{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
