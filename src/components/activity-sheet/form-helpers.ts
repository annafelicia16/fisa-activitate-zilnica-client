import { format } from "date-fns"
import {
  RevenueType,
  type DailyActivityRecord,
} from "@/api/daily-activity-records"
import { recordActualHours } from "@/api/types"
import type { TeacherScheduleSlot } from "@/api/schedules"
import {
  conventionalHours,
  normalizeActivityType,
  type ActivityKind,
} from "@/utils/activity"
import { ymd } from "@/utils/dates"
import { displayGroup, isWholeClassGroup } from "@/utils/group"
import { formatSlotStartTime } from "@/utils/slot"
import type { ActivityFormData } from "./ActivityRecordForm"

// Normalize incoming activity strings (FET tags, legacy courseType values like
// "Lab", "Lecture", or even "Other") into one of the four canonical kinds the
// form's segmented control can highlight. Defaults to "Curs" so we never leave
// the segmented in an "untouched" state.
function canonicalKind(value: string | null | undefined): Exclude<ActivityKind, "Other"> {
  const k = normalizeActivityType(value)
  return k === "Other" ? "Curs" : k
}

export const EMPTY_FORM: ActivityFormData = {
  date: "",
  time: "",
  faculty: "",
  studyProgram: "",
  year: "",
  group: "",
  subject: "",
  activityType: "Curs",
  room: "",
  revenue: "NB",
  actualHours: "",
  conventionalHours: "",
  observations: "",
  activitySlotId: null,
}

// Pre-selected faculty for new records. Must byte-match the AGSIS
// dbo.Facultate.Denumire (SEAA) so the cascade recognizes it as a selected
// option and unlocks the specialization field.
export const DEFAULT_FACULTY = "Facultatea de Științe economice și administrarea afacerilor"

export function seedForm(date: Date): ActivityFormData {
  return { ...EMPTY_FORM, date: ymd(date), faculty: DEFAULT_FACULTY }
}

export function recordToForm(record: DailyActivityRecord): ActivityFormData {
  const start = new Date(record.startDate)
  const actual = recordActualHours(record)
  return {
    date: format(start, "yyyy-MM-dd"),
    time: format(start, "HH:mm"),
    faculty: record.facultyName,
    studyProgram: record.studyProgram,
    year: String(record.year),
    group: displayGroup(record.groupName),
    subject: record.subjectName,
    activityType: canonicalKind(record.courseType),
    room: record.roomName,
    revenue: record.revenueType === RevenueType.BaseSalary ? "NB" : "PO",
    actualHours: actual ? actual.toString() : "",
    conventionalHours: record.conventionalHours.toString(),
    observations: record.observations ?? "",
    activitySlotId: record.activitySlotId,
  }
}

export function slotToForm(
  prev: ActivityFormData,
  slot: TeacherScheduleSlot,
): ActivityFormData {
  const kind = canonicalKind(slot.oldActivityTag || slot.courseTypeTag)
  const duration = slot.duration && slot.duration > 0 ? slot.duration : 1
  const conv = conventionalHours(duration, kind)
  const time = formatSlotStartTime(slot.hourName) ?? ""
  // Group preference: backend-resolved AGSIS dbo.Grupe.Nume ("8MF141") wins.
  // Slots without one where idGrupa is the whole-class sentinel ("-1"/null)
  // are lectures — their FET text is a series label ("MK1"), not a group, so
  // they map to "-" (toată seria) and match the cascade's whole-class option.
  // Anything else falls back to the FET name / raw external id.
  const fetGroup = slot.grupa?.split(",")[0]?.trim() ?? ""
  const group = slot.grupaName
    ? displayGroup(slot.grupaName)
    : isWholeClassGroup(slot.idGrupa)
      ? "-"
      : displayGroup(fetGroup || slot.idGrupa || prev.group)
  return {
    ...prev,
    time,
    faculty: slot.facultateName || prev.faculty,
    studyProgram: slot.specializareName || prev.studyProgram,
    year: slot.nrAnStudii != null ? String(slot.nrAnStudii) : prev.year,
    group,
    subject: slot.materieName || slot.subjectName || prev.subject,
    activityType: kind,
    room: slot.roomName ?? prev.room,
    actualHours: duration.toString(),
    conventionalHours: conv.toString(),
    revenue: slot.plataNB === 1 ? "NB" : slot.plataNB === 0 ? "PO" : prev.revenue,
    activitySlotId: slot.slotId,
  }
}

// Schedule times are wall-clock for the university (a 08:00 lecture is 08:00
// in Romania, not 06:00 UTC). The StartDate column is a naked DATETIME with no
// timezone — serialize as a naive ISO string (no Z, no offset) so the stored
// hour matches what the schedule shows.
function toNaiveIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

export function formToPayload(
  form: ActivityFormData,
  teacherId: number,
  dept: string,
) {
  const startNaive = `${form.date}T${form.time || "00:00"}:00`
  const start = new Date(startNaive)
  const actualHours = parseFloat(form.actualHours || "0") || 0
  const end = new Date(start.getTime() + actualHours * 60 * 60 * 1000)
  const conv = parseFloat(form.conventionalHours || "0") || 0
  return {
    externalTeacherId: teacherId,
    departmentName: dept || form.faculty || "",
    facultyName: form.faculty,
    studyProgram: form.studyProgram,
    courseType: form.activityType,
    year: parseInt(form.year, 10) || 0,
    groupName: form.group,
    subjectName: form.subject,
    roomName: form.room,
    revenueType: form.revenue === "NB" ? RevenueType.BaseSalary : RevenueType.HourlyPay,
    conventionalHours: conv,
    observations: form.observations || null,
    startDate: startNaive,
    endDate: toNaiveIso(end),
    activitySlotId: form.activitySlotId,
  }
}
