import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SupplementaryCardProps {
    className?: string
}

export function SupplementaryCard({ className }: SupplementaryCardProps) {
    const navigate = useNavigate()

    return (
        <Card className={cn("rounded-2xl p-6 gap-0 shadow-sm", className)}>
            <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base font-semibold">
                    Supplementary Activities
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0">
                    Complete your supplementary activities annex for additional work hours
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-3">
                <Button
                    variant="outline"
                    className="mt-3 rounded-lg px-4 py-2.5 text-sm font-medium border-gray-300 hover:bg-gray-50"
                    onClick={() => navigate("/supplementary-annex")}
                >
                    Complete Annex
                </Button>
            </CardContent>
        </Card>
    )
}

