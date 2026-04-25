import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface ActivitySheetCardProps {
    className?: string
}

export function ActivitySheetCard({ className }: ActivitySheetCardProps) {
    const navigate = useNavigate()

    return (
        <Card className={cn("rounded-2xl p-6 gap-0 shadow-sm", className)}>
            <CardHeader className="p-0 pb-2">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate("/activity-sheet/new")}
                        className="h-12 w-12 rounded-lg bg-[#1e5bff] hover:bg-[#1e5bff]/90 text-white p-0"
                        size="icon"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                    <CardTitle className="text-base font-semibold">
                        Open Activity Sheet
                    </CardTitle>
                </div>
            </CardHeader>
        </Card>
    )
}

