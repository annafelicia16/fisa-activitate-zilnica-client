import { DownloadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { MONTHS_RO } from "@/utils/dates"
import type { MonthlyActivitySummary } from "@/api/daily-activity-records"

interface PreviousMonthsCardProps {
  summaries: MonthlyActivitySummary[] | undefined
  loading?: boolean
  error?: boolean
  onDownloadPdf?: (year: number, month: number) => void
  downloadDisabled?: boolean
}

export function PreviousMonthsCard({
  summaries,
  loading,
  error,
  onDownloadPdf,
  downloadDisabled,
}: PreviousMonthsCardProps) {
  const rows = (summaries ?? []).slice().sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.month - a.month
  })
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex-1">Fișele lunare</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-text-muted">Se încarcă…</div>
      ) : error ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-st-warning">
          Nu am putut încărca istoricul lunilor.
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-text-muted">
          Nicio fișă în istoric.
        </div>
      ) : (
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-surface-2 text-[11px] font-medium uppercase tracking-[0.03em] text-text-muted">
              <th className="px-3 py-2.5 text-left" style={{ width: "30%" }}>
                Lună
              </th>
              <th className="px-3 py-2.5 text-right">Înregistrări</th>
              <th className="px-3 py-2.5 text-right">Total convenționale</th>
              <th className="px-3 py-2.5" style={{ width: 160 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={`${m.year}-${m.month}`} className="border-t border-border hover:bg-hover">
                <td className="px-3 py-2.5">
                  <span className="font-medium">{MONTHS_RO[m.month - 1]}</span>{" "}
                  <span className="font-mono tnum text-text-muted">{m.year}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono tnum">{m.recordCount}</td>
                <td className="px-3 py-2.5 text-right font-mono tnum font-semibold">
                  {m.totalConventionalHours.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {onDownloadPdf && (
                    <Button
                      variant="default"
                      onClick={() => onDownloadPdf(m.year, m.month)}
                      disabled={downloadDisabled}
                    >
                      <DownloadIcon className="size-3" /> Descarcă PDF
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
