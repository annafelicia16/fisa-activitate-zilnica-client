import { cn } from "@/lib/utils"
import { normalizeActivityType, type ActivityKind } from "@/utils/activity"

const STYLE: Record<ActivityKind, string> = {
  Curs: "text-[oklch(0.50_0.14_265)] bg-[oklch(0.95_0.04_265)]",
  Seminar: "text-[oklch(0.50_0.13_195)] bg-[oklch(0.94_0.04_195)]",
  Laborator: "text-[oklch(0.50_0.13_155)] bg-[oklch(0.94_0.04_155)]",
  Proiect: "text-[oklch(0.55_0.13_30)] bg-[oklch(0.95_0.04_30)]",
  Other: "text-text-muted bg-surface-2",
}

interface ActivityTagProps {
  type: string | null | undefined
  className?: string
}

export function ActivityTag({ type, className }: ActivityTagProps) {
  const kind = normalizeActivityType(type)
  const label = kind === "Other" ? (type?.trim() || "—") : kind
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-full px-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.01em]",
        STYLE[kind],
        className,
      )}
    >
      {label}
    </span>
  )
}
