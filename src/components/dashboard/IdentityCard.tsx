import { Card } from "@/components/ui/card"
import { useTeacherStore } from "@/store/teacher"

interface IdentityCardProps {
  facultyName?: string
}

function MetaCell({
  label,
  value,
  mono,
  sub,
}: {
  label: string
  value: string
  mono?: boolean
  sub?: string
}) {
  return (
    <div className="flex min-w-[88px] flex-none flex-col gap-0.5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-text-muted">
        {label}
      </div>
      <div className={`whitespace-nowrap text-[12.5px] font-medium ${mono ? "font-mono tnum" : ""}`}>
        {value || "—"}
      </div>
      {sub && <div className="max-w-[220px] text-[11px] leading-tight text-text-faint">{sub}</div>}
    </div>
  )
}

function initialsOf(name: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return (first + last).toUpperCase() || "—"
}

export function IdentityCard({ facultyName }: IdentityCardProps) {
  const teacher = useTeacherStore()
  const initials = initialsOf(teacher.fullName)
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-6 px-[18px] py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid size-[38px] place-items-center rounded-full bg-brand text-[14px] font-semibold tracking-[-0.01em] text-brand-foreground">
            {initials}
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">{teacher.fullName || "—"}</div>
            <div className="text-[11.5px] text-text-muted">{teacher.email || "—"}</div>
          </div>
        </div>
        <div className="min-w-3 flex-1" />
        <MetaCell label="Departament" value={teacher.department || "—"} />
        {facultyName && <MetaCell label="Facultate" value={facultyName} />}
        <MetaCell label="An universitar" value={teacher.academicYear || "—"} mono />
      </div>
    </Card>
  )
}
