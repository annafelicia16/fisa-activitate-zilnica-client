import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ensureRomanianPdfFont, PDF_FONT_NAME } from "./pdfFont"
import { MONTHS_RO } from "./dates"
import { RevenueType, type DailyActivityRecord } from "@/api/daily-activity-records"
import { recordActualHours } from "@/api/types"
import type { SupplementaryActivity } from "@/api/supplementary-activities"

interface ExportParams {
  records: DailyActivityRecord[]
  supplementary: SupplementaryActivity[]
  teacher: { fullName: string; department: string; academicYear: string }
  year: number
  month: number
}

export async function exportDailyActivitySheetPdf(params: ExportParams): Promise<void> {
  const { records, supplementary, teacher, year, month } = params

  const monthRecords = records.filter((r) => {
    const d = new Date(r.startDate)
    return d.getFullYear() === year && d.getMonth() === month
  })

  if (monthRecords.length === 0) {
    alert("Nu există înregistrări pentru luna selectată.")
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
  doc.text(`Departamentul: ${teacher.department || "……………"}`, 20, 36)
  doc.text(`Cadrul didactic: ${teacher.fullName || "……………"}`, 20, 42)

  doc.setFontSize(13)
  doc.setFont(PDF_FONT_NAME, "bold")
  doc.text("FIȘA DE ACTIVITATE ZILNICĂ", pageWidth / 2, 56, { align: "center" })
  doc.setFontSize(11)
  doc.text(`Luna ${MONTHS_RO[month]} ${year}`, pageWidth / 2, 63, { align: "center" })

  const sorted = [...monthRecords].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )
  let nbTotal = 0
  let poTotal = 0
  const tableBody: string[][] = []
  for (const record of sorted) {
    const start = new Date(record.startDate)
    const actual = recordActualHours(record)
    const isNb = record.revenueType === RevenueType.BaseSalary
    if (isNb) nbTotal += record.conventionalHours
    else poTotal += record.conventionalHours
    tableBody.push([
      String(start.getDate()),
      format(start, "HH:mm"),
      record.facultyName,
      record.studyProgram,
      record.subjectName,
      String(record.year),
      record.groupName + (record.subgroupName ? `/${record.subgroupName}` : ""),
      record.roomName,
      actual ? actual.toFixed(2) : "",
      record.conventionalHours.toFixed(2),
      isNb ? "NB" : "PO",
      "",
    ])
  }

  doc.setFont(PDF_FONT_NAME, "normal")
  autoTable(doc, {
    startY: 70,
    head: [[
      "Ziua",
      "Ora",
      "Facultatea",
      "Program studii",
      "Disciplina",
      "An",
      "Grupa",
      "Sala",
      "Ore efective",
      "Ore conv.",
      "NB/PO",
      "Semnătura",
    ]],
    body: tableBody,
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
    columnStyles: {
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "left" },
    },
    margin: { left: 10, right: 10 },
    theme: "grid",
  })

  const totalComplementary = supplementary.reduce((acc, e) => acc + (e.totalHours || 0), 0)
  const grandTotal = nbTotal + poTotal + totalComplementary

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY || 80
  doc.setFontSize(10)
  const leftX = 10
  const rightX = pageWidth - 10
  const drawSummaryRow = (label: string, value: string, bold = false) => {
    doc.setFont(PDF_FONT_NAME, bold ? "bold" : "normal")
    finalY += 6
    doc.line(leftX, finalY - 5, rightX, finalY - 5)
    doc.text(label, leftX + 1, finalY - 1)
    doc.text(value, rightX - 5, finalY - 1, { align: "right" })
    doc.line(leftX, finalY + 1, rightX, finalY + 1)
  }
  drawSummaryRow("Total ore convenționale NB", nbTotal.toFixed(2))
  drawSummaryRow("Total ore convenționale PO", poTotal.toFixed(2))
  drawSummaryRow("Total ore activități complementare", totalComplementary.toFixed(2))
  drawSummaryRow("TOTAL ore lucrate", grandTotal.toFixed(2), true)

  const sigY = finalY + 14
  doc.setFont(PDF_FONT_NAME, "normal")
  doc.text("Decan,", leftX, sigY)
  doc.text("Director de departament,", rightX, sigY, { align: "right" })
  doc.text("……………………………", leftX, sigY + 10)
  doc.text("……………………………", rightX, sigY + 10, { align: "right" })

  doc.save(`fisa-activitate-${year}-${String(month + 1).padStart(2, "0")}.pdf`)
}
