import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { DayDot, type DayDotStatus } from "@/components/common/DayDot"
import { cn } from "@/lib/utils"
import {
  DAY_SHORT_RO,
  MONTHS_RO,
  buildMonthCells,
  sameYmd,
  ymd,
} from "@/utils/dates"

interface ActivityCalendarProps {
  year: number
  month: number
  selected: Date
  today?: Date
  statusByDate: Map<string, DayDotStatus>
  onPrev: () => void
  onNext: () => void
  onPickDate: (date: Date) => void
}

const LEGEND: Array<{ status: DayDotStatus; label: string }> = [
  { status: "complete", label: "Completă" },
  { status: "partial", label: "Parțială" },
  { status: "missing", label: "Lipsă" },
  { status: "future", label: "Viitoare" },
  { status: "none", label: "Liber" },
]

export function ActivityCalendar({
  year,
  month,
  selected,
  today = new Date(),
  statusByDate,
  onPrev,
  onNext,
  onPickDate,
}: ActivityCalendarProps) {
  const cells = buildMonthCells(year, month)

  return (
    <Card>
      <CardHeader>
        <Button variant="ghost" size="icon-sm" aria-label="Lună anterioară" onClick={onPrev}>
          <ChevronLeftIcon className="size-3.5" />
        </Button>
        <div className="flex-1 text-center text-[13.5px]">
          <span className="font-semibold">{MONTHS_RO[month]}</span>{" "}
          <span className="tnum text-text-muted">{year}</span>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Lună următoare" onClick={onNext}>
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </CardHeader>
      <div className="p-2.5">
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {DAY_SHORT_RO.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[10.5px] font-medium uppercase tracking-[0.05em] text-text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />
            const key = ymd(d)
            const status = statusByDate.get(key) ?? "none"
            const isSel = sameYmd(d, selected)
            const isToday = sameYmd(d, today)
            const weekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPickDate(d)}
                className={cn(
                  "flex h-10 flex-col items-center justify-center gap-1 rounded-md font-mono text-[12px] font-medium tnum",
                  "border border-transparent",
                  isToday && !isSel && "bg-hover font-semibold",
                  isSel && "border-brand bg-brand-soft",
                  weekend && !isSel && "text-text-faint",
                )}
              >
                <span>{d.getDate()}</span>
                <DayDot status={status} size={6} />
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 border-t border-border px-1 pt-2.5">
          {LEGEND.map((l) => (
            <div
              key={l.status}
              className="flex items-center gap-1.5 text-[10.5px] text-text-muted"
            >
              <DayDot status={l.status} size={7} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
