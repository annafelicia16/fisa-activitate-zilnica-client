import { useState, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Container } from "@/components/layout/Container"
import { useUploadSchedule } from "@/api/schedules"

const SEMESTERS = ["1", "2"]

function defaultStart(): string {
    const today = new Date()
    return today.toISOString().slice(0, 10)
}

function defaultEnd(): string {
    const d = new Date()
    d.setMonth(d.getMonth() + 4)
    return d.toISOString().slice(0, 10)
}

export function Admin() {
    const navigate = useNavigate()
    const uploadMutation = useUploadSchedule()

    const [name, setName] = useState("")
    const [year, setYear] = useState(String(new Date().getFullYear()))
    const [semester, setSemester] = useState("1")
    const [startDate, setStartDate] = useState(defaultStart())
    const [endDate, setEndDate] = useState(defaultEnd())
    const [oddWeekFile, setOddWeekFile] = useState<File | null>(null)
    const [evenWeekFile, setEvenWeekFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    function pickFile(setter: (file: File | null) => void) {
        return (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? null
            setter(file)
        }
    }

    function validate(): string | null {
        if (!name.trim()) return "Name is required."
        const yearNumber = parseInt(year, 10)
        if (!Number.isFinite(yearNumber) || yearNumber <= 0)
            return "Year must be a positive number."
        const semesterNumber = parseInt(semester, 10)
        if (semesterNumber !== 1 && semesterNumber !== 2)
            return "Semester must be 1 or 2."
        if (!startDate || !endDate) return "Start and end dates are required."
        if (new Date(startDate) > new Date(endDate))
            return "Start date cannot be after end date."
        if (!oddWeekFile) return "Odd-week .fet file is required."
        if (!evenWeekFile) return "Even-week .fet file is required."
        if (!oddWeekFile.name.toLowerCase().endsWith(".fet"))
            return "Odd-week file must have a .fet extension."
        if (!evenWeekFile.name.toLowerCase().endsWith(".fet"))
            return "Even-week file must have a .fet extension."
        return null
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setSuccess(null)

        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        try {
            const result = await uploadMutation.mutateAsync({
                name: name.trim(),
                year: parseInt(year, 10),
                semester: parseInt(semester, 10),
                startDate: new Date(`${startDate}T00:00:00`).toISOString(),
                endDate: new Date(`${endDate}T00:00:00`).toISOString(),
                oddWeekFile: oddWeekFile as File,
                evenWeekFile: evenWeekFile as File,
            })
            setSuccess(
                `Schedule imported. Year #${result.scheduleYearId} · Semester #${result.scheduleSemesterId} · Odd #${result.oddWeekScheduleId} · Even #${result.evenWeekScheduleId}`,
            )
            setOddWeekFile(null)
            setEvenWeekFile(null)
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const apiMessage =
                    typeof err.response?.data === "string"
                        ? err.response.data
                        : err.message
                setError(apiMessage || "Upload failed.")
            } else {
                setError("Could not reach the API. Is the server running?")
            }
        }
    }

    const isSubmitting = uploadMutation.isPending

    return (
        <div className="min-h-screen bg-[#f8f9fc] py-10">
            <Container>
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-semibold">Admin · Schedules</h1>
                        <p className="text-sm text-gray-500">
                            Import an odd/even week schedule pair from FET files.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate("/")}
                        variant="outline"
                        className="rounded-lg px-4 py-2"
                    >
                        ← Exit to Dashboard
                    </Button>
                </div>

                <div className="mx-auto max-w-2xl">
                    <Card className="rounded-2xl p-6 gap-0 shadow-sm">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-lg font-semibold">
                                Upload a schedule
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-500">
                                The API expects both the odd-week and even-week .fet files
                                for the same year and semester.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="schedule-name">Name *</Label>
                                    <Input
                                        id="schedule-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., 2025/2026 — Semester 1"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="schedule-year">Year *</Label>
                                        <Input
                                            id="schedule-year"
                                            type="number"
                                            min="2000"
                                            max="2100"
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="schedule-semester">Semester *</Label>
                                        <Select
                                            value={semester}
                                            onValueChange={setSemester}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger id="schedule-semester">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SEMESTERS.map((s) => (
                                                    <SelectItem key={s} value={s}>
                                                        Semester {s}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="schedule-start">Start date *</Label>
                                        <Input
                                            id="schedule-start"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="schedule-end">End date *</Label>
                                        <Input
                                            id="schedule-end"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="schedule-odd">Odd-week .fet file *</Label>
                                    <Input
                                        id="schedule-odd"
                                        type="file"
                                        accept=".fet"
                                        onChange={pickFile(setOddWeekFile)}
                                        disabled={isSubmitting}
                                    />
                                    {oddWeekFile ? (
                                        <p className="text-xs text-gray-500">
                                            Selected: {oddWeekFile.name}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="schedule-even">Even-week .fet file *</Label>
                                    <Input
                                        id="schedule-even"
                                        type="file"
                                        accept=".fet"
                                        onChange={pickFile(setEvenWeekFile)}
                                        disabled={isSubmitting}
                                    />
                                    {evenWeekFile ? (
                                        <p className="text-xs text-gray-500">
                                            Selected: {evenWeekFile.name}
                                        </p>
                                    ) : null}
                                </div>

                                {error ? (
                                    <div className="text-sm text-red-600">{error}</div>
                                ) : null}
                                {success ? (
                                    <div className="text-sm text-green-700">{success}</div>
                                ) : null}

                                <Button
                                    type="submit"
                                    className="bg-[#1e5bff] hover:bg-[#1e5bff]/90 text-white"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Uploading…" : "Upload schedule"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    )
}
