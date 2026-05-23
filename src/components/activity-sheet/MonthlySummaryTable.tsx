import { DownloadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/common/KPI"
import { ActivityTag } from "@/components/common/ActivityTag"
import { MONTHS_RO } from "@/utils/dates"
import { ACTIVITY_KINDS, activityMultiplier, normalizeActivityType } from "@/utils/activity"
import { RevenueType, type DailyActivityRecord } from "@/api/daily-activity-records"
import type { MonthAggregate } from "@/api/types"

interface MonthlySummaryTableProps {
  year: number
  month: number
  summary: MonthAggregate
  records: DailyActivityRecord[]
  onExport?: () => void
}

export function MonthlySummaryTable({
  year,
  month,
  summary,
  records,
  onExport,
}: MonthlySummaryTableProps) {
  const totals = ACTIVITY_KINDS.reduce<Record<string, { nb: number; po: number; count: number }>>(
    (acc, k) => {
      acc[k] = { nb: 0, po: 0, count: 0 }
      return acc
    },
    {},
  )
  for (const r of records) {
    const d = new Date(r.startDate)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const kind = normalizeActivityType(r.courseType)
    const bucket = totals[kind] ?? (totals[kind] = { nb: 0, po: 0, count: 0 })
    if (r.revenueType === RevenueType.BaseSalary) bucket.nb += r.conventionalHours
    else bucket.po += r.conventionalHours
    bucket.count += 1
  }
  for (const k of Object.keys(totals)) {
    totals[k].nb = Math.round(totals[k].nb * 10) / 10
    totals[k].po = Math.round(totals[k].po * 10) / 10
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">
          Centralizator lună · {MONTHS_RO[month]} {year}
        </CardTitle>
        <Badge variant="accent">Ciornă</Badge>
        {onExport && (
          <Button variant="default" size="sm" onClick={onExport}>
            <DownloadIcon className="size-3" /> Exportă centralizator
          </Button>
        )}
      </CardHeader>
      <div className="grid grid-cols-4 border-b border-border">
        <KPI label="Norma de bază (NB)" value={summary.nb} unit="ore conv." />
        <KPI label="Plata cu ora (PO)" value={summary.po} unit="ore conv." separator />
        <KPI label="Total convenționale" value={summary.total} unit="ore" separator accent />
        <KPI label="Înregistrări" value={summary.records} unit="rânduri" separator />
      </div>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-surface-2 text-[11px] font-medium uppercase tracking-[0.03em] text-text-muted">
            <th className="px-3 py-2.5 text-left">Tip activitate</th>
            <th className="px-3 py-2.5 text-right">Multiplicator</th>
            <th className="px-3 py-2.5 text-right">Înregistrări</th>
            <th className="px-3 py-2.5 text-right">NB · convenționale</th>
            <th className="px-3 py-2.5 text-right">PO · convenționale</th>
            <th className="px-3 py-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {ACTIVITY_KINDS.map((k) => {
            const v = totals[k]
            return (
              <tr key={k} className="border-t border-border hover:bg-hover">
                <td className="px-3 py-2.5">
                  <ActivityTag type={k} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono tnum">
                  {activityMultiplier(k).toFixed(1)}×
                </td>
                <td className="px-3 py-2.5 text-right font-mono tnum">{v.count}</td>
                <td className="px-3 py-2.5 text-right font-mono tnum">
                  {v.nb > 0 ? v.nb.toFixed(1) : <span className="text-text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tnum">
                  {v.po > 0 ? v.po.toFixed(1) : <span className="text-text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tnum font-semibold">
                  {(v.nb + v.po).toFixed(1)}
                </td>
              </tr>
            )
          })}
          <tr className="border-t border-border bg-surface-2 font-semibold">
            <td className="px-3 py-2.5">Total general</td>
            <td className="px-3 py-2.5 text-right text-text-faint">—</td>
            <td className="px-3 py-2.5 text-right font-mono tnum">{summary.records}</td>
            <td className="px-3 py-2.5 text-right font-mono tnum">{summary.nb.toFixed(1)}</td>
            <td className="px-3 py-2.5 text-right font-mono tnum">{summary.po.toFixed(1)}</td>
            <td className="px-3 py-2.5 text-right font-mono tnum font-bold text-brand">
              {summary.total.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}
