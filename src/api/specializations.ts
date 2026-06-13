import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface Specialization {
  idSpecializare: number
  name: string
  shortName: string | null
}

const RESOURCE = "/api/v1/Specializations"

export const specializationKeys = {
  all: ["specializations"] as const,
  search: (faculty: string, search: string) =>
    [...specializationKeys.all, faculty, search] as const,
}

async function fetchSpecializations(
  faculty: string,
  search: string,
): Promise<Specialization[]> {
  const { data } = await apiClient.get<Specialization[]>(RESOURCE, {
    params: { faculty, ...(search ? { search } : {}) },
  })
  return data
}

// Study programs under the given faculty (current academic year only). Empty
// search loads the full list; the query is disabled until a faculty is set.
export function useSpecializations(faculty: string, search: string) {
  return useQuery({
    queryKey: specializationKeys.search(faculty, search),
    queryFn: () => fetchSpecializations(faculty, search),
    enabled: faculty.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
