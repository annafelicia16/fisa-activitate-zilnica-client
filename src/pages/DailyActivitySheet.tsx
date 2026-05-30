import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
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
  useAutoFillDailyActivityRecords,
  useCreateDailyActivityRecord,
  useDailyActivityRecords,
  useDayStatuses,
  useUpdateDailyActivityRecord,
  type DailyActivityRecord,
  type DayStatus,
} from "@/api/daily-activity-records"
import { aggregateMonth } from "@/api/types"
import { useTeacherDaySlotsByDate, type TeacherScheduleSlot } from "@/api/schedules"
import { useDownloadMonthlyActivitySheet } from "@/api/export"
import { useTeacherStore } from "@/store/teacher"
import { MONTHS_RO, shiftMonth, ymd } from "@/utils/dates"
import { conventionalHours } from "@/utils/activity"

export function DailyActivitySheet() {
  const navigate = useNavigate()
  const confirm = useConfirm()
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
  const autoFillMutation = useAutoFillDailyActivityRecords()
  const exportMutation = useDownloadMonthlyActivitySheet()
  const saving = createMutation.isPending || updateMutation.isPending

  // Auto-fill targets the displayed calendar month: from the 1st to the last day,
  // but never past today (a past month fills entirely; the current month fills up
  // to today; a month wholly in the future has nothing to do).
  const monthFirst = useMemo(
    () => new Date(calMonth.year, calMonth.month, 1),
    [calMonth.year, calMonth.month],
  )
  const monthLast = useMemo(
    () => new Date(calMonth.year, calMonth.month + 1, 0),
    [calMonth.year, calMonth.month],
  )
  const autoFillEnd = monthLast < today ? monthLast : today
  const isFutureMonth = monthFirst > today

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

  async function pickDate(date: Date) {
    if (
      dirty &&
      !(await confirm({
        title: "Modificări nesalvate",
        description: "Schimbați data? Modificările din formular se vor pierde.",
        confirmLabel: "Schimbă data",
      }))
    )
      return
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

  async function handleFillFromSlot(slot: TeacherScheduleSlot) {
    if (
      dirty &&
      !(await confirm({
        title: "Modificări nesalvate",
        description:
          "Înlocuiți formularul curent cu această oră programată? Modificările nesalvate se vor pierde.",
        confirmLabel: "Înlocuiește",
      }))
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

  async function handleNew() {
    if (
      dirty &&
      !(await confirm({
        title: "Modificări nesalvate",
        description: "Renunțați la modificările din formular?",
        confirmLabel: "Renunță",
      }))
    )
      return
    setForm(seedForm(selectedDate, teacher.department))
    setEditingId(null)
    setDirty(false)
  }

  async function handleAutoFill() {
    if (!externalTeacherId || autoFillMutation.isPending || isFutureMonth) return
    const confirmed = await confirm({
      title: `Completează ${MONTHS_RO[calMonth.month]} automat`,
      description: `Se vor genera automat înregistrările lipsă din orar pentru ${MONTHS_RO[calMonth.month]} ${calMonth.year}, până azi. Înregistrările existente nu sunt modificate.`,
      confirmLabel: "Completează",
    })
    if (!confirmed) return
    try {
      const result = await autoFillMutation.mutateAsync({
        externalTeacherId,
        startDate: ymd(monthFirst),
        endDate: ymd(autoFillEnd),
        departmentName: teacher.department || null,
      })
      if (result.createdCount === 0) {
        setToast(
          result.skippedCount > 0
            ? `Nimic de completat · ${result.skippedCount} ore programate nu au putut fi completate automat.`
            : "Toate orele programate sunt deja înregistrate.",
        )
      } else {
        setToast(
          `${result.createdCount} înregistrări completate automat` +
            (result.skippedCount > 0 ? ` · ${result.skippedCount} omise` : "") +
            ".",
        )
      }
    } catch {
      setToast("Eroare la completarea automată.")
    }
  }

  function handleExport() {
    if (!externalTeacherId || exportMutation.isPending) return
    exportMutation.mutate(
      { teacherId: externalTeacherId, year: calMonth.year, month: calMonth.month + 1 },
      {
        onSuccess: () => setToast("PDF generat."),
        onError: () => setToast("Eroare la generarea PDF-ului."),
      },
    )
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
          <Button
            variant="default"
            className="w-full"
            onClick={handleAutoFill}
            disabled={autoFillMutation.isPending || isFutureMonth || !externalTeacherId}
            title={
              isFutureMonth
                ? "Luna selectată este în viitor."
                : `Generează automat înregistrările lipsă din ${MONTHS_RO[calMonth.month]} ${calMonth.year} (până azi), pe baza orarului.`
            }
          >
            <CalendarCheckIcon className="size-3.5" />
            {autoFillMutation.isPending
              ? "Se completează…"
              : `Completează ${MONTHS_RO[calMonth.month]} Automat`}
          </Button>
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
          exportDisabled={exportMutation.isPending}
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
