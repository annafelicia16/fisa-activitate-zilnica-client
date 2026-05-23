import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "./components/layout/AppShell"
import { RequireTeacher } from "./components/auth/RequireTeacher"
import { Admin } from "./pages/Admin"
import { Dashboard } from "./pages/Dashboard"
import { DailyActivitySheet } from "./pages/DailyActivitySheet"
import { Login } from "./pages/Login"
import { SupplementaryActivitiesAnnex } from "./pages/SupplementaryActivitiesAnnex"
import { queryClient } from "./lib/query-client"

function AuthedShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireTeacher>
      <AppShell>{children}</AppShell>
    </RequireTeacher>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthedShell><Dashboard /></AuthedShell>} />
          <Route
            path="/activity-sheet"
            element={
              <AuthedShell>
                <DailyActivitySheet />
              </AuthedShell>
            }
          />
          <Route
            path="/activity-sheet/new"
            element={<Navigate to="/activity-sheet" replace />}
          />
          <Route
            path="/supplementary-annex"
            element={
              <AuthedShell>
                <SupplementaryActivitiesAnnex />
              </AuthedShell>
            }
          />
          <Route
            path="/admin/schedules"
            element={
              <AuthedShell>
                <Admin />
              </AuthedShell>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/schedules" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
