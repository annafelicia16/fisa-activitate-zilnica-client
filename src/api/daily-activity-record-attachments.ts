import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "./client"
import { dailyActivityRecordKeys, invalidateRecordCaches } from "./daily-activity-records"

export interface DailyActivityRecordAttachment {
  id: string
  dailyActivityRecordId: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

const RESOURCE = "/api/DailyActivityRecords"

export const dailyActivityRecordAttachmentKeys = {
  // Nested under the records root so invalidateRecordCaches covers attachments
  // automatically (incl. on record delete).
  byRecord: (recordId: string) =>
    [...dailyActivityRecordKeys.all, "attachments", recordId] as const,
}

async function fetchAttachments(recordId: string): Promise<DailyActivityRecordAttachment[]> {
  const { data } = await apiClient.get<DailyActivityRecordAttachment[]>(
    `${RESOURCE}/${recordId}/attachments`,
  )
  return data
}

async function uploadAttachments(args: {
  recordId: string
  files: File[]
}): Promise<DailyActivityRecordAttachment[]> {
  const form = new FormData()
  for (const file of args.files) form.append("Files", file)

  const baseTimeout = apiClient.defaults.timeout ?? 30_000
  const { data } = await apiClient.post<DailyActivityRecordAttachment[]>(
    `${RESOURCE}/${args.recordId}/attachments`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: baseTimeout + 5 * 60 * 1000,
    },
  )
  return data
}

async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`${RESOURCE}/attachments/${attachmentId}`)
}

// Blob + anchor-click download (same trick as the PDF export). The filename
// comes from the row metadata, so no Content-Disposition parsing is needed.
export async function downloadAttachment(
  attachmentId: string,
  fileName: string,
): Promise<void> {
  const response = await apiClient.get(
    `${RESOURCE}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  )
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function useRecordAttachments(recordId: string | null) {
  return useQuery({
    queryKey: dailyActivityRecordAttachmentKeys.byRecord(recordId ?? ""),
    queryFn: () => fetchAttachments(recordId as string),
    enabled: Boolean(recordId),
  })
}

// Both mutations invalidate the full record caches (not just the attachment
// list) so the paperclip count in the records list refreshes too.
export function useUploadAttachments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadAttachments,
    onSuccess: () => invalidateRecordCaches(qc),
  })
}

export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { attachmentId: string; recordId: string }) =>
      deleteAttachment(args.attachmentId),
    onSuccess: () => invalidateRecordCaches(qc),
  })
}
