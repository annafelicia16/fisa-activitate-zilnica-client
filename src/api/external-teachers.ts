import { useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface ExternalTeacher {
  idProfesor: number
  nume: string
  prenume: string
  email: string | null
  cnp: string | null
}

export interface TeacherFaculty {
  idFacultate: number
  name: string
  shortName: string | null
}

export interface TeacherDepartment {
  idDepartament: number
  name: string
  shortName: string
}

export interface TeacherProfile {
  idProfesor: number
  nume: string
  prenume: string
  email: string | null
  cnp: string | null
  department: TeacherDepartment | null
  faculties: TeacherFaculty[]
  primaryFaculty: TeacherFaculty | null
  currentAcademicYear: string | null
  currentSemester: number | null
  currentSemesterStartDate: string | null
  currentSemesterEndDate: string | null
}

const RESOURCE = "/api/v1/ExternalTeachers"

export const externalTeacherKeys = {
  all: ["external-teachers"] as const,
  byEmail: (email: string) =>
    [...externalTeacherKeys.all, "by-email", email] as const,
  profile: (externalTeacherId: number) =>
    [...externalTeacherKeys.all, "profile", externalTeacherId] as const,
}

async function fetchByEmail(email: string): Promise<ExternalTeacher> {
  const { data } = await apiClient.get<ExternalTeacher>(
    `${RESOURCE}/by-email/${encodeURIComponent(email)}`,
  )
  return data
}

async function fetchProfile(externalTeacherId: number): Promise<TeacherProfile> {
  const { data } = await apiClient.get<TeacherProfile>(
    `${RESOURCE}/${externalTeacherId}/profile`,
  )
  return data
}

export async function lookupExternalTeacherByEmail(
  email: string,
): Promise<ExternalTeacher> {
  return fetchByEmail(email)
}

export async function lookupTeacherProfile(
  externalTeacherId: number,
): Promise<TeacherProfile> {
  return fetchProfile(externalTeacherId)
}

export function useExternalTeacherByEmail(email: string | undefined) {
  return useQuery({
    queryKey: externalTeacherKeys.byEmail(email ?? ""),
    queryFn: () => fetchByEmail(email as string),
    enabled: Boolean(email),
  })
}

export function useTeacherProfile(externalTeacherId: number | undefined) {
  return useQuery({
    queryKey: externalTeacherKeys.profile(externalTeacherId ?? 0),
    queryFn: () => fetchProfile(externalTeacherId as number),
    enabled: Boolean(externalTeacherId) && (externalTeacherId as number) > 0,
  })
}

export function teacherFullName(t: ExternalTeacher): string {
  return `${t.nume ?? ""} ${t.prenume ?? ""}`.trim()
}
