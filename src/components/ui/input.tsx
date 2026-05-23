import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-[var(--row-h)] w-full rounded-[--r-md] border border-border-strong bg-card px-2.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow]",
        "placeholder:text-text-faint",
        "focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand-soft",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "file:border-0 file:bg-transparent file:text-[12.5px] file:font-medium file:pr-2",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
