import { CheckIcon, UploadIcon } from "lucide-react"
import type { ChangeEvent } from "react"
import { Badge } from "@/components/ui/badge"

interface FetUploadProps {
  label: string
  file: File | null
  hint?: string
  onPick: (file: File | null) => void
  disabled?: boolean
}

export function FetUpload({ label, file, hint, onPick, disabled }: FetUploadProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    onPick(next)
  }

  return (
    <label
      className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[--r-md] border border-dashed border-border-strong bg-surface-2 p-3.5 text-center hover:bg-hover"
      aria-disabled={disabled}
    >
      <UploadIcon className="size-4 text-text-muted" />
      <div className="text-[12.5px] font-medium">{label}</div>
      {file ? (
        <div className="font-mono text-[11.5px] text-brand">{file.name}</div>
      ) : (
        <div className="text-[11px] text-text-faint">
          Click sau drag .fet aici · ex. <span className="font-mono">{hint}</span>
        </div>
      )}
      <input
        type="file"
        accept=".fet"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {file && (
        <Badge variant="approved" className="mt-1">
          <CheckIcon className="size-2.5" /> {(file.size / 1024).toFixed(1)} KB
        </Badge>
      )}
    </label>
  )
}
