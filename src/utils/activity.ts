export type ActivityKind = "Curs" | "Seminar" | "Laborator" | "Proiect" | "Other"

export const ACTIVITY_KINDS: ActivityKind[] = ["Curs", "Seminar", "Laborator", "Proiect"]

export function normalizeActivityType(input: string | null | undefined): ActivityKind {
  const value = (input ?? "").trim().toLowerCase()
  if (!value) return "Other"
  if (value.startsWith("curs") || value.startsWith("course") || value.startsWith("lect")) return "Curs"
  if (value.startsWith("seminar")) return "Seminar"
  if (value.startsWith("lab") || value.startsWith("lucrare")) return "Laborator"
  if (value.startsWith("proiect") || value.startsWith("project")) return "Proiect"
  return "Other"
}

// Conventional-hour multiplier per activity kind. Master & Doctorat weigh more
// than Licență (the default whenever the cycle is unknown):
//   Licență:           Curs ×2,   Seminar/Laborator/Proiect ×1
//   Master / Doctorat: Curs ×2.5, Seminar/Laborator/Proiect ×1.5
// `cycle` is the AGSIS value ("Bachelor" | "Master" | "Doctorate") or null.
export function activityMultiplier(
  input: string | null | undefined,
  cycle?: string | null,
): number {
  const kind = normalizeActivityType(input)
  const graduate = cycle === "Master" || cycle === "Doctorate"
  if (kind === "Curs") return graduate ? 2.5 : 2.0
  return graduate ? 1.5 : 1.0
}

export function conventionalHours(
  actualHours: number,
  activityType: string | null | undefined,
  cycle?: string | null,
): number {
  if (!Number.isFinite(actualHours) || actualHours < 0) return 0
  return Math.round(actualHours * activityMultiplier(activityType, cycle) * 10) / 10
}
