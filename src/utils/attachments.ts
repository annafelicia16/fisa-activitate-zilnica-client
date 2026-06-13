// Shared attachment rules — mirror the backend services
// (DailyActivityRecordAttachmentsService / SupplementaryActivityAttachmentsService)
// so users get instant feedback; the server enforces them regardless.
export const MAX_ATTACHMENTS_PER_RECORD = 20
export const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024
export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".ps1",
  ".sh",
  ".vbs",
  ".js",
])

// The minimal shape the shared AttachmentsArea needs to render a stored file.
export interface StoredAttachment {
  id: string
  fileName: string
  sizeBytes: number
}

export interface AttachmentValidationResult {
  accepted: File[]
  rejectionMessage: string | null
}

// Filters incoming files against the limits, counting both the already-uploaded
// attachments and the pending (not yet uploaded) ones.
export function validateAttachmentFiles(
  existingCount: number,
  pending: File[],
  incoming: File[],
): AttachmentValidationResult {
  const rejections: string[] = []
  const accepted: File[] = []
  let total = existingCount + pending.length

  for (const file of incoming) {
    const extension = /\.[^.]+$/.exec(file.name)?.[0]?.toLowerCase() ?? ""
    if (BLOCKED_ATTACHMENT_EXTENSIONS.has(extension)) {
      rejections.push(`„${file.name}" — tip de fișier interzis`)
      continue
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      rejections.push(`„${file.name}" — depășește limita de 100 MB`)
      continue
    }
    if (total >= MAX_ATTACHMENTS_PER_RECORD) {
      rejections.push(`„${file.name}" — maxim ${MAX_ATTACHMENTS_PER_RECORD} fișiere`)
      continue
    }
    accepted.push(file)
    total++
  }

  return {
    accepted,
    rejectionMessage: rejections.length > 0 ? rejections.join(" · ") : null,
  }
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(sizeBytes / 1024).toFixed(1)} KB`
}
