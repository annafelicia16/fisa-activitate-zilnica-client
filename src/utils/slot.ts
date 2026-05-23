// Slot hourName comes in many shapes depending on the FET file: "08:00-09:50",
// "8-10", "12", "12:00". This normalizes any of those into "HH:MM" — the
// start time of the slot, zero-padded — so the UI always shows a real clock
// time. Returns null if the value can't be parsed.
export function formatSlotStartTime(hourName: string | null | undefined): string | null {
  if (!hourName) return null
  const match = hourName.match(/^(\d{1,2})(?::(\d{2}))?/)
  if (!match) return null
  const hh = match[1].padStart(2, "0")
  const mm = (match[2] ?? "00").padStart(2, "0")
  return `${hh}:${mm}`
}
