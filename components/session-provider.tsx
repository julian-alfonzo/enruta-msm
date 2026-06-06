"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Rol = "Administrador" | "Caminadora" | "Moto" | "Tránsito" | "Patrulla de Moto"

type SessionState = {
  rol: Rol | null
  modo: "Local" | "Conectado"
  setSession: (rol: Rol, modo: "Local" | "Conectado") => void
  logout: () => void
  ready: boolean
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol | null>(null)
  const [modo, setModo] = useState<"Local" | "Conectado">("Conectado")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("enruta_session")
    if (stored) {
      const parsed = JSON.parse(stored)
      setRol(parsed.rol)
      setModo(parsed.modo)
    }
    setReady(true)
  }, [])

  const setSession = (r: Rol, m: "Local" | "Conectado") => {
    setRol(r)
    setModo(m)
    sessionStorage.setItem("enruta_session", JSON.stringify({ rol: r, modo: m }))
  }

  const logout = () => {
    setRol(null)
    sessionStorage.removeItem("enruta_session")
  }

  return (
    <SessionContext.Provider value={{ rol, modo, setSession, logout, ready }}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider")
  return ctx
}
