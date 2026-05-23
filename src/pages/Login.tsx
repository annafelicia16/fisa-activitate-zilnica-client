import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { AlertTriangleIcon, ArrowRightIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/common/Field"
import { Affix, AffixInput, InputAffix } from "@/components/ui/input-affix"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/common/KPI"
import { StatusBadge } from "@/components/common/StatusBadge"
import {
  lookupExternalTeacherByEmail,
  lookupTeacherProfile,
} from "@/api/external-teachers"
import { useTeacherStore } from "@/store/teacher"

export function Login() {
  const navigate = useNavigate()
  const setFromExternalTeacher = useTeacherStore((s) => s.setFromExternalTeacher)
  const setFromProfile = useTeacherStore((s) => s.setFromProfile)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError("Introduceți adresa de email.")
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError("Adresă de email invalidă.")
      return
    }
    setSubmitting(true)
    try {
      const teacher = await lookupExternalTeacherByEmail(trimmed)
      setFromExternalTeacher(teacher)
      try {
        const profile = await lookupTeacherProfile(Number(teacher.idProfesor))
        setFromProfile(profile)
      } catch (profileError) {
        console.warn("Could not load teacher profile", profileError)
      }
      navigate("/")
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("Această adresă de email nu este recunoscută în AGSIS.")
      } else {
        setError("Serverul nu răspunde. Verificați conexiunea.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex flex-col gap-6 px-10 py-8">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-foreground text-[11px] font-semibold text-background font-mono">
            F
          </span>
          <span>Fișa zilnică</span>
          <small className="text-[11px] font-normal text-text-muted">· USV</small>
        </div>

        <div className="grid flex-1 place-items-center">
          <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
            <h1 className="text-[22px] font-semibold tracking-[-0.018em]">Autentificare</h1>
            <p className="mt-1.5 text-[13px] text-text-muted">
              Folosiți adresa de email instituțională. Se va crea o sesiune locală pentru această sesiune.
            </p>

            <div className="mt-6">
              <Field label="Adresă de email" required htmlFor="login-email">
                <InputAffix>
                  <Affix side="left">
                    <MailIcon className="size-3.5" />
                  </Affix>
                  <AffixInput
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="prenume.nume@usv.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </InputAffix>
              </Field>

              {error && (
                <div className="mt-2.5 flex items-center gap-1.5 rounded-[--r-sm] bg-st-warning-soft px-2.5 py-2 text-[12px] text-st-warning">
                  <AlertTriangleIcon className="size-3" /> {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-4 w-full"
                disabled={submitting}
              >
                {submitting ? (
                  "Se verifică…"
                ) : (
                  <>
                    Continuă <ArrowRightIcon className="size-3.5" />
                  </>
                )}
              </Button>

              <hr className="my-3.5 border-border" />
              <p className="text-[11.5px] leading-relaxed text-text-muted">
                Verificarea se face automat în registrul AGSIS. Dacă adresa nu este recunoscută, contactați secretariatul facultății.
              </p>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-text-faint">
          <span>© 2026 Universitatea „Ștefan cel Mare” Suceava</span>
          <span className="ml-auto">v2.0 · 2026.05</span>
        </div>
      </div>

      <div className="relative hidden flex-col gap-5 overflow-hidden border-l border-border bg-card p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 10%, var(--brand-soft) 0%, transparent 60%), radial-gradient(40% 40% at 10% 90%, var(--st-approved-soft) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mt-10 flex max-w-[480px] flex-col gap-6">
          <div className="text-[12px] font-semibold uppercase tracking-[0.02em] text-text-muted">
            Fișa de Activitate Zilnică
          </div>
          <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.025em]">
            Înregistrați orele predate.{" "}
            <span className="text-text-muted">
              Generați fișa lunară. Exportați PDF pentru aprobare.
            </span>
          </h2>
          <p className="max-w-[460px] text-[13px] leading-relaxed text-text-muted">
            Un singur loc pentru orarul săptămânal, înregistrările zilnice, ore convenționale (NB / PO) și activitățile complementare — gata pentru semnătura șefului de catedră și a decanului.
          </p>
          <Card className="mt-4 max-w-[460px]">
            <CardHeader>
              <CardTitle className="flex-1">Mai 2026 — Conf. dr. A. Munteanu</CardTitle>
              <StatusBadge status="Draft" />
            </CardHeader>
            <div className="grid grid-cols-3">
              <KPI label="NB" value={42.5} unit="ore conv." />
              <KPI label="PO" value={3.5} unit="ore conv." separator />
              <KPI label="Total" value={46.0} unit="ore" separator accent />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
