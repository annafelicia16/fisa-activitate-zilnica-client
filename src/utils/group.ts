// AGSIS uses "-1" in ActivitySlot.GroupExternalId as a sentinel meaning "this
// slot covers the entire class, not a specific group". Treat empty string and
// null the same way. UI surfaces use `displayGroup` to render the value: "-"
// for the whole-class case, "" if there's nothing meaningful to show.

const WHOLE_CLASS_MARKER = "-"

export function isWholeClassGroup(value: string | null | undefined): boolean {
  if (value == null) return true
  const trimmed = value.trim()
  return trimmed === "" || trimmed === "-1" || trimmed === WHOLE_CLASS_MARKER
}

// What to show in the form input. The whole-class case becomes "-" so the
// teacher still sees something concrete in the field; a missing group becomes
// empty so the placeholder reappears.
export function displayGroup(value: string | null | undefined): string {
  if (value == null) return ""
  const trimmed = value.trim()
  if (trimmed === "-1" || trimmed === WHOLE_CLASS_MARKER) return WHOLE_CLASS_MARKER
  return trimmed
}

// What to show in a slot/record summary line. The whole-class case returns
// null so the caller can drop the "Gr. X" segment entirely.
export function summaryGroup(value: string | null | undefined): string | null {
  if (isWholeClassGroup(value)) return null
  return value!.trim()
}
