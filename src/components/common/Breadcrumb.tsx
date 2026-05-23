import { ChevronRightIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  crumbs: Crumb[]
  right?: ReactNode
  className?: string
}

export function Breadcrumb({ crumbs, right, className }: BreadcrumbProps) {
  return (
    <div
      className={cn(
        "flex h-[38px] items-center gap-1.5 border-b border-border bg-background px-6 text-[12px] text-text-muted whitespace-nowrap",
        className,
      )}
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRightIcon className="size-3 text-text-faint" />}
            {last ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="rounded-[--r-sm] px-1 py-0.5 hover:bg-hover hover:text-foreground"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="px-1">{crumb.label}</span>
            )}
          </span>
        )
      })}
      {right && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
    </div>
  )
}
