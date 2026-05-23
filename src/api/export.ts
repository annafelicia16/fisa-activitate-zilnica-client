import { useMutation } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface DownloadMonthlyActivitySheetArgs {
  teacherId: number
  year: number
  month: number
}

export async function downloadMonthlyActivitySheetPdf({
  teacherId,
  year,
  month,
}: DownloadMonthlyActivitySheetArgs): Promise<void> {
  const response = await apiClient.get("/api/Export/monthly-pdf", {
    params: { teacherId, year, month },
    responseType: "blob",
  })

  const fallback = `Fisa_Activitate_${year}_${String(month).padStart(2, "0")}.pdf`
  const disposition =
    response.headers?.["content-disposition"] ??
    (response.headers as { get?: (k: string) => string | null })?.get?.("content-disposition") ??
    ""
  const match = /filename="?([^";]+)"?/.exec(String(disposition))
  const filename = match?.[1] ?? fallback

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function useDownloadMonthlyActivitySheet() {
  const mutation = useMutation({
    mutationFn: downloadMonthlyActivitySheetPdf,
  })
  return {
    ...mutation,
    download: (args: DownloadMonthlyActivitySheetArgs) => mutation.mutate(args),
  }
}
