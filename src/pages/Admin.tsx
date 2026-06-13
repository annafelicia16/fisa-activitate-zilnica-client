import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { CheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/common/Breadcrumb"
import {
  ScheduleUploadForm,
  type ScheduleFormState,
} from "@/components/admin/ScheduleUploadForm"
import { ExistingSchedulesList } from "@/components/admin/ExistingSchedulesList"
import { useAllSchedules, useUploadSchedule } from "@/api/schedules"

const INITIAL: ScheduleFormState = {
  name: "Orar 2025–2026 · Semestrul 2",
  year: "2025-2026",
  semester: "2",
  startDate: "2026-02-16",
  endDate: "2026-06-26",
  oddFile: null,
  evenFile: null,
}

// Default .fet files served from public/dev — preloaded into the pickers so the
// form can be submitted without picking files by hand. Missing files just leave
// the pickers empty.
const DEFAULT_FET_URLS = {
  odd: "/dev/orarImpara_data_and_timetable.fet",
  even: "/dev/orarPara_data_and_timetable.fet",
}

async function fetchFetFile(url: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const blob = await res.blob()
  return new File([blob], url.split("/").pop() ?? "orar.fet", { type: "application/xml" })
}

function yearOf(value: string): number {
  const first = value.match(/\d{4}/)?.[0]
  return first ? parseInt(first, 10) : new Date().getFullYear()
}

export function Admin() {
  const navigate = useNavigate()
  const uploadMutation = useUploadSchedule()
  const {
    data: existingSchedules,
    isLoading: existingLoading,
    isError: existingError,
  } = useAllSchedules()
  const [state, setState] = useState<ScheduleFormState>(INITIAL)
  const [defaultFiles, setDefaultFiles] = useState<{ odd: File; even: File } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ scheduleId: number; slotCount?: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchFetFile(DEFAULT_FET_URLS.odd), fetchFetFile(DEFAULT_FET_URLS.even)])
      .then(([odd, even]) => {
        if (cancelled) return
        setDefaultFiles({ odd, even })
        setState((prev) => ({
          ...prev,
          oddFile: prev.oddFile ?? odd,
          evenFile: prev.evenFile ?? even,
        }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function patch(p: Partial<ScheduleFormState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  function resetForm() {
    setState({
      ...INITIAL,
      oddFile: defaultFiles?.odd ?? null,
      evenFile: defaultFiles?.even ?? null,
    })
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
            onCancel={resetForm}
            onSubmit={handleSubmit}
            submitting={uploadMutation.isPending}
            error={error}
          />

          <ExistingSchedulesList
            schedules={existingSchedules}
            loading={existingLoading}
            error={existingError}
          />

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
