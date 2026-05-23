import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Toast } from "@/components/ui/toast"
import { Breadcrumb } from "@/components/common/Breadcrumb"
import type { DayDotStatus } from "@/components/common/DayDot"
import { ActivityCalendar } from "@/components/activity-sheet/ActivityCalendar"
import { EntriesForDateList } from "@/components/activity-sheet/EntriesForDateList"
import { ScheduledSlotsList } from "@/components/activity-sheet/ScheduledSlotsList"
import {
  ActivityRecordForm,
  type ActivityFormData,
} from "@/components/activity-sheet/ActivityRecordForm"
import { MonthlySummaryTable } from "@/components/activity-sheet/MonthlySummaryTable"
import {
  EMPTY_FORM,
  formToPayload,
  recordToForm,
  seedForm,
  slotToForm,
} from "@/components/activity-sheet/form-helpers"
import {
  useCreateDailyActivityRecord,
  useDailyActivityRecords,
  useDayStatuses,
  useUpdateDailyActivityRecord,
  type DailyActivityRecord,
  type DayStatus,
} from "@/api/daily-activity-records"
import { aggregateMonth } from "@/api/types"
import { useTeacherDaySlotsByDate, type TeacherScheduleSlot } from "@/api/schedules"
import { useSupplementaryActivities } from "@/api/supplementary-activities"
import { useTeacherStore } from "@/store/teacher"
import { MONTHS_RO, shiftMonth, ymd } from "@/utils/dates"
import { conventionalHours } from "@/utils/activity"
import { exportDailyActivitySheetPdf } from "@/utils/pdfDailySheet"

export function DailyActivitySheet() {
  const navigate = useNavigate()
  const teacher = useTeacherStore()
  const externalTeacherId = teacher.externalTeacherId ?? 0
  const today = useMemo(() => new Date(), [])

  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [calMonth, setCalMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [form, setForm] = useState<ActivityFormData>(() =>
    seedForm(today, teacher.department),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: records = [] } = useDailyActivityRecords({ teacherId: externalTeacherId })
  const { data: supplementaryEntries = [] } = useSupplementaryActivities({
    teacherId: externalTeacherId,
  })
  const { data: scheduleSlots = [], isLoading: slotsLoading } = useTeacherDaySlotsByDate(
    externalTeacherId && form.date ? { externalTeacherId, date: form.date } : undefined,
  )

  // Calendar status range covers the visible month plus a 1-week pad on each side
  // (so the leading/trailing days from neighbouring months still get a dot).
  const calRangeStart = useMemo(() => {
    const d = new Date(calMonth.year, calMonth.month, 1)
    d.setDate(d.getDate() - 7)
    return ymd(d)
  }, [calMonth.year, calMonth.month])
  const calRangeEnd = useMemo(() => {
    const d = new Date(calMonth.year, calMonth.month + 1, 0)
    d.setDate(d.getDate() + 7)
    return ymd(d)
  }, [calMonth.year, calMonth.month])
  const { data: dayStatuses = [] } = useDayStatuses(
    externalTeacherId
      ? { teacherId: externalTeacherId, startDate: calRangeStart, endDate: calRangeEnd }
      : undefined,
  )

  const createMutation = useCreateDailyActivityRecord()
  const updateMutation = useUpdateDailyActivityRecord()
  const saving = createMutation.isPending || updateMutation.isPending

  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailyActivityRecord[]>()
    for (const r of records) {
      const key = ymd(new Date(r.startDate))
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return map
  }, [records])

  const statusByDate = useMemo(() => {
    const map = new Map<string, DayDotStatus>()
    for (const entry of dayStatuses) {
      map.set(entry.day, apiStatusToDayDot(entry.status))
    }
    return map
  }, [dayStatuses])

  const dayEntries = recordsByDate.get(form.date) ?? []
  const monthAgg = aggregateMonth(records, calMonth.year, calMonth.month)

  function updateForm(patch: Partial<ActivityFormData>) {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if ("activityType" in patch || "actualHours" in patch) {
        const hours = parseFloat(next.actualHours || "0") || 0
        next.conventionalHours = conventionalHours(hours, next.activityType).toString()
      }
      return next
    })
    setDirty(true)
  }

  function pickDate(date: Date) {
    if (dirty && !window.confirm("Aveți modificări nesalvate. Schimbați data?")) return
    setSelectedDate(date)
    setForm(seedForm(date, teacher.department))
    setEditingId(null)
    setDirty(false)
  }

  function handleEditRecord(record: DailyActivityRecord) {
    setForm(recordToForm(record))
    setEditingId(record.id)
    setDirty(false)
  }

  function handleFillFromSlot(slot: TeacherScheduleSlot) {
    if (
      dirty &&
      !window.confirm("Aveți modificări nesalvate în formular. Înlocuiți cu această oră programată?")
    ) {
      return
    }
    setForm((prev) => slotToForm(prev, slot))
    setEditingId(null)
    setDirty(true)
  }

  async function handleSave() {
    if (!externalTeacherId) return
    const payload = formToPayload(form, externalTeacherId, teacher.department)
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload })
        setToast("Înregistrare actualizată.")
      } else {
        await createMutation.mutateAsync(payload)
        setToast("Înregistrare salvată.")
      }
      setDirty(false)
      setForm({ ...EMPTY_FORM, date: form.date, faculty: teacher.department })
      setEditingId(null)
    } catch {
      setToast("Eroare la salvare.")
    }
  }

  function handleNew() {
    if (dirty && !window.confirm("Aveți modificări nesalvate. Renunțați la ele?")) return
    setForm(seedForm(selectedDate, teacher.department))
    setEditingId(null)
    setDirty(false)
  }

  async function handleExport() {
    await exportDailyActivitySheetPdf({
      records,
      supplementary: supplementaryEntries,
      teacher: {
        fullName: teacher.fullName ?? teacher.teacherName ?? "",
        department: teacher.department ?? "",
        academicYear: teacher.academicYear ?? "",
      },
      year: calMonth.year,
      month: calMonth.month,
    })
  }

  return (
    <div className="w-full">
      <Breadcrumb
        crumbs={[
          { label: "Bord", onClick: () => navigate("/") },
          { label: "Fișa de activitate zilnică" },
        ]}
        right={
          <>
            <Badge variant="draft" dot>
              Ciornă
            </Badge>
            <span className="text-[11.5px] text-text-faint">
              {MONTHS_RO[calMonth.month]} {calMonth.year}
              {teacher.academicYear ? ` · ${teacher.academicYear}` : ""}
            </span>
          </>
        }
      />

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4 px-6 pb-2 pt-[18px]">
        <div className="flex flex-col gap-3.5">
          <ActivityCalendar
            year={calMonth.year}
            month={calMonth.month}
            selected={selectedDate}
            today={today}
            statusByDate={statusByDate}
            onPrev={() => setCalMonth((m) => shiftMonth(m, -1))}
            onNext={() => setCalMonth((m) => shiftMonth(m, +1))}
            onPickDate={pickDate}
          />
          <EntriesForDateList
            date={selectedDate}
            records={dayEntries}
            editingId={editingId}
            onEdit={handleEditRecord}
          />
          <ScheduledSlotsList
            date={selectedDate}
            slots={scheduleSlots}
            loading={slotsLoading}
            onFill={handleFillFromSlot}
          />
        </div>

        <ActivityRecordForm
          state={form}
          dirty={dirty}
          editingId={editingId}
          saving={saving}
          onChange={updateForm}
          onNew={handleNew}
          onSave={handleSave}
        />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-6 pb-6 pt-2">
        <MonthlySummaryTable
          year={calMonth.year}
          month={calMonth.month}
          summary={monthAgg}
          records={records}
          onExport={handleExport}
        />
      </div>

      <Toast open={toast !== null} onClose={() => setToast(null)}>
        ✓ {toast}
      </Toast>
    </div>
  )
}

function apiStatusToDayDot(status: DayStatus): DayDotStatus {
  switch (status) {
    case "completed":
      return "complete"
    case "partial":
      return "partial"
    case "missing":
      return "missing"
    case "future":
      return "future"
    case "free":
    default:
      return "none"
  }
}
