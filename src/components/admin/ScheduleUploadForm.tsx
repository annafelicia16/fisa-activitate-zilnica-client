import { UploadIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { Field } from "@/components/common/Field"
import { FetUpload } from "./FetUpload"

export interface ScheduleFormState {
  name: string
  year: string
  semester: "1" | "2"
  startDate: string
  endDate: string
  oddFile: File | null
  evenFile: File | null
}

interface ScheduleUploadFormProps {
  state: ScheduleFormState
  onChange: (patch: Partial<ScheduleFormState>) => void
  onCancel: () => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}

export function ScheduleUploadForm({
  state,
  onChange,
  onCancel,
  onSubmit,
  submitting,
  error,
}: ScheduleUploadFormProps) {
  const canSubmit = Boolean(state.oddFile && state.evenFile && state.name && state.year)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-1">Orar nou</CardTitle>
        <Badge variant="accent">Pas 1 din 1</Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 p-[18px]">
        <div className="col-span-3">
          <Field label="Nume orar" required>
            <Input
              value={state.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Orar 2025–2026 · Semestrul 2"
            />
          </Field>
        </div>
        <Field label="An universitar" required>
          <Input
            className="font-mono"
            value={state.year}
            onChange={(e) => onChange({ year: e.target.value })}
            placeholder="2025-2026"
          />
        </Field>
        <Field label="Semestru" required>
          <Segmented<"1" | "2">
            fullWidth
            value={state.semester}
            onChange={(v) => onChange({ semester: v })}
            options={[
              { value: "1", label: "Semestrul 1" },
              { value: "2", label: "Semestrul 2" },
            ]}
          />
        </Field>
        <div />
        <Field label="Început semestru" required>
          <Input
            type="date"
            className="font-mono"
            value={state.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Sfârșit semestru" required>
          <Input
            type="date"
            className="font-mono"
            value={state.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </Field>
        <div />

        <div className="col-span-3 mt-1">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-text-muted">
            Fișiere .fet
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FetUpload
              label="Săptămâna impară"
              file={state.oddFile}
              hint="orar_impar.fet"
              onPick={(f) => onChange({ oddFile: f })}
              disabled={submitting}
            />
            <FetUpload
              label="Săptămâna pară"
              file={state.evenFile}
              hint="orar_par.fet"
              onPick={(f) => onChange({ evenFile: f })}
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <div className="col-span-3 rounded-[--r-sm] bg-st-warning-soft px-2.5 py-2 text-[12px] text-st-warning">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <span className="text-[12px] text-text-muted">
          Doar fișierele cu extensia <span className="font-mono">.fet</span> sunt acceptate. Maxim 10 MB / fișier.
        </span>
        <div className="flex-1" />
        <Button variant="default" onClick={onCancel} disabled={submitting}>
          Anulează
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={!canSubmit || submitting}>
          <UploadIcon className="size-3" /> {submitting ? "Se importă…" : "Importă orarul"}
        </Button>
      </CardFooter>
    </Card>
  )
}
