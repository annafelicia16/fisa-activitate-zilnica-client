import type { ReactNode } from "react"
import { TopBar } from "./TopBar"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
