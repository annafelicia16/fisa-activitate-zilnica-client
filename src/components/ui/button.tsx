import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[--r-md] text-[12.5px] font-medium transition-[background,border-color,box-shadow] disabled:opacity-45 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft",
  {
    variants: {
      variant: {
        default:
          "border border-border-strong bg-card text-foreground hover:bg-hover",
        primary:
          "border border-foreground bg-foreground text-background hover:bg-foreground/90",
        accent:
          "border border-brand bg-brand text-brand-foreground hover:brightness-95",
        ghost:
          "border border-transparent bg-transparent hover:bg-hover",
        destructive:
          "border border-st-warning/40 bg-st-warning text-white hover:brightness-95",
        outline:
          "border border-border-strong bg-card hover:bg-hover",
        secondary:
          "border border-border bg-surface-2 text-foreground hover:bg-hover",
        link: "text-foreground underline-offset-4 hover:underline border-0 bg-transparent",
      },
      size: {
        default: "h-[30px] px-[11px]",
        sm: "h-6 px-2 text-[11.5px] rounded-[--r-sm]",
        lg: "h-9 px-3.5 text-[13px]",
        icon: "h-[30px] w-[30px] p-0",
        "icon-sm": "h-6 w-6 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button }
// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants }
