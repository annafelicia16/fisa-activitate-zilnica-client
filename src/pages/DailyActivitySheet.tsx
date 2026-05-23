import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
// Faculty / Study Program / Discipline / Activity Type are now free-text Inputs:
// values come from the schedule data and aren't constrained to a fixed list.
import { Container } from "@/components/layout/Container"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ensureRomanianPdfFont, PDF_FONT_NAME } from "@/utils/pdfFont"
import type { DayStatus } from "@/types/activity-sheet"
import { useTeacherStore } from "@/store/teacher"
import {
    RevenueType,
    useCreateDailyActivityRecord,
    useDailyActivityRecords,
    useUpdateDailyActivityRecord,
    type DailyActivityRecord,
} from "@/api/daily-activity-records"
import { useSupplementaryActivities } from "@/api/supplementary-activities"
import {
    useTeacherDaySlotsByDate,
    type TeacherScheduleSlot,
} from "@/api/schedules"

interface ActivityFormData {
    date: string
    time: string
    faculty: string
    studyProgram: string
    discipline: string
    activityType: string
    year: string
    group: string
    room: string
    actualHours: string
    conventionalHours: string
    status: "NB" | "PO" | ""
    observations: string
}

interface FormErrors {
    [key: string]: string
}

const EMPTY_FORM: ActivityFormData = {
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    faculty: "",
    studyProgram: "",
    discipline: "",
    activityType: "",
    year: "",
    group: "",
    room: "",
    actualHours: "",
    conventionalHours: "",
    status: "",
    observations: "",
}

function calculateConventionalHours(actual: string, activityType: string): string {
    const hours = parseFloat(actual)
    if (isNaN(hours) || hours < 0) return ""

    const lower = activityType.trim().toLowerCase()
    let multiplier = 1.0
    if (lower.startsWith("course") || lower.startsWith("curs")) multiplier = 2.5
    else if (lower.startsWith("seminar")) multiplier = 1.5
    // "Lab"/"Laborator"/"Laboratory" and anything else default to 1.0

    return (hours * multiplier).toString()
}

function parseHourSlot(
    hourName: string,
    fallbackDurationHours: number,
): { time: string; durationHours: number } | null {
    // Accepts: "08:00-09:50", "8-10" (range — duration derived from end−start), and single
    // start values like "12" or "12:00" (duration falls back to fallbackDurationHours,
    // which the caller computes from Activity.Duration on the slot).
    const rangeMatch = hourName.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/)
    if (rangeMatch) {
        const startH = parseInt(rangeMatch[1], 10)
        const startM = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0
        const endH = parseInt(rangeMatch[3], 10)
        const endM = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0
        if (![startH, startM, endH, endM].some((n) => Number.isNaN(n))) {
            const time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`
            const durationMinutes = endH * 60 + endM - (startH * 60 + startM)
            if (durationMinutes > 0) {
                return { time, durationHours: durationMinutes / 60 }
            }
        }
    }

    const singleMatch = hourName.match(/^(\d{1,2})(?::(\d{2}))?$/)
    if (singleMatch) {
        const startH = parseInt(singleMatch[1], 10)
        const startM = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0
        if (!Number.isNaN(startH) && startH >= 0 && startH < 24) {
            const time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`
            return { time, durationHours: fallbackDurationHours }
        }
    }

    return null
}

function recordToForm(record: DailyActivityRecord): ActivityFormData {
    const start = new Date(record.startDate)
    const end = new Date(record.endDate)
    const actualMs = end.getTime() - start.getTime()
    const actualHours = actualMs > 0 ? actualMs / (60 * 60 * 1000) : 0

    return {
        date: format(start, "yyyy-MM-dd"),
        time: format(start, "HH:mm"),
        faculty: record.facultyName,
        studyProgram: record.studyProgram,
        discipline: record.subjectName,
        activityType: record.courseType,
        year: String(record.year),
        group: record.groupName,
        room: record.roomName,
        actualHours: actualHours ? actualHours.toString() : "",
        conventionalHours: record.conventionalHours.toString(),
        status: record.revenueType === RevenueType.BaseSalary ? "NB" : "PO",
        observations: record.observations ?? "",
    }
}

function formToPayload(form: ActivityFormData, teacherId: number, departmentName: string) {
    const startIso = `${form.date}T${form.time || "00:00"}:00`
    const start = new Date(startIso)
    const actualHours = parseFloat(form.actualHours || "0") || 0
    const end = new Date(start.getTime() + actualHours * 60 * 60 * 1000)
    const revenue = form.status === "NB" ? RevenueType.BaseSalary : RevenueType.HourlyPay

    return {
        externalTeacherId: teacherId,
        departmentName: departmentName || form.faculty,
        facultyName: form.faculty,
        studyProgram: form.studyProgram,
        courseType: form.activityType || "Other",
        year: parseInt(form.year, 10) || 0,
        groupName: form.group,
        subjectName: form.discipline,
        roomName: form.room,
        revenueType: revenue,
        conventionalHours: parseFloat(form.conventionalHours || "0") || 0,
        observations: form.observations || null,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
    }
}

function deriveDayStatus(record: DailyActivityRecord): DayStatus {
    return record.observations && record.observations.trim().length > 0
        ? "completed"
        : "partial"
}

export function DailyActivitySheet() {
    const navigate = useNavigate()
    const teacher = useTeacherStore()
    const externalTeacherId = teacher.externalTeacherId ?? 0

    const today = useMemo(() => new Date(), [])
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
    const [formData, setFormData] = useState<ActivityFormData>(EMPTY_FORM)
    const [errors, setErrors] = useState<FormErrors>({})
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

    const { data: records = [], isLoading: recordsLoading } = useDailyActivityRecords({
        teacherId: externalTeacherId,
    })
    const { data: supplementaryRecords = [] } = useSupplementaryActivities({
        teacherId: externalTeacherId,
    })
    const { data: scheduleSlots = [], isLoading: slotsLoading } = useTeacherDaySlotsByDate(
        externalTeacherId && formData.date
            ? { externalTeacherId, date: formData.date }
            : undefined,
    )
    const createMutation = useCreateDailyActivityRecord()
    const updateMutation = useUpdateDailyActivityRecord()

    const recordsByDate = useMemo(() => {
        const map = new Map<string, DailyActivityRecord[]>()
        for (const record of records) {
            const key = format(new Date(record.startDate), "yyyy-MM-dd")
            const list = map.get(key) ?? []
            list.push(record)
            map.set(key, list)
        }
        return map
    }, [records])

    const dayStatuses = useMemo(() => {
        const map = new Map<string, DayStatus>()
        for (const [key, list] of recordsByDate) {
            const allCompleted = list.every((r) => deriveDayStatus(r) === "completed")
            map.set(key, allCompleted ? "completed" : "partial")
        }
        return map
    }, [recordsByDate])

    const dayEntries = useMemo(() => {
        const key = formData.date
        return recordsByDate.get(key) ?? []
    }, [recordsByDate, formData.date])

    const monthlySummary = useMemo(() => {
        const monthlyData: Record<string, { nb: number; po: number }> = {}
        for (const record of records) {
            const date = new Date(record.startDate)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { nb: 0, po: 0 }
            if (record.revenueType === RevenueType.BaseSalary) {
                monthlyData[monthKey].nb += record.conventionalHours
            } else {
                monthlyData[monthKey].po += record.conventionalHours
            }
        }
        return Object.entries(monthlyData)
            .map(([month, totals]) => ({ month, ...totals }))
            .sort((a, b) => b.month.localeCompare(a.month))
    }, [records])

    function resetFormForDate(date: Date) {
        setFormData({ ...EMPTY_FORM, date: format(date, "yyyy-MM-dd") })
        setErrors({})
        setEditingRecordId(null)
    }

    function handleDateSelect(date: Date | undefined) {
        if (!date) return
        setSelectedDate(date)
        resetFormForDate(date)
    }

    function validateForm(): boolean {
        const newErrors: FormErrors = {}
        if (!formData.date) newErrors.date = "Date is required"
        if (!formData.faculty) newErrors.faculty = "Faculty is required"
        if (!formData.studyProgram) newErrors.studyProgram = "Study Program is required"
        if (!formData.discipline) newErrors.discipline = "Discipline is required"
        if (!formData.year) newErrors.year = "Year is required"
        if (!formData.group) newErrors.group = "Group is required"
        if (!formData.room) newErrors.room = "Room is required"
        if (!formData.status) newErrors.status = "Status is required"
        if (!formData.actualHours) {
            newErrors.actualHours = "Actual Hours is required"
        } else {
            const hours = parseFloat(formData.actualHours)
            if (isNaN(hours) || hours < 0)
                newErrors.actualHours = "Actual Hours must be a valid positive number"
        }
        if (!formData.conventionalHours) {
            newErrors.conventionalHours = "Conventional Hours is required"
        } else {
            const hours = parseFloat(formData.conventionalHours)
            if (isNaN(hours) || hours < 0)
                newErrors.conventionalHours = "Conventional Hours must be a valid positive number"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    function getDatesByStatus(status: DayStatus): Date[] {
        const dates: Date[] = []
        dayStatuses.forEach((s, key) => {
            if (s === status) dates.push(new Date(key))
        })
        return dates
    }

    async function handleSave() {
        if (!externalTeacherId) {
            alert("You are not signed in.")
            return
        }
        if (!validateForm()) return

        const payload = formToPayload(formData, externalTeacherId, teacher.department)

        try {
            if (editingRecordId) {
                await updateMutation.mutateAsync({ id: editingRecordId, ...payload })
            } else {
                await createMutation.mutateAsync(payload)
            }
            alert("Activity sheet saved successfully!")
            const baseDate = selectedDate ?? new Date(formData.date)
            resetFormForDate(baseDate)
        } catch (error) {
            console.error("Error saving daily activity record", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`Could not save activity sheet.\n\n${message}`)
        }
    }

    async function handleDuplicate() {
        if (!externalTeacherId) return
        if (!validateForm()) return

        const payload = formToPayload(formData, externalTeacherId, teacher.department)
        try {
            await createMutation.mutateAsync(payload)
            alert("Row duplicated for this day. You can now edit it and save again.")
            setEditingRecordId(null)
        } catch (error) {
            console.error("Error duplicating row", error)
        }
    }

    function handleEditEntry(record: DailyActivityRecord) {
        const form = recordToForm(record)
        setFormData(form)
        setErrors({})
        setEditingRecordId(record.id)
    }

    function handleApplyScheduleSlot(slot: TeacherScheduleSlot) {
        // activityType is now free-text: use the raw oldActivityTag ("Laborator"/"Curs"/"Seminar"
        // straight from FET) when present; otherwise fall back to the ActivityTag join name.
        const activityType = slot.oldActivityTag || slot.courseTypeTag || ""
        // hourName may be "08:00-09:50" (full range) or just "12" (start hour only) — in the
        // latter case, the slot row counts one academic hour and we use Activity.Duration
        // for the full session length.
        const fallbackDuration = slot.duration && slot.duration > 0 ? slot.duration : 1
        const parsed = parseHourSlot(slot.hourName, fallbackDuration)
        const actualHours = parsed ? parsed.durationHours.toString() : formData.actualHours
        const time = parsed ? parsed.time : formData.time
        const nextConventional = parsed
            ? calculateConventionalHours(actualHours, activityType)
            : formData.conventionalHours

        // Group: prefer the friendly grupa name → external group id → specialization id (when
        // grupa is empty, courses cover an entire specialization). idSpecializare uses -1
        // as a sentinel for "no specialization".
        const friendlyGroup = slot.grupa?.split(",")[0]?.trim()
        const specializationStr =
            slot.idSpecializare && slot.idSpecializare > 0
                ? String(slot.idSpecializare)
                : null
        const groupValue =
            friendlyGroup || slot.idGrupa || specializationStr || formData.group

        const status: "NB" | "PO" | "" =
            slot.plataNB === 1 ? "NB" : slot.plataNB === 0 ? "PO" : formData.status

        const yearValue =
            slot.nrAnStudii != null ? String(slot.nrAnStudii) : formData.year

        // Prefer the friendly names from the AGSIS Materie/Facultate/Specializare tables
        // when available; fall back to the FET subject code so the field is never empty.
        const discipline = slot.materieName || slot.subjectName
        const faculty = slot.facultateName || formData.faculty
        const studyProgram = slot.specializareName || formData.studyProgram

        setFormData((prev) => ({
            ...prev,
            time,
            faculty,
            studyProgram,
            discipline,
            activityType,
            year: yearValue,
            group: groupValue,
            room: slot.roomName ?? prev.room,
            actualHours,
            conventionalHours: nextConventional,
            status,
        }))
        setErrors({})
    }

    function handleSubmit() {
        if (validateForm()) {
            alert("Activity sheet submitted for approval!")
            navigate("/")
        }
    }

    async function handleExport() {
        try {
            const doc = new jsPDF("p", "mm", "a4")
            await ensureRomanianPdfFont(doc)
            const pageWidth = doc.internal.pageSize.getWidth()

            if (records.length === 0) {
                alert("No daily activity data found to export.")
                return
            }

            const allEntries = records
                .map((r) => ({ form: recordToForm(r), record: r }))
                .sort((a, b) => a.form.date.localeCompare(b.form.date))

            const firstDate = new Date(allEntries[0].form.date)
            const monthLabel = !isNaN(firstDate.getTime())
                ? firstDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                : ""

            doc.setFont(PDF_FONT_NAME, "normal")
            doc.setFontSize(11)
            doc.text("UNIVERSITATEA TRANSILVANIA DIN BRAȘOV", pageWidth / 2, 15, {
                align: "center",
            })

            const facultyText = teacher.department
                ? `FACULTATEA ${teacher.department}`
                : "FACULTATEA ................................"
            doc.text(facultyText, pageWidth / 2, 21, { align: "center" })

            doc.setFontSize(10)
            const startYInfo = 30
            const academicYear = teacher.academicYear || ".............."
            const department = teacher.department || ".............."
            const teacherName = teacher.fullName || teacher.teacherName || ".............."

            doc.text(`Anul universitar: ${academicYear}`, 20, startYInfo)
            doc.text(`Departamentul: ${department}`, 20, startYInfo + 6)
            doc.text(`Cadrul didactic: ${teacherName}`, 20, startYInfo + 12)

            const titleY = startYInfo + 28
            doc.setFontSize(13)
            doc.setFont(PDF_FONT_NAME, "bold")
            doc.text("FIȘA DE ACTIVITATE ZILNICĂ", pageWidth / 2, titleY, { align: "center" })

            doc.setFontSize(11)
            const subtitle = monthLabel ? `Luna ${monthLabel}` : "Luna .............................."
            doc.text(subtitle, pageWidth / 2, titleY + 7, { align: "center" })

            const tableBody: (string | number)[][] = []
            let nbTotal = 0
            let poTotal = 0

            allEntries.forEach(({ form, record }) => {
                const dateObj = new Date(form.date)
                const dayNumber = !isNaN(dateObj.getTime()) ? dateObj.getDate() : ""
                const convHours = record.conventionalHours

                if (record.revenueType === RevenueType.BaseSalary) {
                    nbTotal += convHours
                } else {
                    poTotal += convHours
                }

                tableBody.push([
                    dayNumber.toString(),
                    form.time || "",
                    form.faculty || "",
                    form.studyProgram || "",
                    form.discipline || "",
                    form.year || "",
                    form.group || "",
                    form.room || "",
                    form.actualHours || "",
                    form.conventionalHours || "",
                    form.status || "",
                    "",
                ])
            })

            const totalComplementary = supplementaryRecords.reduce(
                (sum, e) => sum + (e.totalHours || 0),
                0,
            )
            const totalWorked = nbTotal + poTotal + totalComplementary

            doc.setFont(PDF_FONT_NAME, "normal")
            autoTable(doc, {
                startY: titleY + 14,
                head: [
                    [
                        "Ziua (1)",
                        "Ora (2)",
                        "Facultatea (3)",
                        "Program de studii (4)",
                        "Disciplina (5)",
                        "Anul (6)",
                        "Grupa (7)",
                        "Sala (8)",
                        "Ore efective (9)",
                        "Ore convenționale (10)",
                        "Norma NB/PO (11)",
                        "Semnătura (12)",
                    ],
                ],
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
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    lineWidth: 0.4,
                    lineColor: [0, 0, 0],
                    fontStyle: "bold",
                },
                columnStyles: {
                    4: { halign: "left" },
                    2: { halign: "left" },
                    3: { halign: "left" },
                },
                margin: { left: 10, right: 10 },
                theme: "grid",
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let finalY = (doc as any).lastAutoTable.finalY || titleY + 20
            doc.setFontSize(10)
            const rowHeight = 6
            const leftX = 10
            const rightX = pageWidth - 10

            const drawSummaryRow = (label: string, value: string, isBold = false) => {
                doc.setFont(PDF_FONT_NAME, isBold ? "bold" : "normal")
                finalY += rowHeight
                doc.line(leftX, finalY - rowHeight + 1, rightX, finalY - rowHeight + 1)
                doc.text(label, leftX + 1, finalY - 1)
                doc.text(value, rightX - 5, finalY - 1, { align: "right" })
                doc.line(leftX, finalY + 1, rightX, finalY + 1)
            }

            drawSummaryRow("Total ore convenționale NB", nbTotal.toFixed(2))
            drawSummaryRow("Total ore convenționale PO", poTotal.toFixed(2))
            drawSummaryRow(
                "Total ore activități didactice complementare*",
                totalComplementary.toFixed(2),
            )
            drawSummaryRow("TOTAL ore lucrate", totalWorked.toFixed(2), true)

            const signaturesY = finalY + 14
            doc.setFont(PDF_FONT_NAME, "normal")
            doc.text("Decan,", leftX, signaturesY)
            doc.text("Director de departament,", rightX, signaturesY, { align: "right" })

            const dottedLine = "............................"
            doc.text(dottedLine, leftX, signaturesY + 10)
            doc.text(dottedLine, rightX, signaturesY + 10, { align: "right" })

            if (supplementaryRecords.length > 0) {
                doc.addPage()
                await ensureRomanianPdfFont(doc)
                const annexPageWidth = doc.internal.pageSize.getWidth()

                doc.setFont(PDF_FONT_NAME, "bold")
                doc.setFontSize(14)
                doc.text("ANEXĂ ACTIVITĂȚI COMPLEMENTARE", annexPageWidth / 2, 20, {
                    align: "center",
                })

                doc.setFontSize(11)
                doc.setFont(PDF_FONT_NAME, "normal")
                autoTable(doc, {
                    startY: 30,
                    head: [["Data", "Tip Activitate", "Descriere / Detalii", "Ore"]],
                    body: supplementaryRecords.map((e) => [
                        format(new Date(e.date), "yyyy-MM-dd"),
                        e.activityType,
                        e.observations ?? "",
                        e.totalHours.toString(),
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
                        fillColor: [255, 255, 255],
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
                const annexFinalY = (doc as any).lastAutoTable.finalY || 60
                doc.setFontSize(10)
                doc.setFont(PDF_FONT_NAME, "bold")
                doc.text(
                    `Total ore activități didactice complementare: ${totalComplementary.toFixed(
                        2,
                    )}`,
                    10,
                    annexFinalY + 8,
                )
            }

            doc.save("fisa-activitate-zilnica.pdf")
        } catch (error) {
            console.error("Error exporting daily activity sheet PDF", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`An error occurred while exporting the PDF.\n\nDetails: ${message}`)
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#f8f9fc] py-10">
            <Container>
                <div className="mb-4 flex justify-end">
                    <Button
                        onClick={() => navigate("/")}
                        variant="outline"
                        className="rounded-lg px-4 py-2"
                    >
                        ← Exit to Dashboard
                    </Button>
                </div>

                <Card className="rounded-2xl shadow-sm mb-6">
                    <CardHeader>
                        <CardTitle>Teacher Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="teacherName">Teacher Name</Label>
                                <Input
                                    id="teacherName"
                                    type="text"
                                    value={teacher.teacherName}
                                    onChange={(e) =>
                                        teacher.setHeader({ teacherName: e.target.value })
                                    }
                                    placeholder="Enter teacher name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    type="text"
                                    value={teacher.department}
                                    onChange={(e) =>
                                        teacher.setHeader({ department: e.target.value })
                                    }
                                    placeholder="Enter department"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year</Label>
                                <Input
                                    id="academicYear"
                                    type="text"
                                    value={teacher.academicYear}
                                    onChange={(e) =>
                                        teacher.setHeader({ academicYear: e.target.value })
                                    }
                                    placeholder="e.g., 2024-2025"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-6 mt-6">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle>Calendar</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                className="rounded-md w-full"
                                modifiers={{
                                    completed: getDatesByStatus("completed"),
                                    partial: getDatesByStatus("partial"),
                                    notCompleted: getDatesByStatus("not-completed"),
                                }}
                                modifiersClassNames={{
                                    completed: "bg-green-100 hover:bg-green-200 text-gray-900",
                                    partial: "bg-yellow-100 hover:bg-yellow-200 text-gray-900",
                                    notCompleted: "bg-red-100 hover:bg-red-200 text-gray-900",
                                }}
                                classNames={{
                                    day_selected: "ring-2 ring-blue-500 ring-offset-1",
                                    day_today: "border-2 border-gray-400",
                                }}
                            />
                            <div className="mt-4 flex flex-col gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-100 rounded"></div>
                                    <span>Fully completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                                    <span>Partially completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-100 rounded"></div>
                                    <span>Not completed</span>
                                </div>
                            </div>

                            {recordsLoading ? (
                                <div className="mt-4 text-sm text-gray-500">Loading entries…</div>
                            ) : dayEntries.length > 0 ? (
                                <div className="mt-4 space-y-2 text-sm">
                                    <h4 className="font-semibold">
                                        Entries for {formData.date}
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {dayEntries.map((record) => {
                                            const entry = recordToForm(record)
                                            return (
                                                <div
                                                    key={record.id}
                                                    className="rounded-md border bg-muted/40 p-2 relative z-0"
                                                >
                                                    <div className="flex justify-between items-center gap-2">
                                                        <div>
                                                            <span className="font-medium block">
                                                                {entry.time || "No time"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {entry.activityType || "Activity"}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 relative z-10 pointer-events-auto cursor-pointer"
                                                            aria-label="Modify entry"
                                                            onClick={() => handleEditEntry(record)}
                                                        >
                                                            ✏️
                                                        </Button>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                        <div>
                                                            {entry.discipline || "No discipline"} —{" "}
                                                            {entry.group || "No group"} — Room{" "}
                                                            {entry.room || "-"}
                                                        </div>
                                                        <div>
                                                            Actual: {entry.actualHours || "0"},
                                                            Conv.: {entry.conventionalHours || "0"}{" "}
                                                            — Status: {entry.status || "N/A"}
                                                        </div>
                                                        {entry.observations && (
                                                            <div className="mt-1 line-clamp-2">
                                                                {entry.observations}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-4 space-y-2 text-sm">
                                <h4 className="font-semibold">
                                    Scheduled courses for {formData.date}
                                </h4>
                                {slotsLoading ? (
                                    <div className="text-gray-500">Loading schedule…</div>
                                ) : scheduleSlots.length === 0 ? (
                                    <div className="text-gray-500">
                                        No scheduled courses for this day.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {scheduleSlots.map((slot) => (
                                            <button
                                                type="button"
                                                key={`${slot.slotId}-${slot.activityId}`}
                                                onClick={() => handleApplyScheduleSlot(slot)}
                                                className="w-full text-left rounded-md border bg-white hover:bg-muted/50 transition-colors p-2"
                                            >
                                                <div className="flex justify-between items-center gap-2">
                                                    <div>
                                                        <span className="font-medium block">
                                                            {slot.hourName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {slot.courseTypeTag ?? "Activity"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-[#1e5bff]">
                                                        Use →
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {slot.subjectName}
                                                    {slot.idGrupa ? ` — ${slot.idGrupa}` : ""}
                                                    {slot.roomName ? ` — Room ${slot.roomName}` : ""}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle>Daily Activity Sheet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => {
                                            const newDateValue = e.target.value
                                            setFormData((prev) => ({
                                                ...prev,
                                                date: newDateValue,
                                            }))
                                            const parsedDate = new Date(newDateValue)
                                            if (!isNaN(parsedDate.getTime())) {
                                                setSelectedDate(parsedDate)
                                            }
                                        }}
                                        className={errors.date ? "border-red-500" : ""}
                                    />
                                    {errors.date && (
                                        <p className="text-sm text-red-500">{errors.date}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="time">Time</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, time: e.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="faculty">Faculty *</Label>
                                <Input
                                    id="faculty"
                                    type="text"
                                    value={formData.faculty}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            faculty: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Facultatea de Inginerie Electrică"
                                    className={errors.faculty ? "border-red-500" : ""}
                                />
                                {errors.faculty && (
                                    <p className="text-sm text-red-500">{errors.faculty}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="studyProgram">Study Program *</Label>
                                <Input
                                    id="studyProgram"
                                    type="text"
                                    value={formData.studyProgram}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            studyProgram: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Informatică Aplicată"
                                    className={errors.studyProgram ? "border-red-500" : ""}
                                />
                                {errors.studyProgram && (
                                    <p className="text-sm text-red-500">{errors.studyProgram}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discipline">Discipline *</Label>
                                <Input
                                    id="discipline"
                                    type="text"
                                    value={formData.discipline}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            discipline: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g., Tehnologii Web"
                                    className={errors.discipline ? "border-red-500" : ""}
                                />
                                {errors.discipline && (
                                    <p className="text-sm text-red-500">{errors.discipline}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="activityType">Activity Type</Label>
                                <Input
                                    id="activityType"
                                    type="text"
                                    value={formData.activityType}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setFormData((prev) => ({
                                            ...prev,
                                            activityType: value,
                                            conventionalHours: calculateConventionalHours(
                                                prev.actualHours,
                                                value,
                                            ),
                                        }))
                                    }}
                                    placeholder="Curs / Seminar / Laborator"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="year">Year *</Label>
                                    <Input
                                        id="year"
                                        type="text"
                                        value={formData.year}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, year: e.target.value }))
                                        }
                                        className={errors.year ? "border-red-500" : ""}
                                    />
                                    {errors.year && (
                                        <p className="text-sm text-red-500">{errors.year}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="group">Group *</Label>
                                    <Input
                                        id="group"
                                        type="text"
                                        value={formData.group}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, group: e.target.value }))
                                        }
                                        className={errors.group ? "border-red-500" : ""}
                                    />
                                    {errors.group && (
                                        <p className="text-sm text-red-500">{errors.group}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="room">Room *</Label>
                                <Input
                                    id="room"
                                    type="text"
                                    value={formData.room}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, room: e.target.value }))
                                    }
                                    className={errors.room ? "border-red-500" : ""}
                                />
                                {errors.room && (
                                    <p className="text-sm text-red-500">{errors.room}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="actualHours">Actual Hours *</Label>
                                    <Input
                                        id="actualHours"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={formData.actualHours}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFormData((prev) => ({
                                                ...prev,
                                                actualHours: value,
                                                conventionalHours: calculateConventionalHours(
                                                    value,
                                                    prev.activityType,
                                                ),
                                            }))
                                        }}
                                        className={errors.actualHours ? "border-red-500" : ""}
                                    />
                                    {errors.actualHours && (
                                        <p className="text-sm text-red-500">{errors.actualHours}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="conventionalHours">Conventional Hours *</Label>
                                    <Input
                                        id="conventionalHours"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={formData.conventionalHours}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                conventionalHours: e.target.value,
                                            }))
                                        }
                                        className={
                                            errors.conventionalHours ? "border-red-500" : ""
                                        }
                                    />
                                    {errors.conventionalHours && (
                                        <p className="text-sm text-red-500">
                                            {errors.conventionalHours}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            status: value as "NB" | "PO",
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        className={errors.status ? "border-red-500" : ""}
                                    >
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NB">NB</SelectItem>
                                        <SelectItem value="PO">PO</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">{errors.status}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="observations">Observations</Label>
                                <Textarea
                                    id="observations"
                                    value={formData.observations}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            observations: e.target.value,
                                        }))
                                    }
                                    rows={4}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleDuplicate}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={createMutation.isPending}
                                >
                                    Duplicate Row
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={
                                        createMutation.isPending || updateMutation.isPending
                                    }
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? "Saving…"
                                        : "Save"}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-[#1e5bff] hover:bg-[#1e5bff]/90"
                                >
                                    Submit for Approval
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Export to PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {monthlySummary.length > 0 && (
                    <Card className="rounded-2xl shadow-sm mt-6">
                        <CardHeader>
                            <CardTitle>Monthly Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-semibold">Month</th>
                                            <th className="text-right p-3 font-semibold">
                                                NB Conventional Hours
                                            </th>
                                            <th className="text-right p-3 font-semibold">
                                                PO Conventional Hours
                                            </th>
                                            <th className="text-right p-3 font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlySummary.map((row) => {
                                            const total = row.nb + row.po
                                            const monthDate = new Date(`${row.month}-01`)
                                            const monthName = monthDate.toLocaleString("default", {
                                                month: "long",
                                                year: "numeric",
                                            })
                                            return (
                                                <tr
                                                    key={row.month}
                                                    className="border-b hover:bg-muted/50"
                                                >
                                                    <td className="p-3">{monthName}</td>
                                                    <td className="text-right p-3">
                                                        {row.nb.toFixed(2)}
                                                    </td>
                                                    <td className="text-right p-3">
                                                        {row.po.toFixed(2)}
                                                    </td>
                                                    <td className="text-right p-3 font-semibold">
                                                        {total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-semibold">
                                            <td className="p-3">Grand Total</td>
                                            <td className="text-right p-3">
                                                {monthlySummary
                                                    .reduce((sum, row) => sum + row.nb, 0)
                                                    .toFixed(2)}
                                            </td>
                                            <td className="text-right p-3">
                                                {monthlySummary
                                                    .reduce((sum, row) => sum + row.po, 0)
                                                    .toFixed(2)}
                                            </td>
                                            <td className="text-right p-3">
                                                {monthlySummary
                                                    .reduce((sum, row) => sum + row.nb + row.po, 0)
                                                    .toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </Container>
        </div>
    )
}
