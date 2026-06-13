import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "./client"
import { supplementaryActivityKeys } from "./supplementary-activities"

export interface SupplementaryActivityAttachment {
  id: string
  supplementaryActivityId: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

const RESOURCE = "/api/SupplementaryActivities"

export const supplementaryActivityAttachmentKeys = {
  // Nested under the supplementary root so its invalidations cover attachments
  // automatically (incl. on activity delete).
  byActivity: (activityId: string) =>
    [...supplementaryActivityKeys.all, "attachments", activityId] as const,
}

async function fetchAttachments(
  activityId: string,
): Promise<SupplementaryActivityAttachment[]> {
  const { data } = await apiClient.get<SupplementaryActivityAttachment[]>(
    `${RESOURCE}/${activityId}/attachments`,
  )
  return data
}

async function uploadAttachments(args: {
  activityId: string
  files: File[]
}): Promise<SupplementaryActivityAttachment[]> {
  const form = new FormData()
  for (const file of args.files) form.append("Files", file)

  const baseTimeout = apiClient.defaults.timeout ?? 30_000
  const { data } = await apiClient.post<SupplementaryActivityAttachment[]>(
    `${RESOURCE}/${args.activityId}/attachments`,
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

// Blob + anchor-click download; filename comes from row metadata, so no
// Content-Disposition parsing is needed.
export async function downloadSupplementaryAttachment(
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

export function useSupplementaryActivityAttachments(activityId: string | null) {
  return useQuery({
    queryKey: supplementaryActivityAttachmentKeys.byActivity(activityId ?? ""),
    queryFn: () => fetchAttachments(activityId as string),
    enabled: Boolean(activityId),
  })
}

// Both mutations invalidate the whole supplementary cache (not just the
// attachment list) so the paperclip count in the entries list refreshes too.
export function useUploadSupplementaryAttachments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadAttachments,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplementaryActivityKeys.all })
    },
  })
}

export function useDeleteSupplementaryAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { attachmentId: string; activityId: string }) =>
      deleteAttachment(args.attachmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplementaryActivityKeys.all })
    },
  })
}
