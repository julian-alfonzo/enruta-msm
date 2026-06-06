"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSession, type Rol } from "@/components/session-provider"
import { cn } from "@/lib/utils"

const roles: Rol[] = ["Administrador", "Caminadora", "Moto", "Tránsito", "Patrulla de Moto"]

export function RoleLogin() {
  const router = useRouter()
  const { setSession } = useSession()
  const [modo, setModo] = useState<"Local" | "Conectado">("Conectado")

  function ingresar(rol: Rol) {
    setSession(rol, modo)
    router.push("/")
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
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

        <div className="mt-10">
          <h2 className="text-center text-xl font-bold text-foreground">Seleccioná tu rol</h2>
          <p className="mt-4 text-center text-sm font-medium text-muted-foreground">Modo de operación</p>

          <div className="mt-2 flex rounded-2xl bg-muted p-1.5">
            {(["Local", "Conectado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={cn(
                  "flex-1 rounded-xl py-3 text-sm font-semibold transition-colors",
                  modo === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-medium text-primary">
            {modo === "Local" ? "Datos locales (Excel/Room)" : "Datos en la nube (Neon)"}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {roles.map((rol) => (
              <button
                key={rol}
                onClick={() => ingresar(rol)}
                className={cn(
                  "w-full rounded-2xl py-4 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.99]",
                  rol === "Administrador" ? "bg-primary" : "bg-primary/85 hover:bg-primary",
                )}
              >
                {rol}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
