"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSession } from "@/components/session-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function RoleLogin() {
  const router = useRouter()
  const { setSession } = useSession()
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    const u = usuario || "admin"
    const p = password || "admin123"

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: u, password: p }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || data.error || "Credenciales inválidas")
        setLoading(false)
        return
      }

      const data = await res.json()
      sessionStorage.setItem("enruta_session", JSON.stringify({ rol: "Administrador", modo: "Conectado", token: data.accessToken }))
      setSession("Administrador", "Conectado")
      router.push("/")
    } catch {
      setError("Error de conexión")
      setLoading(false)
    }
  }

  function accesoDev() {
    handleLogin()
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full">
            <Image
              src="/logo-san-miguel.jpeg"
              alt="Logo Municipalidad de San Miguel"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-primary">EnRuta</h1>
          <p className="mt-1 text-sm text-muted-foreground">MSM — Municipalidad de San Miguel</p>
        </div>

        <form onSubmit={handleLogin} className="mt-10 flex flex-col gap-4">
          <div>
            <Input
              type="text"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="rounded-xl h-12"
              autoComplete="username"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl h-12"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" disabled={loading || !usuario || !password} className="h-12 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ingresar
          </Button>
        </form>

        <div className="mt-6">
          <button
            type="button"
            onClick={accesoDev}
            className="w-full rounded-xl border-2 border-dashed border-muted-foreground/30 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            acceso dev
          </button>
        </div>
      </div>
    </main>
  )
}
