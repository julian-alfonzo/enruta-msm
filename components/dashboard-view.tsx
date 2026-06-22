"use client"

import Link from "next/link"
import { User, Users, Camera, FileBarChart, ChevronRight, AlertCircle } from "lucide-react"
import type { Agente } from "@/lib/db"

type Stats = {
  total: number
  total_controles: number
  positivos: number
  observaciones_abiertas: number
}

const accesos = [
  { href: "/agentes", label: "Gestión de Agentes", icon: Users },
  { href: "/alcoholemia", label: "Alcoholemia", icon: Camera },
  { href: "/reportes", label: "Reportes (PDF / Excel)", icon: FileBarChart },
]

function initials(apellidoNombre: string) {
  return apellidoNombre.slice(0, 2).toUpperCase()
}

export function DashboardView({ stats, disponibles }: { stats: Stats; disponibles: Agente[] }) {
  const cards = [
    { label: "Total agentes", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Controles", value: stats.total_controles, icon: Camera, color: "text-chart-2" },
    { label: "Positivos", value: stats.positivos, icon: AlertCircle, color: "text-destructive" },
    { label: "Observ. abiertas", value: stats.observaciones_abiertas, icon: User, color: "text-foreground" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Panel de Administración</h2>
        <p className="text-sm text-muted-foreground">Resumen general</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
              <Icon className={`mb-2 h-6 w-6 ${c.color}`} />
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-lg font-bold text-foreground">Accesos rápidos</h3>
          <div className="flex flex-col gap-3">
            {accesos.map((a) => {
              const Icon = a.icon
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-sm ring-1 ring-border transition-colors hover:bg-accent"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="flex-1 font-medium text-foreground">{a.label}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Agentes</h3>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {disponibles.length} en padrón
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {disponibles.length === 0 && (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
                No hay agentes cargados.
              </p>
            )}
            {disponibles.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                  {initials(a.apellido_nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{a.apellido_nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Leg. {a.legajo} · {a.dependencia ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
