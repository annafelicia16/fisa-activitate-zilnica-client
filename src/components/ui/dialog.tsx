import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-[460px] overflow-hidden rounded-[--r-lg] border border-border bg-card shadow-[var(--shadow-lg)]",
          className,
        )}
      >
        {(title || description) && (
          <div className="border-b border-border px-5 py-4">
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>}
            {description && (
              <p className="mt-1 text-[12.5px] text-text-muted">{description}</p>
            )}
          </div>
        )}
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
