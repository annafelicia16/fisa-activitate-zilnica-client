import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface StudyYear {
  // Numeric study year (1..6); name is the Roman-numeral label ("I").
  year: number
  name: string
}

const RESOURCE = "/api/v1/StudyYears"

export const studyYearKeys = {
  all: ["study-years"] as const,
  byProgram: (faculty: string, specialization: string) =>
    [...studyYearKeys.all, faculty, specialization] as const,
}

async function fetchStudyYears(
  faculty: string,
  specialization: string,
): Promise<StudyYear[]> {
  const { data } = await apiClient.get<StudyYear[]>(RESOURCE, {
    params: { faculty, specialization },
  })
  return data
}

// Study years offered for the faculty + specialization pair (current academic
// year). Disabled until both are set.
export function useStudyYears(faculty: string, specialization: string) {
  return useQuery({
    queryKey: studyYearKeys.byProgram(faculty, specialization),
    queryFn: () => fetchStudyYears(faculty, specialization),
    enabled: faculty.trim().length > 0 && specialization.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
