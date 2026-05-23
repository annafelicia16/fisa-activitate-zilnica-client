import { format } from "date-fns"
import {
  RevenueType,
  type DailyActivityRecord,
} from "@/api/daily-activity-records"
import { recordActualHours } from "@/api/types"
import type { TeacherScheduleSlot } from "@/api/schedules"
import { conventionalHours } from "@/utils/activity"
import { ymd } from "@/utils/dates"
import type { ActivityFormData } from "./ActivityRecordForm"

export const EMPTY_FORM: ActivityFormData = {
  date: "",
  time: "",
  faculty: "",
  studyProgram: "",
  year: "",
  group: "",
  subgroup: "",
  subject: "",
  activityType: "Curs",
  room: "",
  revenue: "NB",
  actualHours: "",
  conventionalHours: "",
  observations: "",
  activitySlotId: null,
}

export function seedForm(date: Date, teacherDept: string): ActivityFormData {
  return { ...EMPTY_FORM, date: ymd(date), faculty: teacherDept }
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
    group: record.groupName,
    subgroup: record.subgroupName ?? "",
    subject: record.subjectName,
    activityType: record.courseType,
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
  const kind = slot.oldActivityTag || slot.courseTypeTag || "Curs"
  const duration = slot.duration && slot.duration > 0 ? slot.duration : 1
  const conv = conventionalHours(duration, kind)
  const startHourMatch = slot.hourName.match(/^(\d{1,2})(?::(\d{2}))?/)
  const time = startHourMatch
    ? `${startHourMatch[1].padStart(2, "0")}:${(startHourMatch[2] ?? "00").padStart(2, "0")}`
    : ""
  const friendlyGroup = slot.grupa?.split(",")[0]?.trim() ?? ""
  return {
    ...prev,
    time,
    faculty: slot.facultateName || prev.faculty,
    studyProgram: slot.specializareName || prev.studyProgram,
    year: slot.nrAnStudii != null ? String(slot.nrAnStudii) : prev.year,
    group: friendlyGroup || slot.idGrupa || prev.group,
    subgroup: "",
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
    courseType: form.activityType || "Other",
    year: parseInt(form.year, 10) || 0,
    groupName: form.group,
    subgroupName: form.subgroup || null,
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
