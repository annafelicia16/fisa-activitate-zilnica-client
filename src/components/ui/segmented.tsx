import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string = string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
  fullWidth?: boolean
}

export function Segmented<T extends string = string>({
  value,
  onChange,
  options,
  className,
  fullWidth,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex gap-px rounded-[--r-md] border border-border bg-surface-2 p-0.5",
        fullWidth && "w-full",
        className,
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const pressed = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={pressed}
            aria-pressed={pressed}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-[26px] rounded-[5px] px-2.5 text-[12px] font-medium text-text-muted whitespace-nowrap",
              fullWidth && "flex-1",
              pressed && "bg-card text-foreground shadow-[var(--shadow-sm)]",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
