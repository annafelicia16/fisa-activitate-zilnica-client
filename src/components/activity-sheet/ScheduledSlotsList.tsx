import { PlusIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityTag } from "@/components/common/ActivityTag"
import { activityMultiplier } from "@/utils/activity"
import { fmtDateShort } from "@/utils/dates"
import type { TeacherScheduleSlot } from "@/api/schedules"

interface ScheduledSlotsListProps {
  date: Date
  slots: TeacherScheduleSlot[]
  loading?: boolean
  onFill: (slot: TeacherScheduleSlot) => void
}

function describeSlot(slot: TeacherScheduleSlot) {
  const subject = slot.materieName || slot.subjectName || "Curs"
  const meta = [
    slot.specializareName,
    slot.nrAnStudii != null ? `An ${slot.nrAnStudii}` : null,
    slot.grupa ? `Gr. ${slot.grupa.split(",")[0]?.trim()}` : null,
    slot.roomName,
  ]
    .filter(Boolean)
    .join(" · ")
  return { subject, meta }
}

function activityKindOf(slot: TeacherScheduleSlot): string {
  return slot.oldActivityTag || slot.courseTypeTag || "Curs"
}

function slotConventionalHours(slot: TeacherScheduleSlot): number {
  const duration = slot.duration && slot.duration > 0 ? slot.duration : 1
  return Math.round(duration * activityMultiplier(activityKindOf(slot)) * 10) / 10
}

export function ScheduledSlotsList({ date, slots, loading, onFill }: ScheduledSlotsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Programat azi</CardTitle>
        </CardHeader>
        <div className="px-4 py-4 text-[12.5px] text-text-muted">Se încarcă orarul…</div>
      </Card>
    )
  }
  if (slots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Programat azi</CardTitle>
        </CardHeader>
        <div className="px-4 py-4 text-[12.5px] text-text-muted">
          Nicio oră programată rămasă de înregistrat.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">Programat — {fmtDateShort(date)}</CardTitle>
        <Badge>{slots.length} ore</Badge>
        <span className="ml-2 text-[11px] text-text-muted">click pentru a precompleta</span>
      </CardHeader>
      <div>
        {slots.map((slot) => {
          const kind = activityKindOf(slot)
          const conv = slotConventionalHours(slot)
          const { subject, meta } = describeSlot(slot)
          return (
            <button
              key={`${slot.slotId}-${slot.activityId}`}
              type="button"
              onClick={() => onFill(slot)}
              className="grid w-full grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-left transition-colors hover:bg-hover"
            >
              <span className="w-16 font-mono text-[11px] text-text-muted">{slot.hourName}</span>
              <ActivityTag type={kind} />
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-medium">{subject}</div>
                <div className="truncate text-[11px] text-text-muted">{meta}</div>
              </div>
              <span className="font-mono tnum text-[11.5px]">{conv.toFixed(1)}h</span>
              <span className="grid h-5 w-5 place-items-center rounded-[--r-sm] border border-border bg-card text-text-muted">
                <PlusIcon className="size-3" />
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
