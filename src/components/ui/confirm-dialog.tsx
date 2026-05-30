import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // "primary" for ordinary confirmations, "destructive" for irreversible ones
  // (deletes) — drives the confirm button's colour.
  variant?: "primary" | "destructive"
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

// Promise-based replacement for window.confirm(): renders a single shadcn Dialog
// at the app root and resolves the awaited promise with the user's choice. Lets
// call sites keep their imperative `if (!(await confirm(...))) return` flow while
// using the same modal styling as the rest of the app.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // If a confirm is somehow already open, cancel it before opening the next.
      resolverRef.current?.(false)
      resolverRef.current = resolve
      setPending(options)
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setPending(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title}
        description={pending?.description}
        footer={
          <>
            <Button variant="default" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? "Anulează"}
            </Button>
            <Button
              variant={pending?.variant === "destructive" ? "destructive" : "primary"}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? "Confirmă"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx
}
