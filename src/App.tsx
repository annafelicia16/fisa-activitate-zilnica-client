import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Dashboard } from "./pages/Dashboard"
import { DailyActivitySheet } from "./pages/DailyActivitySheet"
import { SupplementaryActivitiesAnnex } from "./pages/SupplementaryActivitiesAnnex"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity-sheet/new" element={<DailyActivitySheet />} />
        <Route path="/supplementary-annex" element={<SupplementaryActivitiesAnnex />} />
      </Routes>
    </BrowserRouter>
  )
}
