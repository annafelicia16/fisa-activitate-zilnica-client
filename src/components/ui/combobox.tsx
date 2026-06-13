import { useEffect, useId, useState, type KeyboardEvent } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface ComboboxOption {
  value: string
  // Dimmed right-aligned hint shown in the list (e.g. a faculty short name).
  hint?: string
}

interface ComboboxProps {
  value: string
  options: ComboboxOption[]
  onChange: (value: string) => void
  // Fires with the in-progress filter text while the user types, and with null
  // when the list opens fresh or closes. Lets the parent drive a server-side
  // search (null/empty → fetch everything).
  onQueryChange?: (query: string | null) => void
  // When true, an empty idle field (closed, not being typed in) with exactly
  // one option selects it automatically. Parents must pass false while the
  // option list is search-filtered or refetching, so a transient single-item
  // list can't lock in a value the user didn't mean.
  autoSelectSingle?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Diacritic-insensitive fold so "stiinta" matches "Știința".
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

// Editable text input with a dropdown of selectable suggestions. Typing keeps
// the free-text behavior of a plain Input (every keystroke propagates through
// onChange); picking an option replaces the value wholesale. `query` is the
// in-progress filter text — null means "just opened, show everything".
export function Combobox({
  value,
  options,
  onChange,
  onQueryChange,
  autoSelectSingle,
  placeholder,
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)
  const listId = useId()

  useEffect(() => {
    if (!autoSelectSingle || disabled || open || query !== null) return
    if (value.trim() !== "" || options.length !== 1) return
    onChange(options[0].value)
  }, [autoSelectSingle, disabled, open, query, value, options, onChange])

  const needle = fold((query ?? "").trim())
  const filtered = needle
    ? options.filter(
        (o) => fold(o.value).includes(needle) || (o.hint && fold(o.hint).includes(needle)),
      )
    : options

  function openList() {
    const current = options.findIndex((o) => o.value === value)
    setQuery(null)
    onQueryChange?.(null)
    setHighlight(current >= 0 ? current : 0)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setQuery(null)
    onQueryChange?.(null)
  }

  function select(option: ComboboxOption) {
    onChange(option.value)
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, filtered.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
        break
      case "Enter":
        if (filtered[highlight]) {
          e.preventDefault()
          select(filtered[highlight])
        }
        break
      case "Escape":
        close()
        break
      case "Tab":
        close()
        break
    }
  }

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={cn("pr-8", className)}
        placeholder={placeholder}
        disabled={disabled}
        value={query ?? value}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={close}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setQuery(e.target.value)
          onQueryChange?.(e.target.value)
          onChange(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
      />
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted opacity-60" />
      {open && filtered.length > 0 && (
        <div
          id={listId}
          role="listbox"
          // preventDefault keeps the input focused so the click lands before blur.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-[--r-md] border border-border bg-card p-1 shadow-md"
        >
          {filtered.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => select(o)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "relative flex w-full cursor-default items-center gap-2 rounded-[--r-sm] py-1.5 pl-2 pr-7 text-[12.5px] select-none",
                i === highlight && "bg-hover",
              )}
            >
              <span className="truncate">{o.value}</span>
              {o.hint && (
                <span className="ml-auto shrink-0 font-mono text-[11px] text-text-faint">
                  {o.hint}
                </span>
              )}
              {o.value === value && (
                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                  <CheckIcon className="size-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
