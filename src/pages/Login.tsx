import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Container } from "@/components/layout/Container"
import { apiClient } from "@/api/client"
import type { ExternalTeacher } from "@/api/external-teachers"
import { useTeacherStore } from "@/store/teacher"

const DEFAULT_EMAIL = "maican@unitbv.ro"

export function Login() {
  const navigate = useNavigate()
  const setFromExternalTeacher = useTeacherStore((s) => s.setFromExternalTeacher)
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    try {
      const { data } = await apiClient.get<ExternalTeacher>(
        `/api/v1/ExternalTeachers/by-email/${encodeURIComponent(trimmed)}`,
      )
      setFromExternalTeacher(data)
      navigate("/")
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("No teacher found for that email.")
      } else {
        setError("Could not reach the API. Is the server running?")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center">
      <Container>
        <div className="mx-auto max-w-md">
          <Card className="rounded-2xl p-6 gap-0 shadow-sm">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-semibold">Teacher Portal</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Sign in with your university email to view and edit your activity sheet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : null}
                <Button
                  type="submit"
                  className="bg-[#1e5bff] hover:bg-[#1e5bff]/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  )
}
