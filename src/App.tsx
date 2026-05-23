import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Dashboard } from "./pages/Dashboard"
import { DailyActivitySheet } from "./pages/DailyActivitySheet"
import { SupplementaryActivitiesAnnex } from "./pages/SupplementaryActivitiesAnnex"
import { Login } from "./pages/Login"
import { Admin } from "./pages/Admin"
import { RequireTeacher } from "./components/auth/RequireTeacher"
import { queryClient } from "./lib/query-client"

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireTeacher>
                <Dashboard />
              </RequireTeacher>
            }
          />
          <Route
            path="/activity-sheet/new"
            element={
              <RequireTeacher>
                <DailyActivitySheet />
              </RequireTeacher>
            }
          />
          <Route
            path="/supplementary-annex"
            element={
              <RequireTeacher>
                <SupplementaryActivitiesAnnex />
              </RequireTeacher>
            }
          />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
