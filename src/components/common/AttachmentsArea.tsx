import { useState, type ChangeEvent, type DragEvent } from "react"
import { DownloadIcon, PaperclipIcon, Trash2Icon, UploadIcon, XIcon } from "lucide-react"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/common/Field"
import {
  formatAttachmentSize,
  validateAttachmentFiles,
  type StoredAttachment,
} from "@/utils/attachments"
import { cn } from "@/lib/utils"

interface AttachmentsAreaProps {
  // Already-uploaded files of the record being edited (empty on a new form).
  attachments: StoredAttachment[]
  // Files picked but not yet uploaded — they wait until the record is saved.
  pendingFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemovePending: (index: number) => void
  onDownload: (attachment: StoredAttachment) => Promise<void>
  // Raw delete (no confirm) — the confirmation dialog lives here.
  onDeleteStored: (attachment: StoredAttachment) => Promise<void>
  onNotify: (message: string) => void
}

// Generic drop area + pending-file chips + stored-attachment rows, shared by
// the daily record form and the supplementary activity form. The module-bound
// wrappers supply the query/mutation plumbing.
export function AttachmentsArea({
  attachments,
  pendingFiles,
  onAddFiles,
  onRemovePending,
  onDownload,
  onDeleteStored,
  onNotify,
}: AttachmentsAreaProps) {
  const confirm = useConfirm()
  const [dragActive, setDragActive] = useState(false)

  function addIncoming(incoming: File[]) {
    if (incoming.length === 0) return
    const { accepted, rejectionMessage } = validateAttachmentFiles(
      attachments.length,
      pendingFiles,
      incoming,
    )
    if (rejectionMessage) onNotify(rejectionMessage)
    if (accepted.length > 0) onAddFiles(accepted)
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    addIncoming(Array.from(event.target.files ?? []))
    // Reset so picking the same file again still fires onChange.
    event.target.value = ""
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragActive(false)
    addIncoming(Array.from(event.dataTransfer.files))
  }

  async function handleDelete(attachment: StoredAttachment) {
    const confirmed = await confirm({
      title: "Ștergeți fișierul?",
      description: `„${attachment.fileName}" va fi șters definitiv de pe disc.`,
      confirmLabel: "Șterge",
      variant: "destructive",
    })
    if (!confirmed) return
    try {
      await onDeleteStored(attachment)
      onNotify("Fișier șters.")
    } catch {
      onNotify("Eroare la ștergerea fișierului.")
    }
  }

  async function handleDownload(attachment: StoredAttachment) {
    try {
      await onDownload(attachment)
    } catch {
      onNotify("Eroare la descărcarea fișierului.")
    }
  }

  return (
    <Field label="Fișiere atașate">
      <div className="flex flex-col gap-1.5">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[--r-md] border border-dashed p-3 text-center transition-colors",
            dragActive
              ? "border-brand bg-brand-soft"
              : "border-border-strong bg-surface-2 hover:bg-hover",
          )}
        >
          <UploadIcon className="size-4 text-text-muted" />
          <div className="text-[11px] text-text-faint">
            Click sau trageți fișiere aici · max 100 MB / fișier · nu apar în PDF
          </div>
          <input type="file" multiple className="hidden" onChange={handlePick} />
        </label>

        {pendingFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center gap-2 rounded-[--r-sm] border border-border bg-surface-2 px-2.5 py-1.5"
          >
            <PaperclipIcon className="size-3 shrink-0 text-text-muted" />
            <span className="truncate text-[12px]">{file.name}</span>
            <span className="font-mono text-[10.5px] text-text-faint">
              {formatAttachmentSize(file.size)}
            </span>
            <span className="rounded-full bg-st-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-st-warning">
              în așteptare
            </span>
            <button
              type="button"
              title="Elimină fișierul"
              onClick={() => onRemovePending(index)}
              className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-[--r-sm] text-text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}

        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 rounded-[--r-sm] border border-border bg-card px-2.5 py-1.5"
          >
            <PaperclipIcon className="size-3 shrink-0 text-text-muted" />
            <span className="truncate text-[12px]">{attachment.fileName}</span>
            <span className="font-mono text-[10.5px] text-text-faint">
              {formatAttachmentSize(attachment.sizeBytes)}
            </span>
            <button
              type="button"
              title="Descarcă fișierul"
              onClick={() => handleDownload(attachment)}
              className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-[--r-sm] border border-border bg-card text-text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <DownloadIcon className="size-3" />
            </button>
            <button
              type="button"
              title="Șterge fișierul"
              onClick={() => handleDelete(attachment)}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-[--r-sm] border border-border bg-card text-text-muted transition-colors hover:border-st-warning hover:bg-st-warning-soft hover:text-st-warning"
            >
              <Trash2Icon className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </Field>
  )
}
