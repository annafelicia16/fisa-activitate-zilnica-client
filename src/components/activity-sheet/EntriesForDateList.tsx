import { AlertTriangleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityTag } from "@/components/common/ActivityTag"
import { recordActualHours } from "@/api/types"
import type { DailyActivityRecord } from "@/api/daily-activity-records"
import { RevenueType } from "@/api/daily-activity-records"
import { fmtDateLong } from "@/utils/dates"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface EntriesForDateListProps {
  date: Date
  records: DailyActivityRecord[]
  editingId: string | null
  onEdit: (record: DailyActivityRecord) => void
}

export function EntriesForDateList({
  date,
  records,
  editingId,
  onEdit,
}: EntriesForDateListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">
          Înregistrări — <span className="font-medium">{fmtDateLong(date)}</span>
        </CardTitle>
        <Badge>{records.length}</Badge>
      </CardHeader>

      {records.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <div className="text-[12.5px] text-text-muted">
            Nicio înregistrare pentru această zi.
          </div>
          <div className="mt-1 text-[11.5px] text-text-faint">
            Selectați o oră programată mai jos pentru a precompleta formularul.
          </div>
        </div>
      ) : (
        <div>
          {records.map((r) => {
            const start = new Date(r.startDate)
            const time = format(start, "HH:mm")
            const actual = recordActualHours(r)
            const revenue = r.revenueType === RevenueType.BaseSalary ? "NB" : "PO"
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onEdit(r)}
                className={cn(
                  "block w-full border-t border-border px-3.5 py-2.5 text-left transition-colors",
                  r.id === editingId ? "bg-brand-soft" : "hover:bg-hover",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-text-muted">{time}</span>
                  <ActivityTag type={r.courseType} />
                  <span className="grow truncate text-[12.5px] font-medium">
                    {r.subjectName}
                  </span>
                  <span className="font-mono tnum text-[11.5px] font-medium">
                    {r.conventionalHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex gap-2 text-[11px] text-text-muted">
                  <span className="font-mono truncate">
                    {r.facultyName} · {r.studyProgram} · An {r.year} · Gr. {r.groupName}
                    {r.subgroupName ? `/${r.subgroupName}` : ""}
                  </span>
                  <span className="ml-auto whitespace-nowrap">
                    {r.roomName} · {revenue}
                    {actual ? ` · ${actual.toFixed(1)}h` : ""}
                  </span>
                </div>
                {(!r.observations || !r.observations.trim()) && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-st-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-st-warning">
                    <AlertTriangleIcon className="size-2.5" />
                    fără observații
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
