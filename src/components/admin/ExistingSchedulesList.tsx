import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import type { ScheduleSummary } from "@/api/schedules"

interface ExistingSchedulesListProps {
  schedules: ScheduleSummary[] | undefined
  loading?: boolean
  error?: boolean
}

function fmtDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : format(d, "dd.MM.yyyy")
}

export function ExistingSchedulesList({
  schedules,
  loading,
  error,
}: ExistingSchedulesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orare existente</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="px-4 py-6 text-[12.5px] text-text-muted">Se încarcă…</div>
      ) : error ? (
        <div className="px-4 py-6 text-[12.5px] text-st-warning">
          Nu am putut încărca orarele.
        </div>
      ) : !schedules || schedules.length === 0 ? (
        <div className="px-4 py-6 text-[12.5px] text-text-muted">
          Lista orarelor importate va apărea aici după primul import.
        </div>
      ) : (
        <div>
          {schedules.map((s) => (
            <div
              key={s.id}
              className="border-t border-border px-4 py-3 first:border-t-0"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[13px] font-medium">{s.name}</span>
                <Badge variant={s.oddWeek ? "submitted" : "accent"}>
                  {s.oddWeek ? "săptămâna impară" : "săptămâna pară"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-[11.5px] text-text-muted">
                <span className="font-mono">#{s.id}</span>
                <span>
                  An {s.year}–{s.year + 1} · Sem. {s.semester}
                </span>
                <span className="text-text-faint">
                  {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
