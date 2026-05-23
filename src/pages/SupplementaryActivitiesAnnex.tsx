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
import { Container } from "@/components/layout/Container"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ensureRomanianPdfFont, PDF_FONT_NAME } from "@/utils/pdfFont"
import { useTeacherStore } from "@/store/teacher"
import {
    useCreateSupplementaryActivity,
    useSupplementaryActivities,
    useUpdateSupplementaryActivity,
    type SupplementaryActivity,
} from "@/api/supplementary-activities"

const ACTIVITY_TYPES = [
    "Research",
    "Administration",
    "Student Mentoring",
    "Committee Work",
    "Curriculum Development",
    "Other",
]

interface AnnexFormData {
    date: string
    activityType: string
    observations: string
    totalHours: string
}

interface FormErrors {
    [key: string]: string
}

const EMPTY_FORM: AnnexFormData = {
    date: format(new Date(), "yyyy-MM-dd"),
    activityType: "",
    observations: "",
    totalHours: "",
}

function recordToForm(record: SupplementaryActivity): AnnexFormData {
    return {
        date: format(new Date(record.date), "yyyy-MM-dd"),
        activityType: record.activityType,
        observations: record.observations ?? "",
        totalHours: record.totalHours.toString(),
    }
}

export function SupplementaryActivitiesAnnex() {
    const navigate = useNavigate()
    const teacher = useTeacherStore()
    const externalTeacherId = teacher.externalTeacherId ?? 0

    const today = useMemo(() => new Date(), [])
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
    const [formData, setFormData] = useState<AnnexFormData>(EMPTY_FORM)
    const [errors, setErrors] = useState<FormErrors>({})
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

    const { data: records = [], isLoading } = useSupplementaryActivities({
        teacherId: externalTeacherId,
    })
    const createMutation = useCreateSupplementaryActivity()
    const updateMutation = useUpdateSupplementaryActivity()

    const recordsByDate = useMemo(() => {
        const map = new Map<string, SupplementaryActivity[]>()
        for (const record of records) {
            const key = format(new Date(record.date), "yyyy-MM-dd")
            const list = map.get(key) ?? []
            list.push(record)
            map.set(key, list)
        }
        return map
    }, [records])

    const dayEntries = useMemo(
        () => recordsByDate.get(formData.date) ?? [],
        [recordsByDate, formData.date],
    )

    const monthlySummary = useMemo(() => {
        const monthlyData: Record<string, number> = {}
        for (const record of records) {
            const date = new Date(record.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            monthlyData[monthKey] = (monthlyData[monthKey] ?? 0) + (record.totalHours || 0)
        }
        return Object.entries(monthlyData)
            .map(([month, totalHours]) => ({ month, totalHours }))
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
        if (!formData.activityType) newErrors.activityType = "Activity Type is required"
        if (!formData.totalHours) {
            newErrors.totalHours = "Total Hours is required"
        } else {
            const hours = parseFloat(formData.totalHours)
            if (isNaN(hours) || hours < 0)
                newErrors.totalHours = "Total Hours must be a valid positive number"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSave() {
        if (!externalTeacherId) {
            alert("You are not signed in.")
            return
        }
        if (!validateForm()) return

        const totalHours = parseFloat(formData.totalHours) || 0
        const date = new Date(`${formData.date}T00:00:00`).toISOString()

        try {
            if (editingRecordId) {
                await updateMutation.mutateAsync({
                    id: editingRecordId,
                    date,
                    activityType: formData.activityType,
                    observations: formData.observations || null,
                    totalHours,
                })
            } else {
                await createMutation.mutateAsync({
                    externalTeacherId,
                    date,
                    activityType: formData.activityType,
                    observations: formData.observations || null,
                    totalHours,
                })
            }
            alert("Supplementary activity saved successfully!")
            const baseDate = selectedDate ?? new Date(formData.date)
            resetFormForDate(baseDate)
        } catch (error) {
            console.error("Error saving supplementary activity", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`Could not save supplementary activity.\n\n${message}`)
        }
    }

    async function handleDuplicate() {
        if (!externalTeacherId) return
        if (!validateForm()) return

        const totalHours = parseFloat(formData.totalHours) || 0
        const date = new Date(`${formData.date}T00:00:00`).toISOString()

        try {
            await createMutation.mutateAsync({
                externalTeacherId,
                date,
                activityType: formData.activityType,
                observations: formData.observations || null,
                totalHours,
            })
            alert("Row duplicated for this day. You can now edit it and save again.")
            setEditingRecordId(null)
        } catch (error) {
            console.error("Error duplicating row", error)
        }
    }

    function handleEditEntry(record: SupplementaryActivity) {
        setFormData(recordToForm(record))
        setErrors({})
        setEditingRecordId(record.id)
    }

    function handleSubmit() {
        if (validateForm()) {
            alert("Supplementary annex submitted for approval!")
            navigate("/")
        }
    }

    async function handleExport() {
        try {
            const doc = new jsPDF("p", "mm", "a4")
            await ensureRomanianPdfFont(doc)
            const pageWidth = doc.internal.pageSize.getWidth()

            if (records.length === 0) {
                alert("No supplementary activities data found to export.")
                return
            }

            const sorted = [...records].sort((a, b) =>
                a.date.localeCompare(b.date),
            )
            const firstDate = new Date(sorted[0].date)
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

            doc.setFont(PDF_FONT_NAME, "bold")
            doc.setFontSize(13)
            const titleY = startYInfo + 24
            doc.text("ANEXĂ ACTIVITĂȚI COMPLEMENTARE", pageWidth / 2, titleY, {
                align: "center",
            })

            doc.setFontSize(11)
            const subtitle = monthLabel ? `Luna ${monthLabel}` : "Luna .............................."
            doc.text(subtitle, pageWidth / 2, titleY + 7, { align: "center" })

            const tableBody = sorted.map((e) => [
                format(new Date(e.date), "yyyy-MM-dd"),
                e.activityType,
                e.observations ?? "",
                e.totalHours.toString(),
            ])

            doc.setFont(PDF_FONT_NAME, "normal")
            autoTable(doc, {
                startY: titleY + 14,
                head: [["Data", "Tip Activitate", "Descriere / Detalii", "Ore"]],
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
                columnStyles: { 2: { halign: "left" } },
                margin: { left: 10, right: 10 },
                theme: "grid",
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const finalY = (doc as any).lastAutoTable.finalY || titleY + 20
            const totalHours = sorted.reduce((sum, e) => sum + (e.totalHours || 0), 0)

            doc.setFontSize(10)
            doc.setFont(PDF_FONT_NAME, "bold")
            doc.text(
                `Total ore activități didactice complementare: ${totalHours.toFixed(2)}`,
                10,
                finalY + 8,
            )

            doc.save("anexa-activitati-complementare.pdf")
        } catch (error) {
            console.error("Error exporting supplementary annex PDF", error)
            const message = error instanceof Error ? error.message : String(error)
            alert(`An error occurred while exporting the annex PDF.\n\nDetails: ${message}`)
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
                                classNames={{
                                    day_selected: "ring-2 ring-blue-500 ring-offset-1",
                                    day_today: "border-2 border-gray-400",
                                }}
                            />

                            {isLoading ? (
                                <div className="mt-4 text-sm text-gray-500">Loading entries…</div>
                            ) : dayEntries.length > 0 ? (
                                <div className="mt-4 space-y-2 text-sm">
                                    <h4 className="font-semibold">
                                        Entries for {formData.date}
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {dayEntries.map((record) => (
                                            <div
                                                key={record.id}
                                                className="rounded-md border bg-muted/40 p-2 relative z-0"
                                            >
                                                <div className="flex justify-between items-center gap-2">
                                                    <div>
                                                        <span className="font-medium block">
                                                            {record.activityType || "—"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {record.totalHours} h
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
                                                {record.observations && (
                                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {record.observations}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
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
                                        setFormData((prev) => ({ ...prev, date: newDateValue }))
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
                                <Label htmlFor="activityType">Activity Type *</Label>
                                <Select
                                    value={formData.activityType}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, activityType: value }))
                                    }
                                >
                                    <SelectTrigger
                                        className={errors.activityType ? "border-red-500" : ""}
                                    >
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
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            totalHours: e.target.value,
                                        }))
                                    }
                                    className={errors.totalHours ? "border-red-500" : ""}
                                />
                                {errors.totalHours && (
                                    <p className="text-sm text-red-500">{errors.totalHours}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="observations">
                                    Description / Observations
                                </Label>
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
                            <CardTitle>Monthly Summary (Total Hours)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3 font-semibold">Month</th>
                                            <th className="text-right p-3 font-semibold">
                                                Total Hours
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlySummary.map((row) => {
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
