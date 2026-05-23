import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions } from "@tanstack/react-query"
import { apiClient } from "./client"

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

export const dailyActivityRecordKeys = {
  all: ["daily-activity-records"] as const,
  byId: (id: string) => [...dailyActivityRecordKeys.all, "by-id", id] as const,
  query: (params: QueryDailyActivityRecordsParams) =>
    [...dailyActivityRecordKeys.all, "query", params] as const,
  monthlySummary: (teacherId: number) =>
    [...dailyActivityRecordKeys.all, "monthly-summary", teacherId] as const,
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

export function useCreateDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRecord,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dailyActivityRecordKeys.all })
    },
  })
}

export function useUpdateDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateRecord,
    onSuccess: (record) => {
      qc.setQueryData(dailyActivityRecordKeys.byId(record.id), record)
      void qc.invalidateQueries({ queryKey: dailyActivityRecordKeys.all })
    },
  })
}

export function useDeleteDailyActivityRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dailyActivityRecordKeys.all })
    },
  })
}
