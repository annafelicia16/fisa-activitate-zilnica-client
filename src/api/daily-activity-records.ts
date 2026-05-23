import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import { apiClient } from "./client"
import { scheduleKeys } from "./schedules"

export const RevenueType = {
  BaseSalary: 0,
  HourlyPay: 1,
} as const
export type RevenueType = (typeof RevenueType)[keyof typeof RevenueType]

export const ActivityType = {
  RegularHours: 0,
  OvertimeHours: 1,
} as const
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

export const MonthlySheetStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
} as const
export type MonthlySheetStatus = (typeof MonthlySheetStatus)[keyof typeof MonthlySheetStatus]

export interface DailyActivityRecord {
  id: string
  externalTeacherId: number
  departmentName: string
  facultyName: string
  studyProgram: string
  courseType: string
  year: number
  groupName: string
  subgroupName: string | null
  subjectName: string
  roomName: string
  revenueType: RevenueType
  activityType: ActivityType
  conventionalHours: number
  observations: string | null
  startDate: string
  endDate: string
  activitySlotId: number | null
}

export interface CreateDailyActivityRecordPayload {
  externalTeacherId: number
  departmentName: string
  facultyName: string
  studyProgram: string
  courseType: string
  year: number
  groupName: string
  subgroupName?: string | null
  subjectName: string
  roomName: string
  revenueType: RevenueType
  activityType?: ActivityType
  conventionalHours: number
  observations?: string | null
  startDate: string
  endDate: string
  activitySlotId?: number | null
}

export interface UpdateDailyActivityRecordPayload {
  id: string
  departmentName?: string | null
  facultyName?: string | null
  studyProgram?: string | null
  courseType?: string | null
  year?: number | null
  groupName?: string | null
  subgroupName?: string | null
  subjectName?: string | null
  roomName?: string | null
  revenueType?: RevenueType | null
  activityType?: ActivityType | null
  conventionalHours?: number | null
  observations?: string | null
  startDate?: string | null
  endDate?: string | null
  activitySlotId?: number | null
}

export interface MonthlyActivitySummary {
  year: number
  month: number
  recordCount: number
  totalConventionalHours: number
  status: MonthlySheetStatus
}

export interface QueryDailyActivityRecordsParams {
  teacherId: number
  departmentName?: string
  year?: number
  groupName?: string
  subgroupName?: string
  subjectName?: string
  roomName?: string
  revenueType?: RevenueType
  activityType?: ActivityType
  startDate?: string
  endDate?: string
}

const RESOURCE = "/api/DailyActivityRecords"

export type DayStatus = "free" | "future" | "missing" | "partial" | "completed"

export interface DayStatusEntry {
  day: string
  status: DayStatus
}

export interface QueryDayStatusesParams {
  teacherId: number
  startDate: string
  endDate: string
}

export const dailyActivityRecordKeys = {
  all: ["daily-activity-records"] as const,
  byId: (id: string) => [...dailyActivityRecordKeys.all, "by-id", id] as const,
  query: (params: QueryDailyActivityRecordsParams) =>
    [...dailyActivityRecordKeys.all, "query", params] as const,
  monthlySummary: (teacherId: number) =>
    [...dailyActivityRecordKeys.all, "monthly-summary", teacherId] as const,
  dayStatuses: (params: QueryDayStatusesParams) =>
    [...dailyActivityRecordKeys.all, "day-statuses", params] as const,
}

async function fetchById(id: string): Promise<DailyActivityRecord> {
  const { data } = await apiClient.get<DailyActivityRecord>(`${RESOURCE}/get-by-id/${id}`)
  return data
}

async function fetchQuery(
  params: QueryDailyActivityRecordsParams,
): Promise<DailyActivityRecord[]> {
  const { data } = await apiClient.get<DailyActivityRecord[]>(`${RESOURCE}/query`, { params })
  return data
}

async function createRecord(
  payload: CreateDailyActivityRecordPayload,
): Promise<DailyActivityRecord> {
  const { data } = await apiClient.post<DailyActivityRecord>(`${RESOURCE}/create`, payload)
  return data
}

async function updateRecord(
  payload: UpdateDailyActivityRecordPayload,
): Promise<DailyActivityRecord> {
  const { data } = await apiClient.put<DailyActivityRecord>(`${RESOURCE}/update`, payload)
  return data
}

async function deleteRecord(id: string): Promise<void> {
  await apiClient.delete(`${RESOURCE}/delete/${id}`)
}

async function fetchMonthlySummary(teacherId: number): Promise<MonthlyActivitySummary[]> {
  const { data } = await apiClient.get<MonthlyActivitySummary[]>(
    `${RESOURCE}/monthly-summary`,
    { params: { teacherId } },
  )
  return data
}

async function fetchDayStatuses(
  params: QueryDayStatusesParams,
): Promise<DayStatusEntry[]> {
  const { data } = await apiClient.get<DayStatusEntry[]>(`${RESOURCE}/day-statuses`, {
    params,
  })
  return data
}

export function useDayStatuses(params: QueryDayStatusesParams | undefined) {
  const safe = params ?? { teacherId: 0, startDate: "", endDate: "" }
  return useQuery({
    queryKey: dailyActivityRecordKeys.dayStatuses(safe),
    queryFn: () => fetchDayStatuses(safe),
    enabled:
      Boolean(params) &&
      Number.isFinite(params?.teacherId) &&
      (params?.teacherId ?? 0) > 0 &&
      Boolean(params?.startDate) &&
      Boolean(params?.endDate),
  })
}

export function useMonthlyActivitySummary(teacherId: number | undefined) {
  return useQuery({
    queryKey: dailyActivityRecordKeys.monthlySummary(teacherId ?? 0),
    queryFn: () => fetchMonthlySummary(teacherId as number),
    enabled: Boolean(teacherId) && (teacherId as number) > 0,
  })
}

export function useDailyActivityRecord(
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<DailyActivityRecord, Error, DailyActivityRecord, ReturnType<typeof dailyActivityRecordKeys.byId>>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  return useQuery({
    queryKey: dailyActivityRecordKeys.byId(id ?? ""),
    queryFn: () => fetchById(id as string),
    enabled: Boolean(id),
    ...options,
  })
}

export function useDailyActivityRecords(params: QueryDailyActivityRecordsParams) {
  return useQuery({
    queryKey: dailyActivityRecordKeys.query(params),
    queryFn: () => fetchQuery(params),
    enabled: Number.isFinite(params.teacherId) && params.teacherId > 0,
  })
}

// Records and the schedule's "available slots" view depend on each other: once a
// record exists for a (subject, hour) on a date the backend removes that slot
// from the scheduled-today list. Every record mutation has to invalidate both
// sides so the calendar dots and slot list update without a manual refresh.
function invalidateRecordCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: dailyActivityRecordKeys.all })
  void qc.invalidateQueries({ queryKey: scheduleKeys.all })
}

export function useCreateDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRecord,
    onSuccess: () => invalidateRecordCaches(qc),
  })
}

export function useUpdateDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRecord,
    onSuccess: (record) => {
      qc.setQueryData(dailyActivityRecordKeys.byId(record.id), record)
      invalidateRecordCaches(qc)
    },
  })
}

export function useDeleteDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      invalidateRecordCaches(qc)
    },
  })
}
