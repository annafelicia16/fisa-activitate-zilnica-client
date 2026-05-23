import * as React from "react"
import { cn } from "@/lib/utils"

interface InputAffixProps {
  children: React.ReactNode
  className?: string
}

export function InputAffix({ children, className }: InputAffixProps) {
  return (
    <div
      className={cn(
        "flex h-[var(--row-h)] items-center overflow-hidden rounded-[--r-md] border border-border-strong bg-card transition-[border-color,box-shadow]",
        "focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface AffixProps {
  side?: "left" | "right"
  children: React.ReactNode
  className?: string
}

export function Affix({ side = "right", children, className }: AffixProps) {
  return (
    <span
      className={cn(
        "flex h-full flex-none items-center bg-surface-2 px-2.5 text-[11.5px] text-text-muted whitespace-nowrap font-mono",
        side === "right" ? "border-l border-border" : "border-r border-border",
        className,
      )}
    >
      {children}
    </span>
  )
}

interface AffixInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  affixClassName?: string
}

export const AffixInput = React.forwardRef<HTMLInputElement, AffixInputProps>(
  ({ className, affixClassName: _ignored, ...props }, ref) => {
    void _ignored
    return (
      <input
        ref={ref}
        className={cn(
          "h-full flex-1 min-w-0 border-0 bg-transparent px-2.5 text-[13px] outline-none placeholder:text-text-faint",
          className,
        )}
        {...props}
      />
    )
  },
)
AffixInput.displayName = "AffixInput"
