import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface ScheduleSummary {
  id: number
  name: string
  year: number
  semester: number
  startDate: string
  endDate: string
  oddWeek: boolean
}

export interface TeacherScheduleSlot {
  slotId: number
  scheduleId: number
  activityId: number
  hourName: string
  dayName: string
  subjectName: string
  courseTypeTag: string | null
  roomName: string | null
  duration: number
  idProfesor: number | null
  idPlanmateriePrestator: number | null
  idFacultate: number | null
  idMetaspecializare: number | null
  nrAnStudii: number | null
  nrSemestruDinAn: number | null
  plataNB: number | null
  oldActivityTag: string | null
  idGrupa: string | null
  grupa: string | null
  idSpecializare: number
  idMaterie: number | null
  materieName: string | null
  materieShortName: string | null
  facultateName: string | null
  specializareName: string | null
}

export interface UploadScheduleResult {
  scheduleYearId: number
  scheduleSemesterId: number
  oddWeekScheduleId: number
  evenWeekScheduleId: number
}

export interface UploadSchedulePayload {
  oddWeekFile: File
  evenWeekFile: File
  name: string
  year: number
  semester: number
  startDate: string
  endDate: string
}

export interface TeacherDaySlotsParams {
  scheduleId: number
  dayName: string
  externalTeacherId: number
  externalSubjectId: number
}

export interface TeacherDaySlotsByDateParams {
  externalTeacherId: number
  date: string
}

const RESOURCE = "/api/v1/Schedules"

export const scheduleKeys = {
  all: ["schedules"] as const,
  byExternalTeacher: (externalTeacherId: number) =>
    [...scheduleKeys.all, "by-external-teacher", externalTeacherId] as const,
  teacherDaySlots: (params: TeacherDaySlotsParams) =>
    [...scheduleKeys.all, "teacher-day-slots", params] as const,
  teacherDaySlotsByDate: (params: TeacherDaySlotsByDateParams) =>
    [...scheduleKeys.all, "teacher-day-slots-by-date", params] as const,
}

async function fetchSchedulesByExternalTeacher(
  externalTeacherId: number,
): Promise<ScheduleSummary[]> {
  const { data } = await apiClient.get<ScheduleSummary[]>(
    `${RESOURCE}/by-external-teacher/${externalTeacherId}`,
  )
  return data
}

async function fetchTeacherDaySlots(
  params: TeacherDaySlotsParams,
): Promise<TeacherScheduleSlot[]> {
  const { data } = await apiClient.get<TeacherScheduleSlot[]>(`${RESOURCE}/slots`, { params })
  return data
}

async function fetchTeacherDaySlotsByDate(
  params: TeacherDaySlotsByDateParams,
): Promise<TeacherScheduleSlot[]> {
  const { data } = await apiClient.get<TeacherScheduleSlot[]>(
    `${RESOURCE}/teacher-day-slots-by-date`,
    { params },
  )
  return data
}

async function uploadSchedule(payload: UploadSchedulePayload): Promise<UploadScheduleResult> {
  const form = new FormData()
  form.append("OddWeekFile", payload.oddWeekFile)
  form.append("EvenWeekFile", payload.evenWeekFile)
  form.append("Name", payload.name)
  form.append("Year", String(payload.year))
  form.append("Semester", String(payload.semester))
  form.append("StartDate", payload.startDate)
  form.append("EndDate", payload.endDate)

  // FET imports parse two big XML files, hash the activities, and seed many
  // child tables — easily blows past the 30s axios default on a cold DB. Give
  // it the default plus an extra two minutes.
  const baseTimeout = apiClient.defaults.timeout ?? 30_000
  const { data } = await apiClient.post<UploadScheduleResult>(`${RESOURCE}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: baseTimeout + 2 * 60 * 1000,
  })
  return data
}

export function useSchedulesByExternalTeacher(externalTeacherId: number | undefined) {
  return useQuery({
    queryKey: scheduleKeys.byExternalTeacher(externalTeacherId ?? 0),
    queryFn: () => fetchSchedulesByExternalTeacher(externalTeacherId as number),
    enabled: Boolean(externalTeacherId),
  })
}

export function useTeacherDaySlots(params: TeacherDaySlotsParams | undefined) {
  return useQuery({
    queryKey: scheduleKeys.teacherDaySlots(
      params ?? { scheduleId: 0, dayName: "", externalTeacherId: 0, externalSubjectId: 0 },
    ),
    queryFn: () => fetchTeacherDaySlots(params as TeacherDaySlotsParams),
    enabled:
      Boolean(params) &&
      Number.isFinite(params?.scheduleId) &&
      Boolean(params?.dayName) &&
      Number.isFinite(params?.externalTeacherId) &&
      Number.isFinite(params?.externalSubjectId),
  })
}

export function useUploadSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadSchedule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.all })
    },
  })
}

export function useTeacherDaySlotsByDate(params: TeacherDaySlotsByDateParams | undefined) {
  const safeParams = params ?? { externalTeacherId: 0, date: "" }
  return useQuery({
    queryKey: scheduleKeys.teacherDaySlotsByDate(safeParams),
    queryFn: () => fetchTeacherDaySlotsByDate(safeParams),
    enabled:
      Boolean(params) &&
      Number.isFinite(params?.externalTeacherId) &&
      (params?.externalTeacherId ?? 0) > 0 &&
      Boolean(params?.date),
  })
}
