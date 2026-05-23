import { useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardListIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IdentityCard } from "@/components/dashboard/IdentityCard"
import { ThisMonthCard } from "@/components/dashboard/ThisMonthCard"
import { SupplementaryMiniCard } from "@/components/dashboard/SupplementaryMiniCard"
import { PreviousMonthsCard } from "@/components/dashboard/PreviousMonthsCard"
import { DAYS_RO, MONTHS_RO } from "@/utils/dates"
import { aggregateMonth } from "@/api/types"
import {
  useDailyActivityRecords,
  useMonthlyActivitySummary,
} from "@/api/daily-activity-records"
import { useSupplementaryActivities } from "@/api/supplementary-activities"
import { useTeacherProfile } from "@/api/external-teachers"
import { useDownloadMonthlyActivitySheet } from "@/api/export"
import { useTeacherStore } from "@/store/teacher"

export function Dashboard() {
  const navigate = useNavigate()
  const teacher = useTeacherStore()
  const setFromProfile = useTeacherStore((s) => s.setFromProfile)
  const externalTeacherId = teacher.externalTeacherId ?? 0
  const today = useMemo(() => new Date(), [])

  const { data: records = [] } = useDailyActivityRecords({ teacherId: externalTeacherId })
  const { data: supplementaryEntries = [] } = useSupplementaryActivities({
    teacherId: externalTeacherId,
  })
  const {
    data: monthlySummaries,
    isLoading: monthsLoading,
    isError: monthsError,
  } = useMonthlyActivitySummary(externalTeacherId)
  const { data: profile } = useTeacherProfile(externalTeacherId)
  const exportMutation = useDownloadMonthlyActivitySheet()

  useEffect(() => {
    if (profile) setFromProfile(profile)
  }, [profile, setFromProfile])

  const monthAgg = useMemo(
    () => aggregateMonth(records, today.getFullYear(), today.getMonth()),
    [records, today],
  )

  const firstName = (teacher.fullName ?? "").split(/\s+/).pop() ?? "—"
  const todayLabel = `${DAYS_RO[today.getDay()].toLowerCase()}, ${today.getDate()} ${MONTHS_RO[
    today.getMonth()
  ].toLowerCase()} ${today.getFullYear()}`

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-[22px]">
      <div className="mb-[18px] flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.018em]">
            Bună, {firstName || teacher.fullName || "—"}.
          </h1>
          <div className="mt-1 text-[12.5px] text-text-muted">
            Astăzi este <strong className="font-semibold text-foreground">{todayLabel}</strong>
            {teacher.academicYear ? <> · anul universitar {teacher.academicYear}.</> : "."}
          </div>
        </div>
        <Button variant="primary" onClick={() => navigate("/activity-sheet")}>
          <ClipboardListIcon className="size-3" /> Deschide fișa zilnică
        </Button>
      </div>

      <div className="mb-4">
        <IdentityCard
          facultyName={
            teacher.facultyShortName ?? teacher.facultyName ?? records[0]?.facultyName
          }
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <ThisMonthCard
          year={today.getFullYear()}
          month={today.getMonth()}
          summary={monthAgg}
          status="Draft"
          onOpen={() => navigate("/activity-sheet")}
          onDownloadPdf={
            externalTeacherId
              ? () =>
                  exportMutation.mutate({
                    teacherId: externalTeacherId,
                    year: today.getFullYear(),
                    month: today.getMonth() + 1,
                  })
              : undefined
          }
          downloadDisabled={!externalTeacherId || exportMutation.isPending}
        />
        <SupplementaryMiniCard
          year={today.getFullYear()}
          month={today.getMonth()}
          entries={supplementaryEntries}
          onOpen={() => navigate("/supplementary-annex")}
        />
        <PreviousMonthsCard
          summaries={monthlySummaries}
          loading={monthsLoading}
          error={monthsError}
          onOpenMonth={() => navigate("/activity-sheet")}
          onDownloadPdf={
            externalTeacherId
              ? (year, month) =>
                  exportMutation.mutate({ teacherId: externalTeacherId, year, month })
              : undefined
          }
          downloadDisabled={!externalTeacherId || exportMutation.isPending}
        />
      </div>
    </div>
  )
}
