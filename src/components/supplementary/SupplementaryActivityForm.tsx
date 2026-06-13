import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Affix, AffixInput, InputAffix } from "@/components/ui/input-affix"
import { Field } from "@/components/common/Field"
import { SupplementaryAttachmentsArea } from "@/components/supplementary/SupplementaryAttachmentsArea"
import { fmtDateInput } from "@/utils/dates"
import { SUPP_TYPES } from "./supp-types"

export interface SupplementaryFormData {
  date: string
  type: string
  hours: string
  observations: string
}

interface SupplementaryActivityFormProps {
  state: SupplementaryFormData
  dirty: boolean
  editingId: string | null
  saving?: boolean
  // Files picked but not yet uploaded — they live in page state (not form
  // state) and upload after the activity is saved.
  pendingFiles: File[]
  onChange: (patch: Partial<SupplementaryFormData>) => void
  onNew: () => void
  onSave: () => void
  onDelete?: () => void
  onAddFiles: (files: File[]) => void
  onRemovePendingFile: (index: number) => void
  onNotify: (message: string) => void
}

export function SupplementaryActivityForm({
  state,
  dirty,
  editingId,
  saving,
  pendingFiles,
  onChange,
  onNew,
  onSave,
  onDelete,
  onAddFiles,
  onRemovePendingFile,
  onNotify,
}: SupplementaryActivityFormProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex-1">
          {editingId ? "Editare activitate complementară" : "Activitate complementară nouă"}
        </CardTitle>
        {dirty && <Badge variant="warn">modificat</Badge>}
        <Button variant="ghost" size="sm" onClick={onNew}>
          <PlusIcon className="size-3" /> Nouă
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <Field label="Data" required>
          <Input className="font-mono" value={fmtDateInput(state.date)} readOnly />
        </Field>
        <Field label="Tip activitate" required>
          <Select value={state.type} onValueChange={(v) => onChange({ type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Alege tip…" />
            </SelectTrigger>
            <SelectContent>
              {SUPP_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Total ore" required>
          <InputAffix>
            <AffixInput
              type="number"
              step="0.5"
              className="font-mono tnum"
              value={state.hours}
              onChange={(e) => onChange({ hours: e.target.value })}
            />
            <Affix>h</Affix>
          </InputAffix>
        </Field>
        <div className="col-span-3">
          <Field label="Descriere">
            <Textarea
              placeholder="Descriere succintă a activității (cercetare, comisie, mentorat, etc.)"
              value={state.observations}
              onChange={(e) => onChange({ observations: e.target.value })}
            />
          </Field>
        </div>
        <div className="col-span-3">
          <SupplementaryAttachmentsArea
            editingId={editingId}
            pendingFiles={pendingFiles}
            onAddFiles={onAddFiles}
            onRemovePending={onRemovePendingFile}
            onNotify={onNotify}
          />
        </div>
      </CardContent>
      <div className="flex items-center gap-2 border-t border-border bg-surface-2 px-4 py-3">
        {onDelete && editingId && (
          <Button variant="default" size="icon" aria-label="Șterge" onClick={onDelete}>
            <Trash2Icon className="size-3" />
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={onSave} disabled={saving}>
          <SaveIcon className="size-3" /> {saving ? "Se salvează…" : "Salvează"}
        </Button>
      </div>
    </Card>
  )
}
