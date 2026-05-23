import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  DAY_SHORT_RO,
  MONTHS_RO,
  buildMonthCells,
  sameYmd,
  ymd,
} from "@/utils/dates"

interface SupplementaryCalendarProps {
  year: number
  month: number
  selected: Date
  hoursByDate: Map<string, number>
  onPrev: () => void
  onNext: () => void
  onPickDate: (date: Date) => void
}

export function SupplementaryCalendar({
  year,
  month,
  selected,
  hoursByDate,
  onPrev,
  onNext,
  onPickDate,
}: SupplementaryCalendarProps) {
  const cells = buildMonthCells(year, month)
  return (
    <Card>
      <CardHeader>
        <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label="Lună anterioară">
          <ChevronLeftIcon className="size-3.5" />
        </Button>
        <div className="flex-1 text-center text-[13.5px]">
          <span className="font-semibold">{MONTHS_RO[month]}</span>{" "}
          <span className="tnum text-text-muted">{year}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Lună următoare">
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
            const hours = hoursByDate.get(key) ?? 0
            const isSel = sameYmd(d, selected)
            const weekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPickDate(d)}
                className={cn(
                  "flex h-[42px] flex-col items-center justify-center gap-0.5 rounded-md font-mono text-[12px] font-medium tnum",
                  "border border-transparent",
                  isSel && "border-brand bg-brand-soft",
                  weekend && !isSel && "text-text-faint",
                )}
              >
                <span>{d.getDate()}</span>
                {hours > 0 && (
                  <Badge variant="accent" className="h-[14px] px-1 text-[9.5px]">
                    {hours.toFixed(1)}h
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
