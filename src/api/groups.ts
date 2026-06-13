import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface GroupOption {
  // dbo.Grupe.Nume — same strings the imported schedule resolves group names to.
  name: string
}

const RESOURCE = "/api/v1/Groups"

export const groupKeys = {
  all: ["groups"] as const,
  search: (faculty: string, specialization: string, year: string, search: string) =>
    [...groupKeys.all, faculty, specialization, year, search] as const,
}

async function fetchGroups(
  faculty: string,
  specialization: string,
  year: string,
  search: string,
): Promise<GroupOption[]> {
  const { data } = await apiClient.get<GroupOption[]>(RESOURCE, {
    params: { faculty, specialization, year, ...(search ? { search } : {}) },
  })
  return data
}

// Groups under faculty + specialization + study year (current academic year).
export function useGroups(
  faculty: string,
  specialization: string,
  year: string,
  search: string,
) {
  return useQuery({
    queryKey: groupKeys.search(faculty, specialization, year, search),
    queryFn: () => fetchGroups(faculty, specialization, year, search),
    enabled:
      faculty.trim().length > 0 &&
      specialization.trim().length > 0 &&
      year.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
