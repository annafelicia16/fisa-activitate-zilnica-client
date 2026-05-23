import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ExternalTeacher } from "@/api/external-teachers"

export interface TeacherHeader {
  teacherName: string
  department: string
  academicYear: string
}

export interface TeacherState extends TeacherHeader {
  externalTeacherId: number | null
  email: string | null
  fullName: string | null
  setHeader: (header: Partial<TeacherHeader>) => void
  setFromExternalTeacher: (teacher: ExternalTeacher) => void
  reset: () => void
}

const INITIAL_STATE = {
  teacherName: "",
  department: "",
  academicYear: "",
  externalTeacherId: null as number | null,
  email: null as string | null,
  fullName: null as string | null,
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
      reset: () => set(INITIAL_STATE),
    }),
    { name: "daily-activity-header" },
  ),
)
