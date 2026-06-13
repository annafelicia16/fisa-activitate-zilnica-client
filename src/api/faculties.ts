import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface Faculty {
  idFacultate: number
  name: string
  shortName: string | null
}

const RESOURCE = "/api/v1/Faculties"

export const facultyKeys = {
  all: ["faculties"] as const,
  search: (search: string) => [...facultyKeys.all, "search", search] as const,
}

async function fetchFaculties(search: string): Promise<Faculty[]> {
  const { data } = await apiClient.get<Faculty[]>(RESOURCE, {
    params: search ? { search } : undefined,
  })
  return data
}

// Empty search loads the whole list; non-empty asks the server for matches on
// Denumire / DenumireScurta. keepPreviousData stops the dropdown from
// flickering to empty while a re-query is in flight.
export function useFaculties(search: string) {
  return useQuery({
    queryKey: facultyKeys.search(search),
    queryFn: () => fetchFaculties(search),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
