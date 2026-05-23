import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ensureRomanianPdfFont, PDF_FONT_NAME } from "./pdfFont"
import { MONTHS_RO } from "./dates"
import type { SupplementaryActivity } from "@/api/supplementary-activities"

interface ExportParams {
  entries: SupplementaryActivity[]
  teacher: { fullName: string; department: string; academicYear: string }
  year: number
  month: number
}

export async function exportSupplementaryAnnexPdf(params: ExportParams): Promise<void> {
  const { entries, teacher, year, month } = params

  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  if (monthEntries.length === 0) {
    alert("Nu există activități complementare pentru luna selectată.")
    return
  }

  const doc = new jsPDF("p", "mm", "a4")
  await ensureRomanianPdfFont(doc)
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont(PDF_FONT_NAME, "normal")
  doc.setFontSize(11)
  doc.text('UNIVERSITATEA „ȘTEFAN CEL MARE" DIN SUCEAVA', pageWidth / 2, 15, { align: "center" })
  doc.text(
    teacher.department ? `Departamentul ${teacher.department}` : "Departamentul ……………………………",
    pageWidth / 2,
    21,
    { align: "center" },
  )

  doc.setFontSize(10)
  doc.text(`Anul universitar: ${teacher.academicYear || "……………"}`, 20, 30)
  doc.text(`Cadrul didactic: ${teacher.fullName || "……………"}`, 20, 36)

  doc.setFont(PDF_FONT_NAME, "bold")
  doc.setFontSize(13)
  doc.text("ANEXĂ ACTIVITĂȚI COMPLEMENTARE", pageWidth / 2, 48, { align: "center" })
  doc.setFontSize(11)
  doc.text(`Luna ${MONTHS_RO[month]} ${year}`, pageWidth / 2, 55, { align: "center" })

  const sorted = [...monthEntries].sort((a, b) => a.date.localeCompare(b.date))

  doc.setFont(PDF_FONT_NAME, "normal")
  autoTable(doc, {
    startY: 64,
    head: [["Data", "Tip activitate", "Descriere", "Ore"]],
    body: sorted.map((e) => [
      format(new Date(e.date), "dd.MM.yyyy"),
      e.activityType,
      e.observations ?? "",
      e.totalHours.toFixed(2),
    ]),
    styles: {
      font: PDF_FONT_NAME,
      fontSize: 9,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [248, 249, 252],
      textColor: [0, 0, 0],
      lineWidth: 0.4,
      lineColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 2: { halign: "left" } },
    margin: { left: 10, right: 10 },
    theme: "grid",
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 80
  const total = sorted.reduce((sum, e) => sum + (e.totalHours || 0), 0)
  doc.setFont(PDF_FONT_NAME, "bold")
  doc.setFontSize(10)
  doc.text(`Total ore activități complementare: ${total.toFixed(2)}`, 10, finalY + 8)

  doc.save(`anexa-complementara-${year}-${String(month + 1).padStart(2, "0")}.pdf`)
}
