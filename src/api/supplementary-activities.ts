import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface SupplementaryActivity {
  id: string
  externalTeacherId: number
  date: string
  activityType: string
  observations: string | null
  totalHours: number
}

export interface CreateSupplementaryActivityPayload {
  externalTeacherId: number
  date: string
  activityType: string
  observations?: string | null
  totalHours: number
}

export interface UpdateSupplementaryActivityPayload {
  id: string
  date?: string | null
  activityType?: string | null
  observations?: string | null
  totalHours?: number | null
}

export interface QuerySupplementaryActivitiesParams {
  teacherId: number
  startDate?: string
  endDate?: string
}

const RESOURCE = "/api/SupplementaryActivities"

export const supplementaryActivityKeys = {
  all: ["supplementary-activities"] as const,
  byId: (id: string) => [...supplementaryActivityKeys.all, "by-id", id] as const,
  query: (params: QuerySupplementaryActivitiesParams) =>
    [...supplementaryActivityKeys.all, "query", params] as const,
}

async function fetchById(id: string): Promise<SupplementaryActivity> {
  const { data } = await apiClient.get<SupplementaryActivity>(`${RESOURCE}/get-by-id/${id}`)
  return data
}

async function fetchQuery(
  params: QuerySupplementaryActivitiesParams,
): Promise<SupplementaryActivity[]> {
  const { data } = await apiClient.get<SupplementaryActivity[]>(`${RESOURCE}/query`, {
    params,
  })
  return data
}

async function createActivity(
  payload: CreateSupplementaryActivityPayload,
): Promise<SupplementaryActivity> {
  const { data } = await apiClient.post<SupplementaryActivity>(`${RESOURCE}/create`, payload)
  return data
}

async function updateActivity(
  payload: UpdateSupplementaryActivityPayload,
): Promise<SupplementaryActivity> {
  const { data } = await apiClient.put<SupplementaryActivity>(`${RESOURCE}/update`, payload)
  return data
}

async function deleteActivity(id: string): Promise<void> {
  await apiClient.delete(`${RESOURCE}/delete/${id}`)
}

export function useSupplementaryActivity(id: string | undefined) {
  return useQuery({
    queryKey: supplementaryActivityKeys.byId(id ?? ""),
    queryFn: () => fetchById(id as string),
    enabled: Boolean(id),
  })
}

export function useSupplementaryActivities(params: QuerySupplementaryActivitiesParams) {
  return useQuery({
    queryKey: supplementaryActivityKeys.query(params),
    queryFn: () => fetchQuery(params),
    enabled: Number.isFinite(params.teacherId) && params.teacherId > 0,
  })
}

export function useCreateSupplementaryActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplementaryActivityKeys.all })
    },
  })
}

export function useUpdateSupplementaryActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateActivity,
    onSuccess: (activity) => {
      qc.setQueryData(supplementaryActivityKeys.byId(activity.id), activity)
      void qc.invalidateQueries({ queryKey: supplementaryActivityKeys.all })
    },
  })
}

export function useDeleteSupplementaryActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplementaryActivityKeys.all })
    },
  })
}
