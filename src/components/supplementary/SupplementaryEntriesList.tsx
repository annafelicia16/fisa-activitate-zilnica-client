import { PaperclipIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtDateLong } from "@/utils/dates"
import { cn } from "@/lib/utils"
import type { SupplementaryActivity } from "@/api/supplementary-activities"

interface SupplementaryEntriesListProps {
  date: Date
  entries: SupplementaryActivity[]
  editingId: string | null
  onEdit: (entry: SupplementaryActivity) => void
}

export function SupplementaryEntriesList({
  date,
  entries,
  editingId,
  onEdit,
}: SupplementaryEntriesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">
          Înregistrări — <span className="font-medium">{fmtDateLong(date)}</span>
        </CardTitle>
        <Badge>{entries.length}</Badge>
      </CardHeader>
      {entries.length === 0 ? (
        <div className="px-4 py-4 text-center text-[12.5px] text-text-muted">
          Nicio activitate complementară în această zi.
        </div>
      ) : (
        entries.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onEdit(e)}
            className={cn(
              "block w-full border-t border-border px-3.5 py-2.5 text-left transition-colors",
              e.id === editingId ? "bg-brand-soft" : "hover:bg-hover",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-medium">{e.activityType}</span>
              {e.attachmentCount > 0 && (
                <span
                  title={`${e.attachmentCount} fișier${e.attachmentCount === 1 ? "" : "e"} atașat${e.attachmentCount === 1 ? "" : "e"}`}
                  className="flex shrink-0 items-center gap-0.5 text-[10.5px] text-text-muted"
                >
                  <PaperclipIcon className="size-2.5" />
                  {e.attachmentCount}
                </span>
              )}
              <span className="ml-auto font-mono tnum text-[12px]">
                {e.totalHours.toFixed(1)} h
              </span>
            </div>
            <div className="mt-1 truncate text-[11.5px] text-text-muted">
              {e.observations || <em className="text-text-faint">fără observații</em>}
            </div>
          </button>
        ))
      )}
    </Card>
  )
}
