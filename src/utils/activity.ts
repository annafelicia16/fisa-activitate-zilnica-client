export type ActivityKind = "Curs" | "Seminar" | "Laborator" | "Proiect" | "Other"

export const ACTIVITY_KINDS: ActivityKind[] = ["Curs", "Seminar", "Laborator", "Proiect"]

const MULTIPLIERS: Record<ActivityKind, number> = {
  Curs: 2.0,
  Seminar: 1.0,
  Laborator: 1.0,
  Proiect: 1.0,
  Other: 1.0,
}

export function normalizeActivityType(input: string | null | undefined): ActivityKind {
  const value = (input ?? "").trim().toLowerCase()
  if (!value) return "Other"
  if (value.startsWith("curs") || value.startsWith("course") || value.startsWith("lect")) return "Curs"
  if (value.startsWith("seminar")) return "Seminar"
  if (value.startsWith("lab") || value.startsWith("lucrare")) return "Laborator"
  if (value.startsWith("proiect") || value.startsWith("project")) return "Proiect"
  return "Other"
}

export function activityMultiplier(input: string | null | undefined): number {
  return MULTIPLIERS[normalizeActivityType(input)]
}

export function conventionalHours(
  actualHours: number,
  activityType: string | null | undefined,
): number {
  if (!Number.isFinite(actualHours) || actualHours < 0) return 0
  return Math.round(actualHours * activityMultiplier(activityType) * 10) / 10
}
