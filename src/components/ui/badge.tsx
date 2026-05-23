import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 h-5 px-1.5 rounded-full text-[11px] font-medium border whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-text-muted",
        draft: "border-transparent bg-st-draft-soft text-st-draft",
        submitted: "border-transparent bg-st-submitted-soft text-st-submitted",
        approved: "border-transparent bg-st-approved-soft text-st-approved",
        warn: "border-transparent bg-st-warning-soft text-st-warning",
        accent: "border-transparent bg-brand-soft text-brand-soft-foreground",
        tag: "border-transparent h-[18px] px-1.5 font-mono text-[10.5px] tracking-[0.01em] uppercase",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  dot?: boolean
}

function Badge({ className, variant, asChild, dot, children, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot ? (
        <span className="inline-block size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </Comp>
  )
}

export { Badge }
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants }
