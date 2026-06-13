// Case-, diacritic- and punctuation-insensitive key for comparing AGSIS names
// that exist in several spellings ("MANAGEMENT" vs "Management", cedilla vs
// comma-below diacritics, "Managementfinanciarbancar" without spaces).
export function foldName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}
