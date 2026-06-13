import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface SubjectOption {
  name: string
}

const RESOURCE = "/api/v1/Subjects"

export const subjectKeys = {
  all: ["subjects"] as const,
  search: (
    faculty: string,
    specialization: string,
    year: string,
    group: string,
    search: string,
  ) => [...subjectKeys.all, faculty, specialization, year, group, search] as const,
}

async function fetchSubjects(
  faculty: string,
  specialization: string,
  year: string,
  group: string,
  search: string,
): Promise<SubjectOption[]> {
  const { data } = await apiClient.get<SubjectOption[]>(RESOURCE, {
    params: { faculty, specialization, year, group, ...(search ? { search } : {}) },
  })
  return data
}

// Disciplines the group actually has in the imported timetable (lectures for
// the whole year included). group "-" means "all groups" — no group filter.
export function useSubjects(
  faculty: string,
  specialization: string,
  year: string,
  group: string,
  search: string,
) {
  return useQuery({
    queryKey: subjectKeys.search(faculty, specialization, year, group, search),
    queryFn: () => fetchSubjects(faculty, specialization, year, group, search),
    enabled:
      faculty.trim().length > 0 &&
      specialization.trim().length > 0 &&
      year.trim().length > 0 &&
      group.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
