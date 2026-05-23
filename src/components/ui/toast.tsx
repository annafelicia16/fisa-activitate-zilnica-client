import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ToastProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  duration?: number
  className?: string
}

export function Toast({ open, onClose, children, duration = 2200, className }: ToastProps) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-[--r-md] bg-foreground px-3.5 py-2.5 text-[12.5px] text-background shadow-[var(--shadow-lg)]",
        className,
      )}
      role="status"
    >
      {children}
    </div>
  )
}
