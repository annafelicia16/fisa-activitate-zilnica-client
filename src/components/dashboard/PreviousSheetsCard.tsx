import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PreviousSheetsCardProps {
    className?: string
}

interface SheetItem {
    month: string
    year: string
    status: "approved" | "submitted" | "progress"
}

export function PreviousSheetsCard({ className }: PreviousSheetsCardProps) {
    const sheets: SheetItem[] = [
        { month: "October", year: "2024", status: "approved" },
        { month: "September", year: "2024", status: "approved" },
        { month: "August", year: "2024", status: "submitted" },
        { month: "July", year: "2024", status: "progress" },
        { month: "June", year: "2024", status: "approved" },
    ]

    const statusLabels = {
        approved: "Approved",
        submitted: "Submitted",
        progress: "In progress",
    }

    const statusStyles = {
        approved: "bg-[#d7fbe0] text-[#1a7f3f]",
        submitted: "bg-[#fff4ce] text-[#b37a00]",
        progress: "bg-[#f0f2f7] text-[#333]",
    }

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
                    {sheets.map((sheet, index) => (
                        <div
                            key={`${sheet.month}-${sheet.year}`}
                            className={cn(
                                "flex items-center justify-between py-3",
                                index !== sheets.length - 1 && "border-b border-gray-200"
                            )}
                        >
                            <span className="text-sm">
                                {sheet.month} {sheet.year}
                            </span>
                            <Badge
                                className={cn(
                                    "rounded-xl px-2.5 py-1 text-[13px] font-medium border-0",
                                    statusStyles[sheet.status]
                                )}
                            >
                                {statusLabels[sheet.status]}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

