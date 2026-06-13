import { AttachmentsArea } from "@/components/common/AttachmentsArea"
import {
  downloadSupplementaryAttachment,
  useDeleteSupplementaryAttachment,
  useSupplementaryActivityAttachments,
} from "@/api/supplementary-activity-attachments"

interface SupplementaryAttachmentsAreaProps {
  editingId: string | null
  pendingFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemovePending: (index: number) => void
  onNotify: (message: string) => void
}

// Supplementary-activity binding for the shared AttachmentsArea: loads the
// stored attachments of the activity being edited and wires download/delete to
// the supplementary endpoints.
export function SupplementaryAttachmentsArea({
  editingId,
  pendingFiles,
  onAddFiles,
  onRemovePending,
  onNotify,
}: SupplementaryAttachmentsAreaProps) {
  const { data: attachments = [] } = useSupplementaryActivityAttachments(editingId)
  const deleteMutation = useDeleteSupplementaryAttachment()

  return (
    <AttachmentsArea
      attachments={attachments}
      pendingFiles={pendingFiles}
      onAddFiles={onAddFiles}
      onRemovePending={onRemovePending}
      onDownload={(a) => downloadSupplementaryAttachment(a.id, a.fileName)}
      onDeleteStored={async (a) => {
        if (deleteMutation.isPending || !editingId) return
        await deleteMutation.mutateAsync({ attachmentId: a.id, activityId: editingId })
      }}
      onNotify={onNotify}
    />
  )
}
