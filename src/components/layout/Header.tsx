import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeaderProps {
    className?: string
}

export function Header({ className }: HeaderProps) {
    return (
        <header className={cn("bg-white rounded-[10px] p-4 px-6 shadow-sm flex items-center justify-between mb-6", className)}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e5bff] flex items-center justify-center" />
                <div>
                    <h3 className="text-base font-semibold leading-none">Teacher Portal</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Activity Sheet Management</p>
                </div>
            </div>
            <Button variant="outline" className="rounded-lg px-4 py-2">
                ↩ Logout
            </Button>
        </header>
    )
}

