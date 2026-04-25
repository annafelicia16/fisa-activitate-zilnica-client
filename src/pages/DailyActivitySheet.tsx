import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Container } from "@/components/layout/Container"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ensureRomanianPdfFont, PDF_FONT_NAME } from "@/utils/pdfFont"
import type { DayStatus } from "@/types/activity-sheet"


const FACULTIES = [
    "Faculty of Computer Science",
    "Faculty of Engineering",
    "Faculty of Mathematics",
    "Faculty of Physics"
]

const STUDY_PROGRAMS: Record<string, string[]> = {
    "Faculty of Computer Science": ["Computer Science", "Software Engineering", "Information Systems"],
    "Faculty of Engineering": ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering"],
    "Faculty of Mathematics": ["Mathematics", "Applied Mathematics", "Statistics"],
    "Faculty of Physics": ["Physics", "Applied Physics", "Theoretical Physics"]
}

const DISCIPLINES = [
    "Data Structures",
    "Algorithms",
    "Database Systems",
    "Web Development",
    "Machine Learning",
    "Operating Systems"
]

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

interface HeaderData {
    teacherName: string
    department: string
    academicYear: string
}

interface FormErrors {
    [key: string]: string
}

const STORAGE_KEY = "daily-activity-entries"
const HEADER_STORAGE_KEY = "daily-activity-header"

interface StoredActivityEntry {
    entries: ActivityFormData[]
    status: DayStatus
}

interface AnnexFormData {
    date: string
    activityType: string
    observations: string
    totalHours: string
}


export function ActivityCalendar() {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold">Calendar</h3>
      <Calendar />
    </div>
  )
}


export function DailyActivitySheet() {
    const navigate = useNavigate()
    const today = new Date()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
    const [dayStatuses, setDayStatuses] = useState<Map<string, DayStatus>>(new Map())
    const [headerData, setHeaderData] = useState<HeaderData>({
        teacherName: "",
        department: "",
        academicYear: ""
    })
    const [formData, setFormData] = useState<ActivityFormData>({
        date: format(today, "yyyy-MM-dd"),
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
        observations: ""
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [availableStudyPrograms, setAvailableStudyPrograms] = useState<string[]>([])
    const [dayEntries, setDayEntries] = useState<ActivityFormData[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    const calculateConventionalHours = (actual: string, activityType: string): string => {
        const hours = parseFloat(actual)

        if (isNaN(hours) || hours < 0) {
            return ""
        }

        let multiplier = 1.0

        if (activityType === "Course") {
            multiplier = 2.5
        } else if (activityType === "Seminar") {
            multiplier = 1.5
        }

        const result = hours * multiplier
        return result.toString()
    }

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        try {
            const headerRaw = localStorage.getItem(HEADER_STORAGE_KEY)
            if (headerRaw) {
                const header: HeaderData = JSON.parse(headerRaw)
                setHeaderData(header)
            }

            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) {
                return
            }

            const stored: Record<string, any> = JSON.parse(raw)

            const statuses = new Map<string, DayStatus>()
            Object.entries(stored).forEach(([dateKey, value]) => {
                if (value && value.status) {
                    statuses.set(dateKey, value.status as DayStatus)
                }
            })

            if (statuses.size > 0) {
                setDayStatuses(statuses)
            }

            const initialDateKey = format(today, "yyyy-MM-dd")
            const initialEntry = stored[initialDateKey]
            if (initialEntry) {
                const entries: ActivityFormData[] =
                    Array.isArray(initialEntry.entries) && initialEntry.entries.length > 0
                        ? initialEntry.entries
                        : initialEntry.formData
                            ? [initialEntry.formData]
                            : []

                const latestForm: ActivityFormData | undefined =
                    entries.length > 0 ? entries[entries.length - 1] : undefined

                setDayEntries(entries)

                if (latestForm) {
                    setFormData(latestForm)
                    setAvailableStudyPrograms(
                        STUDY_PROGRAMS[latestForm.faculty] || []
                    )
                }

                setEditingIndex(null)
            }
        } catch (error) {
            console.error("Error initializing daily activity data", error)
        }
    }, [])

    const handleFacultyChange = (faculty: string) => {
        setFormData(prev => ({
            ...prev,
            faculty,
            studyProgram: ""
        }))
        setAvailableStudyPrograms(STUDY_PROGRAMS[faculty] || [])
    }

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
            setFormData(prev => ({
                ...prev,
                date: format(date, "yyyy-MM-dd")
            }))
            loadDayData(date)
        }
    }

    const loadDayData = (_date: Date) => {
        const dateKey = format(_date, "yyyy-MM-dd")

        if (typeof window === "undefined") {
            return
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY)

            if (!raw) {
                setFormData({
                    date: dateKey,
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
                    observations: ""
                })
                setAvailableStudyPrograms([])
                setErrors({})
                setDayEntries([])
                setEditingIndex(null)
                return
            }

            const stored: Record<string, any> = JSON.parse(raw)
            const entry = stored[dateKey]

            if (entry) {
                const entries: ActivityFormData[] =
                    Array.isArray(entry.entries) && entry.entries.length > 0
                        ? entry.entries
                        : entry.formData
                            ? [entry.formData]
                            : []

                setDayEntries(entries)

                const latestForm: ActivityFormData | undefined =
                    entries.length > 0 ? entries[entries.length - 1] : undefined

                if (latestForm) {
                    setFormData(latestForm)
                    setAvailableStudyPrograms(
                        STUDY_PROGRAMS[latestForm.faculty] || []
                    )
                } else {
                    setFormData({
                        date: dateKey,
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
                        observations: ""
                    })
                    setAvailableStudyPrograms([])
                }
                setErrors({})
            } else {
                setFormData({
                    date: dateKey,
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
                    observations: ""
                })
                setAvailableStudyPrograms([])
                setErrors({})
                setDayEntries([])
                setEditingIndex(null)
            }
        } catch (error) {
            console.error("Error loading day data", error)
        }
    }

    const validateForm = (): boolean => {
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
            if (isNaN(hours) || hours < 0) {
                newErrors.actualHours = "Actual Hours must be a valid positive number"
            }
        }
        if (!formData.conventionalHours) {
            newErrors.conventionalHours = "Conventional Hours is required"
        } else {
            const hours = parseFloat(formData.conventionalHours)
            if (isNaN(hours) || hours < 0) {
                newErrors.conventionalHours = "Conventional Hours must be a valid positive number"
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }
    const getDatesByStatus = (status: DayStatus): Date[] => {
        const dates: Date[] = []
        dayStatuses.forEach((dayStatus, dateKey) => {
            if (dayStatus === status) {
                dates.push(new Date(dateKey))
            }
        })
        return dates
    }

    const checkForDuplicateEntry = (): boolean => {
        if (typeof window === "undefined") {
            return false
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) {
                return false
            }

            const stored: Record<string, any> = JSON.parse(raw)
            for (const [dateKey, value] of Object.entries(stored)) {
                const entries: ActivityFormData[] =
                    Array.isArray(value.entries) && value.entries.length > 0
                        ? value.entries
                        : value.formData
                            ? [value.formData]
                            : []

                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i]
                    if (
                        editingIndex !== null &&
                        dateKey === formData.date &&
                        i === editingIndex
                    ) {
                        continue
                    }
                    if (
                        entry.date === formData.date &&
                        entry.time === formData.time &&
                        entry.room === formData.room
                    ) {
                        return true
                    }
                }
            }

            return false
        } catch (error) {
            console.error("Error checking for duplicate entry", error)
            return false
        }
    }

    const handleSave = () => {
        if (validateForm()) {
            if (checkForDuplicateEntry()) {
                alert(
                    "⚠️ Warning: An entry with the same Date, Time, and Room already exists!\n\n" +
                    "Please verify your entry details or modify the Date, Time, or Room to proceed."
                )
                return
            }

            const dateKey = formData.date
            let status: DayStatus = "completed"
            if (!formData.observations || !formData.status) {
                status = "partial"
            }
            setDayStatuses(prev => new Map(prev).set(dateKey, status))

            if (typeof window !== "undefined") {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY)
                    const stored: Record<string, any> = raw ? JSON.parse(raw) : {}
                    const existing = stored[dateKey]

                    const existingEntries: ActivityFormData[] =
                        existing && Array.isArray(existing.entries)
                            ? existing.entries
                            : existing && existing.formData
                                ? [existing.formData]
                                : []

                    let newEntries: ActivityFormData[]
                    if (
                        editingIndex !== null &&
                        editingIndex >= 0 &&
                        editingIndex < existingEntries.length
                    ) {
                        newEntries = [...existingEntries]
                        newEntries[editingIndex] = { ...formData }
                    } else {
                        newEntries = [...existingEntries, { ...formData }]
                    }

                    const updatedEntry: StoredActivityEntry = {
                        entries: newEntries,
                        status
                    }

                    stored[dateKey] = updatedEntry

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
                    setDayEntries(updatedEntry.entries)
                } catch (error) {
                    console.error("Error saving daily activity data", error)
                }
            }

            alert("Activity sheet saved successfully!")
            setEditingIndex(null)
            const baseDate =
                selectedDate ?? (formData.date ? new Date(formData.date) : today)
            const resetDateKey = format(baseDate, "yyyy-MM-dd")

            setFormData({
                date: resetDateKey,
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
                observations: ""
            })
            setAvailableStudyPrograms([])
            setErrors({})
        }
    }

    const handleSubmit = () => {
        if (validateForm()) {
            alert("Activity sheet submitted for approval!")
            navigate("/")
        }
    }

    const handleExport = async () => {
        if (typeof window === "undefined") return

        try {
            const doc = new jsPDF("p", "mm", "a4")
            await ensureRomanianPdfFont(doc)
            const pageWidth = doc.internal.pageSize.getWidth()

            const storedRaw = localStorage.getItem(STORAGE_KEY)
            const headerRaw = localStorage.getItem(HEADER_STORAGE_KEY)

            const stored: Record<string, any> = storedRaw ? JSON.parse(storedRaw) : {}
            const header: HeaderData | null = headerRaw ? JSON.parse(headerRaw) : null

            const allEntries: ActivityFormData[] = []
            Object.entries(stored).forEach(([dateKey, value]) => {
                const entries: ActivityFormData[] =
                    Array.isArray(value.entries) && value.entries.length > 0
                        ? value.entries
                        : value.formData
                            ? [value.formData]
                            : []

                entries.forEach(entry => {
                    allEntries.push({
                        ...entry,
                        date: entry.date || dateKey
                    })
                })
            })

            if (allEntries.length === 0) {
                alert("No daily activity data found to export.")
                return
            }

            allEntries.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
            const firstDate = new Date(allEntries[0].date)
            const monthLabel = !isNaN(firstDate.getTime())
                ? firstDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                : ""

            doc.setFont(PDF_FONT_NAME, "normal")
            doc.setFontSize(11)
            doc.text("UNIVERSITATEA TRANSILVANIA DIN BRAȘOV", pageWidth / 2, 15, { align: "center" })

            const facultyText = header?.department ? `FACULTATEA ${header.department}` : "FACULTATEA ................................"
            doc.text(facultyText, pageWidth / 2, 21, { align: "center" })

            doc.setFontSize(10)
            const startYInfo = 30
            const academicYear = header?.academicYear || ".............."
            const department = header?.department || ".............."
            const teacherName = header?.teacherName || ".............."

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

            allEntries.forEach(entry => {
                const dateObj = new Date(entry.date)
                const dayNumber = !isNaN(dateObj.getTime()) ? dateObj.getDate() : ""
                const convHours = parseFloat(entry.conventionalHours || "0") || 0

                if (entry.status === "NB") {
                    nbTotal += convHours
                } else if (entry.status === "PO") {
                    poTotal += convHours
                }

                tableBody.push([
                    dayNumber.toString(),
                    entry.time || "",
                    entry.faculty || "",
                    entry.studyProgram || "",
                    entry.discipline || "",
                    entry.year || "",
                    entry.group || "",
                    entry.room || "",
                    entry.actualHours || "",
                    entry.conventionalHours || "",
                    entry.status || "",
                    ""
                ])
            })

            const totalComplementary = 0
            const totalWorked = nbTotal + poTotal + totalComplementary

            doc.setFont(PDF_FONT_NAME, "normal")
            console.log("Font loaded successfully for DailyActivitySheet main table")
            autoTable(doc, {
                startY: titleY + 14,
                head: [[
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
                    "Semnătura (12)"
                ]],
                body: tableBody,
                styles: {
                    font: PDF_FONT_NAME,
                    fontSize: 9,
                    halign: "center",
                    valign: "middle",
                    lineColor: [0, 0, 0],
                    lineWidth: 0.2
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    lineWidth: 0.4,
                    lineColor: [0, 0, 0],
                    fontStyle: "bold"
                },
                columnStyles: {
                    4: { halign: "left" },
                    2: { halign: "left" },
                    3: { halign: "left" }
                },
                margin: { left: 10, right: 10 },
                theme: "grid"
            })

            let finalY = (doc as any).lastAutoTable.finalY || (titleY + 20)
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
            drawSummaryRow("Total ore activități didactice complementare*", totalComplementary.toFixed(2))
            drawSummaryRow("TOTAL ore lucrate", totalWorked.toFixed(2), true)
            const signaturesY = finalY + 14
            doc.setFont(PDF_FONT_NAME, "normal")
            doc.text("Decan,", leftX, signaturesY)
            doc.text("Director de departament,", rightX, signaturesY, { align: "right" })

            const dottedLine = "............................"
            doc.text(dottedLine, leftX, signaturesY + 10)
            doc.text(dottedLine, rightX, signaturesY + 10, { align: "right" })

            const annexRaw = localStorage.getItem("supplementary-annex-entries")
            if (annexRaw) {
                const annexStored: Record<string, any> = JSON.parse(annexRaw)
                const annexEntries: { date: string; activityType: string; observations: string; totalHours: string }[] = []

                Object.entries(annexStored).forEach(([dateKey, value]) => {
                    const entries: AnnexFormData[] =
                        Array.isArray((value as any).entries) && (value as any).entries.length > 0
                            ? (value as any).entries
                            : (value as any).formData
                                ? [(value as any).formData]
                                : []

                    entries.forEach(e => {
                        annexEntries.push({
                            ...e,
                            date: e.date || dateKey
                        })
                    })
                })

                if (annexEntries.length > 0) {
                    annexEntries.sort((a, b) => (a.date || "").localeCompare(b.date || ""))

                    doc.addPage()
                    await ensureRomanianPdfFont(doc)
                    const annexPageWidth = doc.internal.pageSize.getWidth()

                    doc.setFont(PDF_FONT_NAME, "bold")
                    doc.setFontSize(14)
                    doc.text("ANEXĂ ACTIVITĂȚI COMPLEMENTARE", annexPageWidth / 2, 20, {
                        align: "center"
                    })

                    doc.setFontSize(11)
                    doc.setFont(PDF_FONT_NAME, "normal")
                    console.log("Font loaded successfully for DailyActivitySheet annex table")
                    autoTable(doc, {
                        startY: 30,
                        head: [[
                            "Data",
                            "Tip Activitate",
                            "Descriere / Detalii",
                            "Ore"
                        ]],
                        body: annexEntries.map(e => [
                            e.date,
                            e.activityType || "",
                            e.observations || "",
                            e.totalHours || ""
                        ]),
                        styles: {
                            font: PDF_FONT_NAME,
                            fontSize: 9,
                            halign: "center",
                            valign: "middle",
                            lineColor: [0, 0, 0],
                            lineWidth: 0.2
                        },
                        headStyles: {
                            fillColor: [255, 255, 255],
                            textColor: [0, 0, 0],
                            lineWidth: 0.4,
                            lineColor: [0, 0, 0],
                            fontStyle: "bold"
                        },
                        columnStyles: {
                            2: { halign: "left" }
                        },
                        margin: { left: 10, right: 10 },
                        theme: "grid"
                    })

                    const annexFinalY = (doc as any).lastAutoTable.finalY || 60
                    const annexTotalHours = annexEntries.reduce(
                        (sum, e) => sum + (parseFloat(e.totalHours || "0") || 0),
                        0
                    )

                    doc.setFontSize(10)
                    doc.setFont(PDF_FONT_NAME, "bold")
                    doc.text(
                        `Total ore activități didactice complementare: ${annexTotalHours.toFixed(2)}`,
                        10,
                        annexFinalY + 8
                    )
                }
            }

            doc.save("fisa-activitate-zilnica.pdf")
        } catch (error) {
            console.error("Error exporting daily activity sheet PDF", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`An error occurred while exporting the PDF.\n\nDetails: ${message}`)
        }
    }

    const handleDuplicate = () => {
        const dateKey = formData.date
        if (!dateKey) {
            return
        }

        if (checkForDuplicateEntry()) {
            alert(
                "⚠️ Warning: An entry with the same Date, Time, and Room already exists!\n\n" +
                "Please verify your entry details or modify the Date, Time, or Room to proceed."
            )
            return
        }

        let status: DayStatus = "completed"
        if (!formData.observations || !formData.status) {
            status = "partial"
        }

        setDayStatuses(prev => new Map(prev).set(dateKey, status))

        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                const stored: Record<string, any> = raw ? JSON.parse(raw) : {}
                const existing = stored[dateKey]

                const existingEntries: ActivityFormData[] =
                    existing && Array.isArray(existing.entries)
                        ? existing.entries
                        : existing && existing.formData
                            ? [existing.formData]
                            : []

                const updatedEntry: StoredActivityEntry = {
                    entries: [...existingEntries, { ...formData }],
                    status: existing && existing.status ? existing.status as DayStatus : status
                }

                stored[dateKey] = updatedEntry

                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
                setDayEntries(updatedEntry.entries)
                alert("Row duplicated for this day. You can now edit it and save again.")
            } catch (error) {
                console.error("Error duplicating daily activity row", error)
            }
        }
    }

    const handleEditEntry = (index: number) => {
        const entry = dayEntries[index]
        if (!entry) {
            return
        }

        setFormData(entry)
        setAvailableStudyPrograms(STUDY_PROGRAMS[entry.faculty] || [])
        setErrors({})
        setEditingIndex(index)
    }

    const handleHeaderChange = (field: keyof HeaderData, value: string) => {
        const updated = { ...headerData, [field]: value }
        setHeaderData(updated)
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(updated))
            } catch (error) {
                console.error("Error saving header data", error)
            }
        }
    }

    const getMonthlySummary = () => {
        if (typeof window === "undefined") {
            return []
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) {
                return []
            }

            const stored: Record<string, any> = JSON.parse(raw)
            const monthlyData: Record<string, { nb: number; po: number }> = {}

            Object.entries(stored).forEach(([dateKey, value]) => {
                const entries: ActivityFormData[] =
                    Array.isArray(value.entries) && value.entries.length > 0
                        ? value.entries
                        : value.formData
                            ? [value.formData]
                            : []

                entries.forEach((entry) => {
                    const date = new Date(dateKey)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                    const convHours = parseFloat(entry.conventionalHours || "0") || 0

                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = { nb: 0, po: 0 }
                    }

                    if (entry.status === "NB") {
                        monthlyData[monthKey].nb += convHours
                    } else if (entry.status === "PO") {
                        monthlyData[monthKey].po += convHours
                    }
                })
            })

            return Object.entries(monthlyData)
                .map(([month, totals]) => ({
                    month,
                    ...totals
                }))
                .sort((a, b) => b.month.localeCompare(a.month))
        } catch (error) {
            console.error("Error calculating monthly summary", error)
            return []
        }
    }

    const monthlySummary = getMonthlySummary()

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
                                    value={headerData.teacherName}
                                    onChange={(e) => handleHeaderChange("teacherName", e.target.value)}
                                    placeholder="Enter teacher name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    type="text"
                                    value={headerData.department}
                                    onChange={(e) => handleHeaderChange("department", e.target.value)}
                                    placeholder="Enter department"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year</Label>
                                <Input
                                    id="academicYear"
                                    type="text"
                                    value={headerData.academicYear}
                                    onChange={(e) => handleHeaderChange("academicYear", e.target.value)}
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
                                    notCompleted: getDatesByStatus("not-completed")
                                }}
                                modifiersClassNames={{
                                    completed: "bg-green-100 hover:bg-green-200 text-gray-900",
                                    partial: "bg-yellow-100 hover:bg-yellow-200 text-gray-900",
                                    notCompleted: "bg-red-100 hover:bg-red-200 text-gray-900"
                                }}
                                classNames={{
                                    day_selected: "ring-2 ring-blue-500 ring-offset-1",
                                    day_today: "border-2 border-gray-400"
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

                            {dayEntries.length > 0 && (
                                <div className="mt-4 space-y-2 text-sm">
                                    <h4 className="font-semibold">
                                        Entries for {formData.date}
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {dayEntries.map((entry, index) => (
                                            <div
                                                key={`${entry.time || "time"}-${index}`}
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
                                                        onClick={() => handleEditEntry(index)}
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
                                                        Actual: {entry.actualHours || "0"}, Conv.:{" "}
                                                        {entry.conventionalHours || "0"} — Status:{" "}
                                                        {entry.status || "N/A"}
                                                    </div>
                                                    {entry.observations && (
                                                        <div className="mt-1 line-clamp-2">
                                                            {entry.observations}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                                            setFormData(prev => ({ ...prev, date: newDateValue }))

                                            const parsedDate = new Date(newDateValue)
                                            if (!isNaN(parsedDate.getTime())) {
                                                setSelectedDate(parsedDate)
                                                loadDayData(parsedDate)
                                            }
                                        }}
                                        className={errors.date ? "border-red-500" : ""}
                                    />
                                    {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="time">Time</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="faculty">Faculty *</Label>
                                <Select
                                    value={formData.faculty}
                                    onValueChange={handleFacultyChange}
                                >
                                    <SelectTrigger className={errors.faculty ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Faculty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FACULTIES.map((faculty) => (
                                            <SelectItem key={faculty} value={faculty}>
                                                {faculty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.faculty && <p className="text-sm text-red-500">{errors.faculty}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="studyProgram">Study Program *</Label>
                                <Select
                                    value={formData.studyProgram}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, studyProgram: value }))}
                                    disabled={!formData.faculty}
                                >
                                    <SelectTrigger className={errors.studyProgram ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Study Program" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableStudyPrograms.map((program) => (
                                            <SelectItem key={program} value={program}>
                                                {program}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.studyProgram && <p className="text-sm text-red-500">{errors.studyProgram}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discipline">Discipline *</Label>
                                <Select
                                    value={formData.discipline}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, discipline: value }))}
                                >
                                    <SelectTrigger className={errors.discipline ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Discipline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DISCIPLINES.map((discipline) => (
                                            <SelectItem key={discipline} value={discipline}>
                                                {discipline}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.discipline && <p className="text-sm text-red-500">{errors.discipline}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="activityType">Activity Type</Label>
                                <Select
                                    value={formData.activityType}
                                    onValueChange={(value) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            activityType: value,
                                            conventionalHours: calculateConventionalHours(prev.actualHours, value)
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Activity Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Course">Course</SelectItem>
                                        <SelectItem value="Seminar">Seminar</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="year">Year *</Label>
                                    <Input
                                        id="year"
                                        type="text"
                                        value={formData.year}
                                        onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                                        className={errors.year ? "border-red-500" : ""}
                                    />
                                    {errors.year && <p className="text-sm text-red-500">{errors.year}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="group">Group *</Label>
                                    <Input
                                        id="group"
                                        type="text"
                                        value={formData.group}
                                        onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                                        className={errors.group ? "border-red-500" : ""}
                                    />
                                    {errors.group && <p className="text-sm text-red-500">{errors.group}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="room">Room *</Label>
                                <Input
                                    id="room"
                                    type="text"
                                    value={formData.room}
                                    onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                                    className={errors.room ? "border-red-500" : ""}
                                />
                                {errors.room && <p className="text-sm text-red-500">{errors.room}</p>}
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
                                            setFormData(prev => ({
                                                ...prev,
                                                actualHours: value,
                                                conventionalHours: calculateConventionalHours(value, prev.activityType)
                                            }))
                                        }}
                                        className={errors.actualHours ? "border-red-500" : ""}
                                    />
                                    {errors.actualHours && <p className="text-sm text-red-500">{errors.actualHours}</p>}
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
                                            setFormData(prev => ({
                                                ...prev,
                                                conventionalHours: e.target.value
                                            }))
                                        }
                                        className={errors.conventionalHours ? "border-red-500" : ""}
                                    />
                                    {errors.conventionalHours && <p className="text-sm text-red-500">{errors.conventionalHours}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "NB" | "PO" }))}
                                >
                                    <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NB">NB</SelectItem>
                                        <SelectItem value="PO">PO</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="observations">Observations</Label>
                                <Textarea
                                    id="observations"
                                    value={formData.observations}
                                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                                    rows={4}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleDuplicate}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Duplicate Row
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Save
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
                                            <th className="text-right p-3 font-semibold">NB Conventional Hours</th>
                                            <th className="text-right p-3 font-semibold">PO Conventional Hours</th>
                                            <th className="text-right p-3 font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlySummary.map((row) => {
                                            const total = row.nb + row.po
                                            const monthDate = new Date(`${row.month}-01`)
                                            const monthName = monthDate.toLocaleString("default", { month: "long", year: "numeric" })
                                            return (
                                                <tr key={row.month} className="border-b hover:bg-muted/50">
                                                    <td className="p-3">{monthName}</td>
                                                    <td className="text-right p-3">{row.nb.toFixed(2)}</td>
                                                    <td className="text-right p-3">{row.po.toFixed(2)}</td>
                                                    <td className="text-right p-3 font-semibold">{total.toFixed(2)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 font-semibold">
                                            <td className="p-3">Grand Total</td>
                                            <td className="text-right p-3">
                                                {monthlySummary.reduce((sum, row) => sum + row.nb, 0).toFixed(2)}
                                            </td>
                                            <td className="text-right p-3">
                                                {monthlySummary.reduce((sum, row) => sum + row.po, 0).toFixed(2)}
                                            </td>
                                            <td className="text-right p-3">
                                                {monthlySummary.reduce((sum, row) => sum + row.nb + row.po, 0).toFixed(2)}
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

