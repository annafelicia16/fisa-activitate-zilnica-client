import { Badge } from "@/components/ui/badge"
import { MonthlySheetStatus } from "@/api/daily-activity-records"

interface StatusBadgeProps {
  status: MonthlySheetStatus | "Draft" | "Submitted" | "Approved"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const code =
    typeof status === "string"
      ? status
      : status === MonthlySheetStatus.Approved
        ? "Approved"
        : status === MonthlySheetStatus.Submitted
          ? "Submitted"
          : "Draft"

  if (code === "Approved") {
    return (
      <Badge variant="approved" dot>
        Aprobată
      </Badge>
    )
  }
  if (code === "Submitted") {
    return (
      <Badge variant="submitted" dot>
        Trimisă
      </Badge>
    )
  }
  return (
    <Badge variant="draft" dot>
      Ciornă
    </Badge>
  )
}
