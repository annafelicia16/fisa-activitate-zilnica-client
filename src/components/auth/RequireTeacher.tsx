import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useTeacherStore } from "@/store/teacher"

interface RequireTeacherProps {
  children: ReactNode
}

export function RequireTeacher({ children }: RequireTeacherProps) {
  const externalTeacherId = useTeacherStore((s) => s.externalTeacherId)

  if (!externalTeacherId) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
