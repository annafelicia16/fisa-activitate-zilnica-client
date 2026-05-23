import { ArrowRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MONTHS_RO, fmtDateShort } from "@/utils/dates"
import type { SupplementaryActivity } from "@/api/supplementary-activities"

interface SupplementaryMiniCardProps {
  year: number
  month: number
  entries: SupplementaryActivity[]
  onOpen: () => void
}

export function SupplementaryMiniCard({
  year,
  month,
  entries,
  onOpen,
}: SupplementaryMiniCardProps) {
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const monthTotal = monthEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0)
  const recent = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">Anexă complementară</CardTitle>
        <Badge>{MONTHS_RO[month]}</Badge>
      </CardHeader>
      <div className="px-[18px] py-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-muted">
            Ore complementare luna curentă
          </span>
          <span className="tnum text-[22px] font-semibold tracking-[-0.02em]">
            {monthTotal.toFixed(1)}
            <small className="ml-1 text-[13px] font-medium text-text-muted">ore</small>
          </span>
        </div>
        <div className="my-3.5 h-px bg-border" />
        <div className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <div className="text-[12px] text-text-muted">
              Nicio activitate complementară înregistrată.
            </div>
          ) : (
            recent.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5">
                <div className="w-12 flex-none font-mono text-[11px] whitespace-nowrap text-text-muted">
                  {fmtDateShort(new Date(s.date))}
                </div>
                <div className="grow truncate text-[12.5px]">{s.activityType}</div>
                <div className="flex-none font-mono tnum text-[12px] whitespace-nowrap text-text-muted">
                  {s.totalHours.toFixed(1)} h
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <CardFooter>
        <span className="text-[11.5px] text-text-faint">
          {entries.length} activități înregistrate
        </span>
        <div className="flex-1" />
        <Button variant="default" onClick={onOpen}>
          Deschide anexa <ArrowRightIcon className="size-3" />
        </Button>
      </CardFooter>
    </Card>
  )
}
