import { PlusIcon, SaveIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { Textarea } from "@/components/ui/textarea"
import { Affix, AffixInput, InputAffix } from "@/components/ui/input-affix"
import { Field } from "@/components/common/Field"
import { Pill } from "@/components/common/Pill"
import {
  ACTIVITY_KINDS,
  activityMultiplier,
  type ActivityKind,
} from "@/utils/activity"
import { fmtDateInput } from "@/utils/dates"
import { useTeacherStore } from "@/store/teacher"

export interface ActivityFormData {
  date: string
  time: string
  faculty: string
  studyProgram: string
  year: string
  group: string
  subgroup: string
  subject: string
  activityType: string
  room: string
  revenue: "NB" | "PO"
  actualHours: string
  conventionalHours: string
  observations: string
  // FK back to the scheduled slot this record satisfies (null for ad-hoc).
  // Set when the user fills the form from "Programat", carried through edits,
  // and posted to the API so the backend can drop completed slots cleanly.
  activitySlotId: number | null
}

interface ActivityRecordFormProps {
  state: ActivityFormData
  dirty: boolean
  editingId: string | null
  saving?: boolean
  onChange: (patch: Partial<ActivityFormData>) => void
  onNew: () => void
  onSave: () => void
}

function HeaderRow({ state, onChange }: { state: ActivityFormData; onChange: ActivityRecordFormProps["onChange"] }) {
  return (
    <div className="grid grid-cols-[160px_140px_1fr] gap-3">
      <Field label="Data" required>
        <Input
          className="font-mono"
          value={fmtDateInput(state.date)}
          readOnly
        />
      </Field>
      <Field label="Oră (opțional)">
        <Input
          className="font-mono"
          placeholder="HH:MM"
          value={state.time}
          onChange={(e) => onChange({ time: e.target.value })}
        />
      </Field>
      <Field label="Regim plată" required>
        <Segmented<"NB" | "PO">
          value={state.revenue}
          onChange={(v) => onChange({ revenue: v })}
          options={[
            { value: "NB", label: "NB · Normă de bază" },
            { value: "PO", label: "PO · Plata cu ora" },
          ]}
        />
      </Field>
    </div>
  )
}

function FacultyRow({
  state,
  onChange,
}: {
  state: ActivityFormData
  onChange: ActivityRecordFormProps["onChange"]
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_90px_1fr] gap-3">
      <Field label="Facultate" required>
        <Input
          value={state.faculty}
          onChange={(e) => onChange({ faculty: e.target.value })}
          placeholder="FIESC"
        />
      </Field>
      <Field label="Program de studii" required>
        <Input
          value={state.studyProgram}
          onChange={(e) => onChange({ studyProgram: e.target.value })}
          placeholder="Calculatoare"
        />
      </Field>
      <Field label="An" required>
        <Input
          value={state.year}
          onChange={(e) => onChange({ year: e.target.value })}
          placeholder="II"
        />
      </Field>
      <Field label="Grupă / subgrupă" required>
        <InputAffix>
          <AffixInput
            className="font-mono"
            placeholder="3211"
            value={state.group}
            onChange={(e) => onChange({ group: e.target.value })}
          />
          <AffixInput
            className="font-mono border-l border-border max-w-[60px]"
            placeholder="A"
            value={state.subgroup}
            onChange={(e) => onChange({ subgroup: e.target.value })}
          />
        </InputAffix>
      </Field>
    </div>
  )
}

function SubjectRow({
  state,
  onChange,
}: {
  state: ActivityFormData
  onChange: ActivityRecordFormProps["onChange"]
}) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_0.7fr] gap-3">
      <Field label="Disciplina" required>
        <Input
          placeholder="Caută disciplină…"
          value={state.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
        />
      </Field>
      <Field label="Tip activitate" required>
        <Segmented<ActivityKind | "Other">
          fullWidth
          value={(ACTIVITY_KINDS as readonly string[]).includes(state.activityType)
            ? (state.activityType as ActivityKind)
            : "Other"}
          onChange={(v) =>
            onChange({ activityType: v === "Other" ? state.activityType : v })
          }
          options={ACTIVITY_KINDS.map((k) => ({ value: k, label: k }))}
        />
      </Field>
      <Field label="Sală" required>
        <Input
          className="font-mono"
          placeholder="ex. L302"
          value={state.room}
          onChange={(e) => onChange({ room: e.target.value })}
        />
      </Field>
    </div>
  )
}

function HoursRow({
  state,
  onChange,
}: {
  state: ActivityFormData
  onChange: ActivityRecordFormProps["onChange"]
}) {
  const mult = activityMultiplier(state.activityType)
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Ore efective" required>
        <InputAffix>
          <AffixInput
            type="number"
            step="0.5"
            className="font-mono tnum"
            value={state.actualHours}
            onChange={(e) => onChange({ actualHours: e.target.value })}
          />
          <Affix>h</Affix>
        </InputAffix>
      </Field>
      <Field label="Multiplicator">
        <InputAffix>
          <Affix side="left">×</Affix>
          <AffixInput
            className="font-mono tnum"
            readOnly
            tabIndex={-1}
            value={mult.toFixed(1)}
          />
        </InputAffix>
      </Field>
      <Field label="Ore convenționale" required>
        <InputAffix>
          <AffixInput
            type="number"
            step="0.5"
            className="font-mono tnum"
            value={state.conventionalHours}
            onChange={(e) => onChange({ conventionalHours: e.target.value })}
          />
          <Affix>h conv.</Affix>
        </InputAffix>
      </Field>
    </div>
  )
}

export function ActivityRecordForm({
  state,
  dirty,
  editingId,
  saving,
  onChange,
  onNew,
  onSave,
}: ActivityRecordFormProps) {
  const teacher = useTeacherStore()
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex-1">
          {editingId ? "Editare înregistrare" : "Înregistrare nouă"}
        </CardTitle>
        {editingId && (
          <span className="font-mono text-[11px] text-text-muted">#{editingId.slice(0, 8)}</span>
        )}
        {dirty && <Badge variant="warn">modificat</Badge>}
        <Button variant="ghost" size="sm" onClick={onNew}>
          <PlusIcon className="size-3" /> Nouă
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3.5">
        <div className="grid grid-cols-3 gap-3 rounded-[--r-md] border border-border bg-surface-2 px-3 py-2.5">
          <Pill label="Cadru didactic" value={teacher.fullName || teacher.teacherName || "—"} />
          <Pill label="Departament" value={teacher.department || "—"} />
          <Pill label="An universitar" value={teacher.academicYear || "—"} mono />
        </div>

        <HeaderRow state={state} onChange={onChange} />
        <FacultyRow state={state} onChange={onChange} />
        <SubjectRow state={state} onChange={onChange} />
        <HoursRow state={state} onChange={onChange} />

        <Field label="Observații">
          <Textarea
            value={state.observations}
            placeholder="Notă scurtă (opțional). Recapitulare, examen parțial, schimbare orar, etc."
            onChange={(e) => onChange({ observations: e.target.value })}
          />
        </Field>
      </CardContent>

      <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-4 py-3">
        <Button variant="primary" onClick={onSave} disabled={saving}>
          <SaveIcon className="size-3" />
          {saving ? "Se salvează…" : "Salvează"}
        </Button>
      </div>
    </Card>
  )
}
