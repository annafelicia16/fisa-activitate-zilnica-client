import { useEffect, useMemo, useState } from "react"
import { PlusIcon, SaveIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Segmented } from "@/components/ui/segmented"
import { Textarea } from "@/components/ui/textarea"
import { Affix, AffixInput, InputAffix } from "@/components/ui/input-affix"
import { Field } from "@/components/common/Field"
import { Pill } from "@/components/common/Pill"
import { RecordAttachmentsArea } from "@/components/activity-sheet/AttachmentsArea"
import { useFaculties } from "@/api/faculties"
import { useSpecializations } from "@/api/specializations"
import { useStudyYears, type StudyYear } from "@/api/study-years"
import { useGroups } from "@/api/groups"
import { useSubjects } from "@/api/subjects"
import { useRooms } from "@/api/rooms"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { ACTIVITY_KINDS, conventionalHours, type ActivityKind } from "@/utils/activity"
import { fmtDateInput } from "@/utils/dates"
import { foldName } from "@/utils/text"
import { useTeacherStore } from "@/store/teacher"

export interface ActivityFormData {
  date: string
  time: string
  faculty: string
  studyProgram: string
  year: string
  group: string
  subject: string
  // Always one of ACTIVITY_KINDS — slot/record loaders normalize unknown
  // strings (e.g. "Lab", "Laboratory") into the canonical Romanian kind so
  // the segmented control can highlight the selection.
  activityType: ActivityKind
  room: string
  revenue: "NB" | "PO"
  actualHours: string
  // Study cycle of the selected program ("Bachelor" | "Master" | "Doctorate"),
  // resolved from AGSIS and synced from the cascade. Drives the conventional-hours
  // multiplier; null when no program is selected / its cycle is unknown.
  studyCycle: string | null
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
  // Files picked but not yet uploaded — they live in page state (not form
  // state) and upload after the record is saved.
  pendingFiles: File[]
  onChange: (patch: Partial<ActivityFormData>) => void
  onNew: () => void
  onSave: () => void
  onAddFiles: (files: File[]) => void
  onRemovePendingFile: (index: number) => void
  onNotify: (message: string) => void
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

// Whole-class option for lecture records — matches displayGroup's collapsed "-".
const WHOLE_CLASS_OPTION: ComboboxOption = { value: "-", hint: "toată seria" }

interface FormCascade {
  facultyOptions: ComboboxOption[]
  programOptions: ComboboxOption[]
  studyYears: StudyYear[]
  groupOptions: ComboboxOption[]
  subjectOptions: ComboboxOption[]
  roomOptions: ComboboxOption[]
  facultySelected: boolean
  programSelected: boolean
  yearSelected: boolean
  groupSelected: boolean
  subjectSelected: boolean
  // Study cycle of the selected program ("Bachelor" | "Master" | "Doctorate"),
  // or null when no program is selected / its cycle is unknown.
  programCycle: string | null
  // Per-level "safe to auto-select a single option" flags: true only when the
  // option list is complete (no search filter) and not refetching, so a
  // transient filtered list can't lock in a value.
  facultyAutoSelect: boolean
  programAutoSelect: boolean
  groupAutoSelect: boolean
  subjectAutoSelect: boolean
  roomAutoSelect: boolean
  setFacultySearch: (q: string) => void
  setProgramSearch: (q: string) => void
  setGroupSearch: (q: string) => void
  setSubjectSearch: (q: string) => void
  setRoomSearch: (q: string) => void
  changeFaculty: (v: string) => void
  changeProgram: (v: string) => void
  changeYear: (v: string) => void
  changeGroup: (v: string) => void
  changeSubject: (v: string) => void
}

// AGSIS names arrive in several spellings (slot-cached variants vs canonical).
// When the current value isn't exactly an option but folds to one, replace it
// with the canonical spelling — it's the same entity, so downstream fields are
// deliberately NOT cleared.
function useSnapToCanonical(
  value: string,
  options: ComboboxOption[],
  apply: (canonical: string) => void,
) {
  useEffect(() => {
    const current = value.trim()
    if (!current || options.some((o) => o.value === current)) return
    const key = foldName(current)
    if (!key) return
    const canonical = options.find((o) => foldName(o.value) === key)
    if (canonical) apply(canonical.value)
  }, [value, options, apply])
}

// Drives the Facultate → Program → An → Grupă → Disciplină → Sală cascade:
// each level queries only values valid under the previous selections, counts
// as "selected" only when it matches a real option (free text doesn't unlock
// the next level), and changing any level clears everything after it. Search
// inputs are debounced before hitting the server (empty search → full list).
function useFormCascade(
  state: ActivityFormData,
  onChange: ActivityRecordFormProps["onChange"],
): FormCascade {
  const [facultySearch, setFacultySearch] = useState("")
  const [programSearch, setProgramSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")
  const [subjectSearch, setSubjectSearch] = useState("")
  const [roomSearch, setRoomSearch] = useState("")

  const debFacultySearch = useDebouncedValue(facultySearch, 300)
  const debProgramSearch = useDebouncedValue(programSearch, 300)
  const debGroupSearch = useDebouncedValue(groupSearch, 300)
  const debSubjectSearch = useDebouncedValue(subjectSearch, 300)
  const debRoomSearch = useDebouncedValue(roomSearch, 300)
  // Free typing in the faculty box updates state.faculty per keystroke —
  // debounce it before using it as the specializations filter.
  const debFaculty = useDebouncedValue(state.faculty, 300)

  const { data: faculties = [], isFetching: facultiesFetching } =
    useFaculties(debFacultySearch)
  const facultyOptions = useMemo<ComboboxOption[]>(
    () => faculties.map((f) => ({ value: f.name, hint: f.shortName ?? undefined })),
    [faculties],
  )
  useSnapToCanonical(state.faculty, facultyOptions, (v) => onChange({ faculty: v }))
  const facultySelected = facultyOptions.some((o) => o.value === state.faculty)

  const { data: specializations = [], isFetching: specsFetching } = useSpecializations(
    debFaculty,
    debProgramSearch,
  )
  const programOptions = useMemo<ComboboxOption[]>(
    () => specializations.map((s) => ({ value: s.name, hint: s.shortName ?? undefined })),
    [specializations],
  )
  useSnapToCanonical(state.studyProgram, programOptions, (v) =>
    onChange({ studyProgram: v }),
  )
  const programSelected =
    facultySelected && programOptions.some((o) => o.value === state.studyProgram)
  // Cycle is carried on the specialization record, matched by name to the selected
  // program. Null until a real program is picked (or its cycle is undetermined).
  const programCycle = useMemo<string | null>(
    () => specializations.find((s) => s.name === state.studyProgram)?.cycle ?? null,
    [specializations, state.studyProgram],
  )
  // Mirror the resolved cycle into form state so the saved payload can pick the
  // right conventional-hours multiplier. studyCycle-only patches don't dirty the
  // form (see updateForm), so this async resolution won't flag a loaded record.
  useEffect(() => {
    if (state.studyCycle !== programCycle) onChange({ studyCycle: programCycle })
  }, [programCycle, state.studyCycle, onChange])

  const { data: studyYears = [], isFetching: yearsFetching } = useStudyYears(
    programSelected ? state.faculty : "",
    programSelected ? state.studyProgram : "",
  )
  const yearSelected =
    programSelected && studyYears.some((y) => String(y.year) === state.year)

  // The year is a plain Select (no typing), so its single-option auto-pick
  // lives here; the comboboxes handle theirs internally.
  useEffect(() => {
    if (!programSelected || yearsFetching || state.year !== "") return
    if (studyYears.length !== 1) return
    onChange({ year: String(studyYears[0].year), group: "", subject: "", room: "" })
  }, [programSelected, yearsFetching, state.year, studyYears, onChange])

  const { data: groups = [], isFetching: groupsFetching } = useGroups(
    yearSelected ? state.faculty : "",
    yearSelected ? state.studyProgram : "",
    yearSelected ? state.year : "",
    debGroupSearch,
  )
  const groupOptions = useMemo<ComboboxOption[]>(
    () => [...groups.map((g) => ({ value: g.name })), WHOLE_CLASS_OPTION],
    [groups],
  )
  useSnapToCanonical(state.group, groupOptions, (v) => onChange({ group: v }))
  const groupSelected = yearSelected && groupOptions.some((o) => o.value === state.group)

  const { data: subjects = [], isFetching: subjectsFetching } = useSubjects(
    groupSelected ? state.faculty : "",
    groupSelected ? state.studyProgram : "",
    groupSelected ? state.year : "",
    groupSelected ? state.group : "",
    debSubjectSearch,
  )
  // The timetable caches subject names in mixed spellings — collapse fold-equal
  // variants to one option each.
  const subjectOptions = useMemo<ComboboxOption[]>(
    () => dedupeByFold(subjects.map((s) => s.name)),
    [subjects],
  )
  useSnapToCanonical(state.subject, subjectOptions, (v) => onChange({ subject: v }))
  const subjectSelected =
    groupSelected && subjectOptions.some((o) => o.value === state.subject)

  const { data: rooms = [], isFetching: roomsFetching } = useRooms(
    subjectSelected ? state.faculty : "",
    subjectSelected ? state.studyProgram : "",
    subjectSelected ? state.year : "",
    subjectSelected ? state.group : "",
    subjectSelected ? state.subject : "",
    debRoomSearch,
  )
  const roomOptions = useMemo<ComboboxOption[]>(
    () => dedupeByFold(rooms.map((r) => r.name)),
    [rooms],
  )
  useSnapToCanonical(state.room, roomOptions, (v) => onChange({ room: v }))

  return {
    facultyOptions,
    programOptions,
    studyYears,
    groupOptions,
    subjectOptions,
    roomOptions,
    facultySelected,
    programSelected,
    yearSelected,
    groupSelected,
    subjectSelected,
    programCycle,
    facultyAutoSelect: debFacultySearch === "" && !facultiesFetching,
    // debFaculty must have caught up with state.faculty — right after a faculty
    // change the spec list still belongs to the previous faculty.
    programAutoSelect:
      facultySelected &&
      debProgramSearch === "" &&
      debFaculty === state.faculty &&
      !specsFetching,
    groupAutoSelect: yearSelected && debGroupSearch === "" && !groupsFetching,
    subjectAutoSelect: groupSelected && debSubjectSearch === "" && !subjectsFetching,
    roomAutoSelect: subjectSelected && debRoomSearch === "" && !roomsFetching,
    setFacultySearch,
    setProgramSearch,
    setGroupSearch,
    setSubjectSearch,
    setRoomSearch,
    // Re-picking the identical value is a no-op; picking a fold-equal spelling
    // of the same entity just normalizes the text. Only a real change clears
    // the downstream fields.
    changeFaculty: (v) => {
      if (v === state.faculty) return
      if (foldName(v) && foldName(v) === foldName(state.faculty)) {
        onChange({ faculty: v })
        return
      }
      onChange({ faculty: v, studyProgram: "", year: "", group: "", subject: "", room: "" })
    },
    changeProgram: (v) => {
      if (v === state.studyProgram) return
      if (foldName(v) && foldName(v) === foldName(state.studyProgram)) {
        onChange({ studyProgram: v })
        return
      }
      onChange({ studyProgram: v, year: "", group: "", subject: "", room: "" })
    },
    changeYear: (v) => {
      if (v === state.year) return
      onChange({ year: v, group: "", subject: "", room: "" })
    },
    changeGroup: (v) => {
      if (v === state.group) return
      if (foldName(v) && foldName(v) === foldName(state.group)) {
        onChange({ group: v })
        return
      }
      onChange({ group: v, subject: "", room: "" })
    },
    changeSubject: (v) => {
      if (v === state.subject) return
      if (foldName(v) && foldName(v) === foldName(state.subject)) {
        onChange({ subject: v })
        return
      }
      onChange({ subject: v, room: "" })
    },
  }
}

function dedupeByFold(names: string[]): ComboboxOption[] {
  const seen = new Set<string>()
  const options: ComboboxOption[] = []
  for (const name of names) {
    const key = foldName(name) || name
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: name })
  }
  return options
}

function FacultyRow({
  state,
  cascade,
}: {
  state: ActivityFormData
  cascade: FormCascade
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_90px_1fr] gap-3">
      <Field label="Facultate" required>
        <Combobox
          value={state.faculty}
          options={cascade.facultyOptions}
          onChange={cascade.changeFaculty}
          onQueryChange={(q) => cascade.setFacultySearch(q ?? "")}
          autoSelectSingle={cascade.facultyAutoSelect}
          placeholder="FIESC"
        />
      </Field>
      <Field label="Program de studii" required>
        <Combobox
          value={state.studyProgram}
          options={cascade.programOptions}
          onChange={cascade.changeProgram}
          onQueryChange={(q) => cascade.setProgramSearch(q ?? "")}
          autoSelectSingle={cascade.programAutoSelect}
          placeholder={cascade.facultySelected ? "Calculatoare" : "Selectați facultatea"}
          disabled={!cascade.facultySelected}
        />
      </Field>
      <Field label="An" required>
        <Select
          value={state.year || undefined}
          onValueChange={cascade.changeYear}
          disabled={!cascade.programSelected}
        >
          <SelectTrigger>
            <SelectValue placeholder="II" />
          </SelectTrigger>
          <SelectContent>
            {cascade.studyYears.map((y) => (
              <SelectItem key={y.year} value={String(y.year)}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Grupă" required>
        <Combobox
          className="font-mono"
          value={state.group}
          options={cascade.groupOptions}
          onChange={cascade.changeGroup}
          onQueryChange={(q) => cascade.setGroupSearch(q ?? "")}
          autoSelectSingle={cascade.groupAutoSelect}
          placeholder={cascade.yearSelected ? "3211" : "Selectați anul"}
          disabled={!cascade.yearSelected}
        />
      </Field>
    </div>
  )
}

function SubjectRow({
  state,
  cascade,
  onChange,
}: {
  state: ActivityFormData
  cascade: FormCascade
  onChange: ActivityRecordFormProps["onChange"]
}) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_0.7fr] gap-3">
      <Field label="Disciplina" required>
        <Combobox
          value={state.subject}
          options={cascade.subjectOptions}
          onChange={cascade.changeSubject}
          onQueryChange={(q) => cascade.setSubjectSearch(q ?? "")}
          autoSelectSingle={cascade.subjectAutoSelect}
          placeholder={cascade.groupSelected ? "Caută disciplină…" : "Selectați grupa"}
          disabled={!cascade.groupSelected}
        />
      </Field>
      <Field label="Tip activitate" required>
        <Segmented<ActivityKind>
          fullWidth
          value={state.activityType}
          onChange={(v) => onChange({ activityType: v })}
          options={ACTIVITY_KINDS.map((k) => ({ value: k, label: k }))}
        />
      </Field>
      <Field label="Sală" required>
        <Combobox
          className="font-mono"
          value={state.room}
          options={cascade.roomOptions}
          onChange={(v) => onChange({ room: v })}
          onQueryChange={(q) => cascade.setRoomSearch(q ?? "")}
          autoSelectSingle={cascade.roomAutoSelect}
          placeholder={cascade.subjectSelected ? "ex. L302" : "Selectați disciplina"}
          disabled={!cascade.subjectSelected}
        />
      </Field>
    </div>
  )
}

// API cycle ("Bachelor" | "Master" | "Doctorate") → its Romanian pill label and
// colour. Anything unrecognised (incl. null when no program is selected) renders
// a neutral gray "None".
const CYCLE_PILLS: Record<string, { label: string; variant: "approved" | "accent" | "warn" }> = {
  Bachelor: { label: "Licență", variant: "approved" }, // green
  Master: { label: "Master", variant: "accent" }, // blue
  Doctorate: { label: "Doctorat", variant: "warn" }, // red
}

function HoursRow({
  state,
  onChange,
  cycle,
}: {
  state: ActivityFormData
  onChange: ActivityRecordFormProps["onChange"]
  cycle: string | null
}) {
  const pill = cycle ? CYCLE_PILLS[cycle] : undefined
  // Conventional hours is derived from the effective hours, activity type and
  // study cycle — shown read-only so it can't drift from the formula.
  const conv = conventionalHours(parseFloat(state.actualHours) || 0, state.activityType, cycle)
  return (
    <div className="flex items-start gap-4">
      <Field label="Ore efective" required>
        <InputAffix className="max-w-[100px]">
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
      <Field label="Ciclu">
        <div className="flex h-[var(--row-h)] items-center">
          <Badge variant={pill?.variant ?? "default"}>{pill?.label ?? "None"}</Badge>
        </div>
      </Field>
      <Field label="Ore convenționale">
        <div className="flex h-[var(--row-h)] items-center overflow-hidden rounded-[--r-md] border border-border bg-surface-2">
          <span className="px-2.5 font-mono tnum text-[13px] text-text-muted">
            {conv.toFixed(1)}
          </span>
          <span className="flex h-full items-center border-l border-border px-2.5 font-mono text-[11.5px] text-text-muted">
            h conv.
          </span>
        </div>
      </Field>
    </div>
  )
}

export function ActivityRecordForm({
  state,
  dirty,
  editingId,
  saving,
  pendingFiles,
  onChange,
  onNew,
  onSave,
  onAddFiles,
  onRemovePendingFile,
  onNotify,
}: ActivityRecordFormProps) {
  const teacher = useTeacherStore()
  const cascade = useFormCascade(state, onChange)
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
        <FacultyRow state={state} cascade={cascade} />
        <SubjectRow state={state} cascade={cascade} onChange={onChange} />
        <HoursRow state={state} onChange={onChange} cycle={cascade.programCycle} />

        <Field label="Observații">
          <Textarea
            value={state.observations}
            placeholder="Notă scurtă (opțional). Recapitulare, examen parțial, schimbare orar, etc."
            onChange={(e) => onChange({ observations: e.target.value })}
          />
        </Field>

        <RecordAttachmentsArea
          editingId={editingId}
          pendingFiles={pendingFiles}
          onAddFiles={onAddFiles}
          onRemovePending={onRemovePendingFile}
          onNotify={onNotify}
        />
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
