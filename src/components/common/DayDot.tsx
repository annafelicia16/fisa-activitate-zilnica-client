import { cn } from "@/lib/utils"

export type DayDotStatus =
  | "complete"
  | "complete-no-obs"
  | "partial"
  | "missing"
  | "future"
  | "none"

interface DayDotProps {
  status: DayDotStatus
  size?: number
  className?: string
}

const STYLE: Record<DayDotStatus, string> = {
  complete: "bg-st-approved",
  "complete-no-obs": "bg-st-approved outline outline-2 outline-st-approved-soft",
  partial: "bg-st-submitted",
  missing: "bg-st-warning",
  future: "bg-st-empty opacity-50",
  none: "bg-transparent border border-dashed border-border-strong",
}

export function DayDot({ status, size = 9, className }: DayDotProps) {
  return (
    <span
      aria-hidden
      className={cn("inline-block rounded-full", STYLE[status], className)}
      style={{ width: size, height: size }}
    />
  )
}
