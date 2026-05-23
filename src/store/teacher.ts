import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ExternalTeacher, TeacherProfile } from "@/api/external-teachers"

export interface TeacherHeader {
  teacherName: string
  department: string
  academicYear: string
}

export interface TeacherState extends TeacherHeader {
  externalTeacherId: number | null
  email: string | null
  fullName: string | null
  facultyName: string | null
  facultyShortName: string | null
  currentSemester: number | null
  setHeader: (header: Partial<TeacherHeader>) => void
  setFromExternalTeacher: (teacher: ExternalTeacher) => void
  setFromProfile: (profile: TeacherProfile) => void
  reset: () => void
}

const INITIAL_STATE = {
  teacherName: "",
  department: "",
  academicYear: "",
  externalTeacherId: null as number | null,
  email: null as string | null,
  fullName: null as string | null,
  facultyName: null as string | null,
  facultyShortName: null as string | null,
  currentSemester: null as number | null,
}

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setHeader: (header) => set((s) => ({ ...s, ...header })),
      setFromExternalTeacher: (teacher) => {
        const fullName = `${teacher.nume ?? ""} ${teacher.prenume ?? ""}`.trim()
        set({
          externalTeacherId: Number(teacher.idProfesor),
          email: teacher.email ?? null,
          fullName,
          teacherName: fullName,
        })
      },
      setFromProfile: (profile) => {
        const fullName = `${profile.nume ?? ""} ${profile.prenume ?? ""}`.trim()
        set((prev) => ({
          ...prev,
          externalTeacherId: Number(profile.idProfesor),
          email: profile.email ?? prev.email,
          fullName,
          teacherName: fullName || prev.teacherName,
          // Prefer the active AGSIS department (dbo.DepartamentProfesor). Keep the
          // user-entered fallback when AGSIS has no assignment so we don't blank out
          // a manually-typed value.
          department:
            profile.department?.shortName ??
            profile.department?.name ??
            prev.department,
          facultyName: profile.primaryFaculty?.name ?? null,
          facultyShortName: profile.primaryFaculty?.shortName ?? null,
          academicYear: profile.currentAcademicYear ?? prev.academicYear,
          currentSemester: profile.currentSemester,
        }))
      },
      reset: () => set(INITIAL_STATE),
    }),
    { name: "daily-activity-header" },
  ),
)
