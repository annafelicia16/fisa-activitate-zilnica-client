import { ArrowRightIcon, ClipboardListIcon, DownloadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { KPI } from "@/components/common/KPI"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MONTHS_RO } from "@/utils/dates"
import type { MonthAggregate } from "@/api/types"

interface ThisMonthCardProps {
  year: number
  month: number
  summary: MonthAggregate
  status?: "Draft" | "Submitted" | "Approved"
  onOpen: () => void
  onDownloadPdf?: () => void
  downloadDisabled?: boolean
}

export function ThisMonthCard({
  year,
  month,
  summary,
  status = "Draft",
  onOpen,
  onDownloadPdf,
  downloadDisabled,
}: ThisMonthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">Luna curentă</CardTitle>
        <Badge variant="accent">
          {MONTHS_RO[month]} {year}
        </Badge>
        <StatusBadge status={status} />
      </CardHeader>
      <div className="grid grid-cols-4">
        <KPI label="Ore norma bază" value={summary.nb} unit="ore conv." />
        <KPI label="Ore plata cu ora" value={summary.po} unit="ore conv." separator />
        <KPI label="Total convenționale" value={summary.total} unit="ore" separator accent />
        <KPI label="Înregistrări" value={summary.records} unit="rânduri" separator />
      </div>
      <CardFooter>
        <span className="text-[12px] text-text-muted">
          {summary.records === 0
            ? "Nicio înregistrare luna aceasta. Începeți completarea."
            : `${summary.records} înregistrări totale · ${summary.total.toFixed(1)} ore convenționale.`}
        </span>
        <div className="flex-1" />
        {onDownloadPdf && (
          <Button variant="default" onClick={onDownloadPdf} disabled={downloadDisabled}>
            <DownloadIcon className="size-3" /> Descarcă PDF
          </Button>
        )}
        <Button variant="default" onClick={onOpen}>
          <ClipboardListIcon className="size-3" /> Deschide fișa zilnică{" "}
          <ArrowRightIcon className="size-3" />
        </Button>
      </CardFooter>
    </Card>
  )
}
