import { cn } from "@/lib/utils"

interface PillProps {
  label: string
  value: string
  mono?: boolean
  className?: string
}

export function Pill({ label, value, mono, className }: PillProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-px", className)}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-text-muted">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[12.5px] font-medium",
          mono && "font-mono tnum",
        )}
      >
        {value || "—"}
      </div>
    </div>
  )
}
