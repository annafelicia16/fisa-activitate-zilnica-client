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

const ACTIVITY_TYPES = [
    "Research",
    "Administration",
    "Student Mentoring",
    "Committee Work",
    "Curriculum Development",
    "Other"
]

interface AnnexFormData {
    date: string
    activityType: string
    observations: string
    totalHours: string
}

interface HeaderData {
    teacherName: string
    department: string
    academicYear: string
}

interface FormErrors {
    [key: string]: string
}

const STORAGE_KEY = "supplementary-annex-entries"
const HEADER_STORAGE_KEY = "supplementary-annex-header"

interface StoredAnnexEntry {
    entries: AnnexFormData[]
    status: DayStatus
}

export function SupplementaryActivitiesAnnex() {
    const navigate = useNavigate()
    const today = new Date()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
    const [headerData, setHeaderData] = useState<HeaderData>({
        teacherName: "",
        department: "",
        academicYear: ""
    })
    const [formData, setFormData] = useState<AnnexFormData>({
        date: format(today, "yyyy-MM-dd"),
        activityType: "",
        observations: "",
        totalHours: ""
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [dayEntries, setDayEntries] = useState<AnnexFormData[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        try {
            const headerRaw = localStorage.getItem(HEADER_STORAGE_KEY)
            if (headerRaw) {
                setHeaderData(JSON.parse(headerRaw))
            }
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const stored: Record<string, any> = JSON.parse(raw)
            const initialDateKey = format(today, "yyyy-MM-dd")
            const initialEntry = stored[initialDateKey]
            if (initialEntry) {
                const entries: AnnexFormData[] =
                    Array.isArray(initialEntry.entries) && initialEntry.entries.length > 0
                        ? initialEntry.entries
                        : initialEntry.formData ? [initialEntry.formData] : []
                const latestForm = entries.length > 0 ? entries[entries.length - 1] : undefined
                setDayEntries(entries)
                if (latestForm) setFormData(latestForm)
                setEditingIndex(null)
            }
        } catch (error) {
            console.error("Error initializing supplementary annex data", error)
        }
    }, [])

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
            setFormData(prev => ({ ...prev, date: format(date, "yyyy-MM-dd") }))
            loadDayData(date)
        }
    }

    const loadDayData = (_date: Date) => {
        const dateKey = format(_date, "yyyy-MM-dd")
        if (typeof window === "undefined") return
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            const emptyForm: AnnexFormData = {
                date: dateKey,
                activityType: "",
                observations: "",
                totalHours: ""
            }
            if (!raw) {
                setFormData(emptyForm)
                setErrors({})
                setDayEntries([])
                setEditingIndex(null)
                return
            }
            const stored: Record<string, any> = JSON.parse(raw)
            const entry = stored[dateKey]
            if (entry) {
                const entries: AnnexFormData[] =
                    Array.isArray(entry.entries) && entry.entries.length > 0
                        ? entry.entries
                        : entry.formData ? [entry.formData] : []
                setDayEntries(entries)
                const latestForm = entries.length > 0 ? entries[entries.length - 1] : undefined
                setFormData(latestForm ?? emptyForm)
            } else {
                setFormData(emptyForm)
                setDayEntries([])
                setEditingIndex(null)
            }
            setErrors({})
        } catch (error) {
            console.error("Error loading day data", error)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}
        if (!formData.date) newErrors.date = "Date is required"
        if (!formData.activityType) newErrors.activityType = "Activity Type is required"
        if (!formData.totalHours) {
            newErrors.totalHours = "Total Hours is required"
        } else {
            const hours = parseFloat(formData.totalHours)
            if (isNaN(hours) || hours < 0) {
                newErrors.totalHours = "Total Hours must be a valid positive number"
            }
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const checkForDuplicateEntry = (): boolean => {
        if (typeof window === "undefined") return false
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return false
            const stored: Record<string, any> = JSON.parse(raw)
            for (const [dateKey, value] of Object.entries(stored)) {
                const entries: AnnexFormData[] =
                    Array.isArray(value.entries) && value.entries.length > 0
                        ? value.entries
                        : value.formData ? [value.formData] : []
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i]
                    if (
                        editingIndex !== null &&
                        dateKey === formData.date &&
                        i === editingIndex
                    )
                        continue
                    if (
                        entry.date === formData.date &&
                        entry.activityType === formData.activityType &&
                        entry.totalHours === formData.totalHours
                    )
                        return true
                }
            }
            return false
        } catch (error) {
            console.error("Error checking for duplicate entry", error)
            return false
        }
    }

    const handleSave = () => {
        if (!validateForm()) return
        if (checkForDuplicateEntry()) {
            alert(
                "⚠️ Warning: An entry with the same Date, Activity Type, and Total Hours already exists!\n\n" +
                "Please modify the details to proceed."
            )
            return
        }
        const dateKey = formData.date
        let status: DayStatus = formData.observations && formData.totalHours ? "completed" : "partial"
        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                const stored: Record<string, any> = raw ? JSON.parse(raw) : {}
                const existing = stored[dateKey]
                const existingEntries: AnnexFormData[] =
                    existing && Array.isArray(existing.entries)
                        ? existing.entries
                        : existing?.formData ? [existing.formData] : []
                let newEntries: AnnexFormData[]
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
                const updatedEntry: StoredAnnexEntry = { entries: newEntries, status }
                stored[dateKey] = updatedEntry
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
                setDayEntries(updatedEntry.entries)
            } catch (error) {
                console.error("Error saving supplementary annex data", error)
            }
        }
        alert("Supplementary activity saved successfully!")
        setEditingIndex(null)
        const baseDate = selectedDate ?? (formData.date ? new Date(formData.date) : today)
        const resetDateKey = format(baseDate, "yyyy-MM-dd")
        setFormData({
            date: resetDateKey,
            activityType: "",
            observations: "",
            totalHours: ""
        })
        setErrors({})
    }

    const handleSubmit = () => {
        if (validateForm()) {
            alert("Supplementary annex submitted for approval!")
            navigate("/")
        }
    }

    const handleExport = async () => {
        if (typeof window === "undefined") return

        try {
            const doc = new jsPDF("p", "mm", "a4")
            await ensureRomanianPdfFont(doc)
            const pageWidth = doc.internal.pageSize.getWidth()

            const annexRaw = localStorage.getItem(STORAGE_KEY)
            const headerRaw = localStorage.getItem(HEADER_STORAGE_KEY)

            const stored: Record<string, any> = annexRaw ? JSON.parse(annexRaw) : {}
            const header: HeaderData | null = headerRaw ? JSON.parse(headerRaw) : null

            const allEntries: AnnexFormData[] = []
            Object.entries(stored).forEach(([dateKey, value]) => {
                const entries: AnnexFormData[] =
                    Array.isArray((value as any).entries) && (value as any).entries.length > 0
                        ? (value as any).entries
                        : (value as any).formData
                            ? [(value as any).formData]
                            : []

                entries.forEach(e => {
                    allEntries.push({
                        ...e,
                        date: e.date || dateKey
                    })
                })
            })

            if (allEntries.length === 0) {
                alert("No supplementary activities data found to export.")
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

            doc.setFont(PDF_FONT_NAME, "bold")
            doc.setFontSize(13)
            const titleY = startYInfo + 24
            doc.text("ANEXĂ ACTIVITĂȚI COMPLEMENTARE", pageWidth / 2, titleY, { align: "center" })

            doc.setFontSize(11)
            const subtitle = monthLabel ? `Luna ${monthLabel}` : "Luna .............................."
            doc.text(subtitle, pageWidth / 2, titleY + 7, { align: "center" })

            const tableBody = allEntries.map(e => [
                e.date,
                e.activityType || "",
                e.observations || "",
                e.totalHours || ""
            ])

            doc.setFont(PDF_FONT_NAME, "normal")
            console.log("Font loaded successfully for SupplementaryActivitiesAnnex table")
            autoTable(doc, {
                startY: titleY + 14,
                head: [[
                    "Data",
                    "Tip Activitate",
                    "Descriere / Detalii",
                    "Ore"
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
                    2: { halign: "left" }
                },
                margin: { left: 10, right: 10 },
                theme: "grid"
            })

            const finalY = (doc as any).lastAutoTable.finalY || (titleY + 20)
            const totalHours = allEntries.reduce(
                (sum, e) => sum + (parseFloat(e.totalHours || "0") || 0),
                0
            )

            doc.setFontSize(10)
            doc.setFont(PDF_FONT_NAME, "bold")
            doc.text(
                `Total ore activități didactice complementare: ${totalHours.toFixed(2)}`,
                10,
                finalY + 8
            )

            doc.save("anexa-activitati-complementare.pdf")
        } catch (error) {
            console.error("Error exporting supplementary annex PDF", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`An error occurred while exporting the annex PDF.\n\nDetails: ${message}`)
        }
    }

    const handleDuplicate = () => {
        const dateKey = formData.date
        if (!dateKey) return
        if (checkForDuplicateEntry()) {
            alert(
                "⚠️ Warning: An entry with the same Date, Activity Type, and Total Hours already exists!\n\n" +
                "Please modify the details to proceed."
            )
            return
        }
        let status: DayStatus = formData.observations && formData.totalHours ? "completed" : "partial"
        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(STORAGE_KEY)
                const stored: Record<string, any> = raw ? JSON.parse(raw) : {}
                const existing = stored[dateKey]
                const existingEntries: AnnexFormData[] =
                    existing && Array.isArray(existing.entries)
                        ? existing.entries
                        : existing?.formData ? [existing.formData] : []
                const updatedEntry: StoredAnnexEntry = {
                    entries: [...existingEntries, { ...formData }],
                    status: existing?.status ?? status
                }
                stored[dateKey] = updatedEntry
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
                setDayEntries(updatedEntry.entries)
                alert("Row duplicated for this day. You can now edit it and save again.")
            } catch (error) {
                console.error("Error duplicating row", error)
            }
        }
    }

    const handleEditEntry = (index: number) => {
        const entry = dayEntries[index]
        if (!entry) return
        setFormData(entry)
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
        if (typeof window === "undefined") return []
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return []
            const stored: Record<string, any> = JSON.parse(raw)
            const monthlyData: Record<string, number> = {}
            Object.entries(stored).forEach(([dateKey, value]) => {
                const entries: AnnexFormData[] =
                    Array.isArray(value.entries) && value.entries.length > 0
                        ? value.entries
                        : value.formData ? [value.formData] : []
                entries.forEach((entry) => {
                    const date = new Date(dateKey)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                    const hours = parseFloat(entry.totalHours || "0") || 0
                    monthlyData[monthKey] = (monthlyData[monthKey] ?? 0) + hours
                })
            })
            return Object.entries(monthlyData)
                .map(([month, totalHours]) => ({ month, totalHours }))
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
                                classNames={{
                                    day_selected: "ring-2 ring-blue-500 ring-offset-1",
                                    day_today: "border-2 border-gray-400"
                                }}
                            />

                            {dayEntries.length > 0 && (
                                <div className="mt-4 space-y-2 text-sm">
                                    <h4 className="font-semibold">Entries for {formData.date}</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {dayEntries.map((entry, index) => (
                                            <div
                                                key={`${entry.activityType}-${index}`}
                                                className="rounded-md border bg-muted/40 p-2 relative z-0"
                                            >
                                                <div className="flex justify-between items-center gap-2">
                                                    <div>
                                                        <span className="font-medium block">
                                                            {entry.activityType || "—"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {entry.totalHours || "0"} h
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
                                                {entry.observations && (
                                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {entry.observations}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle>Supplementary Activities Annex</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                <Label htmlFor="activityType">Activity Type *</Label>
                                <Select
                                    value={formData.activityType}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, activityType: value }))}
                                >
                                    <SelectTrigger className={errors.activityType ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Activity Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACTIVITY_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.activityType && (
                                    <p className="text-sm text-red-500">{errors.activityType}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="totalHours">Total Hours *</Label>
                                <Input
                                    id="totalHours"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={formData.totalHours}
                                    onChange={(e) => setFormData(prev => ({ ...prev, totalHours: e.target.value }))}
                                    className={errors.totalHours ? "border-red-500" : ""}
                                />
                                {errors.totalHours && (
                                    <p className="text-sm text-red-500">{errors.totalHours}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="observations">Description / Observations</Label>
                                <Textarea
                                    id="observations"
                                    value={formData.observations}
                                    onChange={(e) =>
                                        setFormData(prev => ({ ...prev, observations: e.target.value }))
                                    }
                                    rows={4}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button onClick={handleDuplicate} variant="outline" className="flex-1">
                                    Duplicate Row
                                </Button>
                                <Button onClick={handleSave} variant="outline" className="flex-1">
                                    Save
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-[#1e5bff] hover:bg-[#1e5bff]/90"
                                >
                                    Submit for Approval
                                </Button>
                                <Button onClick={handleExport} variant="outline" className="flex-1">
                                    Export to PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {monthlySummary.length > 0 && (
                    <Card className="rounded-2xl shadow-sm mt-6">
                        <CardHeader>
                            <CardTitle>Monthly Summary (Total Hours)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-semibold">Month</th>
                                            <th className="text-right p-3 font-semibold">Total Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlySummary.map((row) => {
                                            const monthDate = new Date(`${row.month}-01`)
                                            const monthName = monthDate.toLocaleString("default", {
                                                month: "long",
                                                year: "numeric"
                                            })
                                            return (
                                                <tr key={row.month} className="border-b hover:bg-muted/50">
                                                    <td className="p-3">{monthName}</td>
                                                    <td className="text-right p-3 font-semibold">
                                                        {row.totalHours.toFixed(2)}
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
                                                    .reduce((sum, row) => sum + row.totalHours, 0)
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
