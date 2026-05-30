import { NavLink, useNavigate } from "react-router-dom"
import {
  BookOpenIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  HomeIcon,
  LogOutIcon,
  SchoolIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTeacherStore } from "@/store/teacher"

interface NavItem {
  to: string
  label: string
  Icon: typeof HomeIcon
}

const NAV: NavItem[] = [
  { to: "/", label: "Bord", Icon: HomeIcon },
  { to: "/activity-sheet", label: "Fișa zilnică", Icon: ClipboardListIcon },
  { to: "/supplementary-annex", label: "Anexă complementară", Icon: BookOpenIcon },
  { to: "/admin/schedules", label: "Orare", Icon: SchoolIcon },
]

function initialsOf(name: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "—"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
  return (first + last).toUpperCase() || "—"
}

export function TopBar() {
  const navigate = useNavigate()
  const teacher = useTeacherStore()
  const reset = useTeacherStore((s) => s.reset)

  function handleLogout() {
    reset()
    navigate("/login", { replace: true })
  }

  const displayName = teacher.fullName || teacher.email || "—"
  const initials = initialsOf(teacher.fullName)

  return (
    <header className="sticky top-0 z-50 flex h-12 min-w-0 items-center gap-1 border-b border-border bg-card px-4">
      <div className="mr-2 flex flex-none items-center gap-2 pl-1 pr-2.5 text-[13px] font-semibold tracking-[-0.01em] whitespace-nowrap">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-foreground text-[11px] font-semibold text-background font-mono">
          F
        </span>
        <span>Fișa zilnică</span>
        <small className="-ml-0.5 text-[11px] font-normal text-text-muted">· UNITBV</small>
      </div>

      <nav className="flex h-full min-w-0 flex-none items-center gap-px overflow-hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex h-full items-center gap-1.5 whitespace-nowrap px-2.5 text-[12.5px] font-medium text-text-muted hover:text-foreground",
                isActive && "text-foreground",
                isActive &&
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-foreground",
              )
            }
          >
            <item.Icon className="size-3.5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex flex-none items-center gap-1.5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-border bg-transparent py-[3px] pl-[3px] pr-2 text-[12px] hover:bg-hover"
          title="Ieșire"
        >
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-brand text-[10.5px] font-semibold tracking-[-0.01em] text-brand-foreground">
            {initials}
          </span>
          <span className="font-medium">{displayName}</span>
          <ChevronDownIcon className="size-3 opacity-60" />
          <LogOutIcon className="size-3 opacity-60" />
        </button>
      </div>
    </header>
  )
}
