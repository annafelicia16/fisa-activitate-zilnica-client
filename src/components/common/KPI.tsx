import { cn } from "@/lib/utils"

interface KPIProps {
  label: string
  value: number | string
  unit?: string
  separator?: boolean
  accent?: boolean
  className?: string
}

export function KPI({ label, value, unit, separator, accent, className }: KPIProps) {
  const formatted =
    typeof value === "number"
      ? Number.isInteger(value)
        ? String(value)
        : value.toFixed(1)
      : value
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 px-[18px] py-[14px]",
        separator && "border-l border-border",
        className,
      )}
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-text-muted">
        {label}
      </div>
      <div
        className={cn(
          "tnum text-[26px] font-semibold tracking-[-0.02em]",
          accent ? "text-brand" : "text-foreground",
        )}
      >
        {formatted}
      </div>
      {unit && <div className="text-[11px] text-text-faint">{unit}</div>}
    </div>
  )
}
