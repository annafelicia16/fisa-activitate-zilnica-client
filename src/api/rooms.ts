import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiClient } from "./client"

export interface RoomOption {
  name: string
}

const RESOURCE = "/api/v1/Rooms"

export const roomKeys = {
  all: ["rooms"] as const,
  search: (
    faculty: string,
    specialization: string,
    year: string,
    group: string,
    subject: string,
    search: string,
  ) =>
    [...roomKeys.all, faculty, specialization, year, group, subject, search] as const,
}

async function fetchRooms(
  faculty: string,
  specialization: string,
  year: string,
  group: string,
  subject: string,
  search: string,
): Promise<RoomOption[]> {
  const { data } = await apiClient.get<RoomOption[]>(RESOURCE, {
    params: {
      faculty,
      specialization,
      year,
      group,
      subject,
      ...(search ? { search } : {}),
    },
  })
  return data
}

// Rooms where this discipline meets for the given group context, per the
// imported timetable.
export function useRooms(
  faculty: string,
  specialization: string,
  year: string,
  group: string,
  subject: string,
  search: string,
) {
  return useQuery({
    queryKey: roomKeys.search(faculty, specialization, year, group, subject, search),
    queryFn: () => fetchRooms(faculty, specialization, year, group, subject, search),
    enabled:
      faculty.trim().length > 0 &&
      specialization.trim().length > 0 &&
      year.trim().length > 0 &&
      group.trim().length > 0 &&
      subject.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  })
}
