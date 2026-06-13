import { AttachmentsArea } from "@/components/common/AttachmentsArea"
import {
  downloadAttachment,
  useDeleteAttachment,
  useRecordAttachments,
} from "@/api/daily-activity-record-attachments"

interface RecordAttachmentsAreaProps {
  editingId: string | null
  pendingFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemovePending: (index: number) => void
  onNotify: (message: string) => void
}

// Daily-record binding for the shared AttachmentsArea: loads the stored
// attachments of the record being edited and wires download/delete to the
// daily-activity-record endpoints.
export function RecordAttachmentsArea({
  editingId,
  pendingFiles,
  onAddFiles,
  onRemovePending,
  onNotify,
}: RecordAttachmentsAreaProps) {
  const { data: attachments = [] } = useRecordAttachments(editingId)
  const deleteMutation = useDeleteAttachment()

  return (
    <AttachmentsArea
      attachments={attachments}
      pendingFiles={pendingFiles}
      onAddFiles={onAddFiles}
      onRemovePending={onRemovePending}
      onDownload={(a) => downloadAttachment(a.id, a.fileName)}
      onDeleteStored={async (a) => {
        if (deleteMutation.isPending || !editingId) return
        await deleteMutation.mutateAsync({ attachmentId: a.id, recordId: editingId })
      }}
      onNotify={onNotify}
    />
  )
}
