import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PersonalInfoCardProps {
    className?: string
}

export function PersonalInfoCard({ className }: PersonalInfoCardProps) {
    const infoData = [
        { label: "Name", value: "Popescu Maria" },
        { label: "Position", value: "Associate Professor" },
        { label: "Department", value: "Computer Science" },
        { label: "Faculty", value: "Faculty of Engineering and Technology" },
    ]

    return (
        <Card className={cn("rounded-2xl p-6 gap-0 shadow-sm", className)}>
            <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base font-semibold">
                    Personal Information
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {infoData.map((item) => (
                        <div key={item.label}>
                            <div className="text-sm text-gray-500">
                                {item.label}
                            </div>
                            <div className="font-medium">
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

