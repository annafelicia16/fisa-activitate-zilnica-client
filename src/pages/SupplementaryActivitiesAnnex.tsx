import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Toast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Breadcrumb } from "@/components/common/Breadcrumb"
import { SupplementaryCalendar } from "@/components/supplementary/SupplementaryCalendar"
import { SupplementaryEntriesList } from "@/components/supplementary/SupplementaryEntriesList"
import {
  SupplementaryActivityForm,
  type SupplementaryFormData,
} from "@/components/supplementary/SupplementaryActivityForm"
import { SUPP_TYPES } from "@/components/supplementary/supp-types"
import { SupplementarySummary } from "@/components/supplementary/SupplementarySummary"
import {
  useCreateSupplementaryActivity,
  useDeleteSupplementaryActivity,
  useSupplementaryActivities,
  useUpdateSupplementaryActivity,
  type SupplementaryActivity,
} from "@/api/supplementary-activities"
import { useTeacherStore } from "@/store/teacher"
import { MONTHS_RO, shiftMonth, ymd } from "@/utils/dates"
import { exportSupplementaryAnnexPdf } from "@/utils/pdfSupplementary"

const EMPTY_FORM: SupplementaryFormData = {
  date: "",
  type: SUPP_TYPES[0],
  hours: "",
  observations: "",
}

function seedForm(date: Date): SupplementaryFormData {
  return { ...EMPTY_FORM, date: ymd(date) }
}

function entryToForm(entry: SupplementaryActivity): SupplementaryFormData {
  return {
    date: format(new Date(entry.date), "yyyy-MM-dd"),
    type: entry.activityType,
    hours: entry.totalHours.toString(),
    observations: entry.observations ?? "",
  }
}

export function SupplementaryActivitiesAnnex() {
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
  const [form, setForm] = useState<SupplementaryFormData>(() => seedForm(today))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: entries = [] } = useSupplementaryActivities({
    teacherId: externalTeacherId,
  })
  const createMutation = useCreateSupplementaryActivity()
  const updateMutation = useUpdateSupplementaryActivity()
  const deleteMutation = useDeleteSupplementaryActivity()
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const entriesByDate = useMemo(() => {
    const map = new Map<string, SupplementaryActivity[]>()
    for (const e of entries) {
      const key = ymd(new Date(e.date))
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return map
  }, [entries])

  const hoursByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      const key = ymd(new Date(e.date))
      map.set(key, (map.get(key) ?? 0) + (e.totalHours || 0))
    }
    return map
  }, [entries])

  const dayEntries = entriesByDate.get(form.date) ?? []

  function updateForm(patch: Partial<SupplementaryFormData>) {
    setForm((prev) => ({ ...prev, ...patch }))
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
    setForm(seedForm(date))
    setEditingId(null)
    setDirty(false)
  }

  function handleEdit(entry: SupplementaryActivity) {
    setForm(entryToForm(entry))
    setEditingId(entry.id)
    setDirty(false)
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
    setForm(seedForm(selectedDate))
    setEditingId(null)
    setDirty(false)
  }

  async function handleSave() {
    if (!externalTeacherId) return
    const hours = parseFloat(form.hours || "0") || 0
    if (hours <= 0) {
      setToast("Introduceți un număr de ore valid.")
      return
    }
    const isoDate = new Date(`${form.date}T00:00:00`).toISOString()
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          date: isoDate,
          activityType: form.type,
          observations: form.observations || null,
          totalHours: hours,
        })
        setToast("Activitate actualizată.")
      } else {
        await createMutation.mutateAsync({
          externalTeacherId,
          date: isoDate,
          activityType: form.type,
          observations: form.observations || null,
          totalHours: hours,
        })
        setToast("Activitate salvată.")
      }
      setForm(seedForm(selectedDate))
      setEditingId(null)
      setDirty(false)
    } catch {
      setToast("Eroare la salvare.")
    }
  }

  async function handleDelete() {
    if (!editingId) return
    if (
      !(await confirm({
        title: "Ștergeți activitatea?",
        description: "Această activitate complementară va fi ștearsă definitiv.",
        confirmLabel: "Șterge",
        variant: "destructive",
      }))
    )
      return
    try {
      await deleteMutation.mutateAsync(editingId)
      setForm(seedForm(selectedDate))
      setEditingId(null)
      setDirty(false)
      setToast("Activitate ștearsă.")
    } catch {
      setToast("Eroare la ștergere.")
    }
  }

  async function handleExport() {
    await exportSupplementaryAnnexPdf({
      entries,
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
          { label: "Anexă activități complementare" },
        ]}
        right={
          <Badge>
            {MONTHS_RO[calMonth.month]} {calMonth.year}
          </Badge>
        }
      />
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4 px-6 pb-2 pt-[18px]">
        <div className="flex flex-col gap-3.5">
          <SupplementaryCalendar
            year={calMonth.year}
            month={calMonth.month}
            selected={selectedDate}
            hoursByDate={hoursByDate}
            onPrev={() => setCalMonth((m) => shiftMonth(m, -1))}
            onNext={() => setCalMonth((m) => shiftMonth(m, +1))}
            onPickDate={pickDate}
          />
          <SupplementaryEntriesList
            date={selectedDate}
            entries={dayEntries}
            editingId={editingId}
            onEdit={handleEdit}
          />
        </div>
        <SupplementaryActivityForm
          state={form}
          dirty={dirty}
          editingId={editingId}
          saving={saving}
          onChange={updateForm}
          onNew={handleNew}
          onSave={handleSave}
          onDelete={editingId ? handleDelete : undefined}
          onExport={handleExport}
        />
      </div>
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-4 px-6 pb-6 pt-2">
        <SupplementarySummary
          year={calMonth.year}
          month={calMonth.month}
          entries={entries}
        />
      </div>

      <Toast open={toast !== null} onClose={() => setToast(null)}>
        ✓ {toast}
      </Toast>
    </div>
  )
}
