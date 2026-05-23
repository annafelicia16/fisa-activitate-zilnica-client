import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { CheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb } from "@/components/common/Breadcrumb"
import {
  ScheduleUploadForm,
  type ScheduleFormState,
} from "@/components/admin/ScheduleUploadForm"
import { useUploadSchedule } from "@/api/schedules"

const INITIAL: ScheduleFormState = {
  name: "Orar 2025–2026 · Semestrul 2",
  year: "2025-2026",
  semester: "2",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 4)
    return d.toISOString().slice(0, 10)
  })(),
  oddFile: null,
  evenFile: null,
}

function yearOf(value: string): number {
  const first = value.match(/\d{4}/)?.[0]
  return first ? parseInt(first, 10) : new Date().getFullYear()
}

export function Admin() {
  const navigate = useNavigate()
  const uploadMutation = useUploadSchedule()
  const [state, setState] = useState<ScheduleFormState>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ scheduleId: number; slotCount?: number } | null>(null)

  function patch(p: Partial<ScheduleFormState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    if (!state.oddFile || !state.evenFile) {
      setError("Fișierele .fet pentru săptămâna pară și impară sunt obligatorii.")
      return
    }
    try {
      const result = await uploadMutation.mutateAsync({
        name: state.name.trim(),
        year: yearOf(state.year),
        semester: parseInt(state.semester, 10),
        startDate: new Date(`${state.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${state.endDate}T00:00:00`).toISOString(),
        oddWeekFile: state.oddFile,
        evenWeekFile: state.evenFile,
      })
      setSuccess({ scheduleId: result.scheduleSemesterId })
      setState((prev) => ({ ...prev, oddFile: null, evenFile: null }))
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          typeof err.response?.data === "string" ? err.response.data : err.message
        setError(message || "Importul a eșuat.")
      } else {
        setError("Serverul nu răspunde. Verificați conexiunea.")
      }
    }
  }

  return (
    <div className="w-full">
      <Breadcrumb
        crumbs={[
          { label: "Bord", onClick: () => navigate("/") },
          { label: "Administrare orare" },
        ]}
      />

      <div className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-[18px]">
        <div className="mb-4 flex items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.018em]">Orare semestriale</h1>
          <span className="text-[13px] text-text-muted">
            Importați fișierele .fet pentru săptămâna pară și impară.
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
          <ScheduleUploadForm
            state={state}
            onChange={patch}
            onCancel={() => setState(INITIAL)}
            onSubmit={handleSubmit}
            submitting={uploadMutation.isPending}
            error={error}
          />

          <Card>
            <CardHeader>
              <CardTitle>Orare existente</CardTitle>
            </CardHeader>
            <div className="px-4 py-6 text-[12.5px] text-text-muted">
              Lista orarelor importate va apărea aici după primul import.
            </div>
          </Card>

          {success && (
            <div className="col-span-2 flex items-center gap-3 rounded-[--r-lg] border border-transparent bg-st-approved-soft px-4 py-3.5">
              <div className="grid size-7 place-items-center rounded-full bg-st-approved text-white">
                <CheckIcon className="size-3.5" />
              </div>
              <div>
                <div className="font-semibold">Orar importat cu succes</div>
                <div className="text-[12px] text-text-muted">
                  ID semestru: <span className="font-mono">#{success.scheduleId}</span>
                </div>
              </div>
              <div className="flex-1" />
              <Badge variant="approved" dot>
                activ
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
