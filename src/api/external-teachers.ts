import { useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface ExternalTeacher {
  idProfesor: number
  nume: string
  prenume: string
  email: string | null
  cnp: string | null
}

const RESOURCE = "/api/v1/ExternalTeachers"

export const externalTeacherKeys = {
  all: ["external-teachers"] as const,
  byEmail: (email: string) => [...externalTeacherKeys.all, "by-email", email] as const,
}

async function fetchByEmail(email: string): Promise<ExternalTeacher> {
  const { data } = await apiClient.get<ExternalTeacher>(
    `${RESOURCE}/by-email/${encodeURIComponent(email)}`,
  )
  return data
}

export function useExternalTeacherByEmail(email: string | undefined) {
  return useQuery({
    queryKey: externalTeacherKeys.byEmail(email ?? ""),
    queryFn: () => fetchByEmail(email as string),
    enabled: Boolean(email),
  })
}
