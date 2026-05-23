import jsPDF from "jspdf"

// Remote Tinos serif font with Romanian diacritics support
const FONT_URL =
    "https://raw.githubusercontent.com/google/fonts/main/ofl/tinos/Tinos-Regular.ttf"

const PDF_FONT_NAME = "Tinos"
const PDF_FONT_FILE = "Tinos-Regular.ttf"

let fontRegistered = false

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ""
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

export async function ensureRomanianPdfFont(doc: jsPDF): Promise<void> {
    if (!fontRegistered) {
        let buffer: ArrayBuffer | null = null

        try {
            const response = await fetch(FONT_URL)
            if (response.ok) {
                buffer = await response.arrayBuffer()
            }
        } catch (error) {
            console.error("Failed to fetch Tinos from remote URL, trying local fallback.", error)
        }

        // Fall back to a copy served by the app (in /public/fonts) when the
        // remote Google Fonts URL is blocked or offline.
        if (!buffer) {
            try {
                const localResponse = await fetch("/fonts/Tinos-Regular.ttf")
                if (!localResponse.ok) {
                    throw new Error("Failed to load local /fonts/Tinos-Regular.ttf")
                }
                buffer = await localResponse.arrayBuffer()
            } catch (error) {
                console.error("Failed to fetch local Tinos font.", error)
                throw new Error("Unable to load Tinos font from either remote or local sources.")
            }
        }

        const base64 = arrayBufferToBase64(buffer)

        doc.addFileToVFS(PDF_FONT_FILE, base64)
        doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, "normal")
        fontRegistered = true
    }

    doc.setFont(PDF_FONT_NAME, "normal")
}

export { PDF_FONT_NAME }

