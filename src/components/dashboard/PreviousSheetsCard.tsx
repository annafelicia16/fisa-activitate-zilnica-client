import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    MonthlySheetStatus,
    useMonthlyActivitySummary,
    type MonthlyActivitySummary,
} from "@/api/daily-activity-records"
import { useTeacherStore } from "@/store/teacher"

interface PreviousSheetsCardProps {
    className?: string
}

const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

const STATUS_LABELS: Record<MonthlySheetStatus, string> = {
    [MonthlySheetStatus.Draft]: "In progress",
    [MonthlySheetStatus.Submitted]: "Submitted",
    [MonthlySheetStatus.Approved]: "Approved",
}

const STATUS_STYLES: Record<MonthlySheetStatus, string> = {
    [MonthlySheetStatus.Draft]: "bg-[#f0f2f7] text-[#333]",
    [MonthlySheetStatus.Submitted]: "bg-[#fff4ce] text-[#b37a00]",
    [MonthlySheetStatus.Approved]: "bg-[#d7fbe0] text-[#1a7f3f]",
}

export function PreviousSheetsCard({ className }: PreviousSheetsCardProps) {
    const externalTeacherId = useTeacherStore((s) => s.externalTeacherId)
    const { data, isLoading, isError } = useMonthlyActivitySummary(externalTeacherId ?? undefined)

    return (
        <Card className={cn("rounded-2xl p-6 gap-0 shadow-sm", className)}>
            <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base font-semibold">
                    My Previous Sheets
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0">
                    View and manage your submitted activity sheets
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-3">
                <div className="mt-3">
                    {isLoading ? (
                        <div className="text-sm text-gray-500 py-3">Loading…</div>
                    ) : isError ? (
                        <div className="text-sm text-red-600 py-3">
                            Failed to load monthly sheets.
                        </div>
                    ) : !data || data.length === 0 ? (
                        <div className="text-sm text-gray-500 py-3">
                            No sheets yet — start by adding an activity.
                        </div>
                    ) : (
                        data.map((sheet: MonthlyActivitySummary, index) => (
                            <div
                                key={`${sheet.year}-${sheet.month}`}
                                className={cn(
                                    "flex items-center justify-between py-3",
                                    index !== data.length - 1 && "border-b border-gray-200",
                                )}
                            >
                                <span className="text-sm">
                                    {MONTH_LABELS[sheet.month - 1]} {sheet.year}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">
                                        {sheet.recordCount} records · {sheet.totalConventionalHours.toFixed(1)}h
                                    </span>
                                    <Badge
                                        className={cn(
                                            "rounded-xl px-2.5 py-1 text-[13px] font-medium border-0",
                                            STATUS_STYLES[sheet.status],
                                        )}
                                    >
                                        {STATUS_LABELS[sheet.status]}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
