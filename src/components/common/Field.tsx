import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-st-warning">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-text-faint">{hint}</p>}
      {error && <p className="text-[11px] text-st-warning">{error}</p>}
    </div>
  )
}
