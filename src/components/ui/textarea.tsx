import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-16 w-full rounded-[--r-md] border border-border-strong bg-card px-2.5 py-2 text-[13px] text-foreground outline-none transition-[border-color,box-shadow]",
        "placeholder:text-text-faint",
        "focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand-soft",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "resize-y leading-[1.4]",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export { Textarea }
