"use client"

import Link from "next/link"
import { Users, Wind, MessageSquareWarning, FileBarChart } from "lucide-react"

type Stats = {
  total: number
  total_controles: number
  positivos: number
  observaciones_abiertas: number
}

type Acceso = {
  href: string
  titulo: string
  subtitulo: string
  icon: React.ComponentType<{ className?: string }>
  bg: string
  iconColor: string
}

const accesos: Acceso[] = [
  {
    href: "/agentes",
    titulo: "Agentes",
    subtitulo: "Gestión de agentes",
    icon: Users,
    bg: "rgba(5,199,242,0.15)",
    iconColor: "#05C7F2",
  },
  {
    href: "/alcoholemia",
    titulo: "Alcoholemia",
    subtitulo: "Controles",
    icon: Wind,
    bg: "rgba(128,221,242,0.15)",
    iconColor: "#80DDF2",
  },
  {
    href: "/observaciones",
    titulo: "Observaciones",
    subtitulo: "Reclamos y notas",
    icon: MessageSquareWarning,
    bg: "rgba(242,162,12,0.15)",
    iconColor: "#F2A20C",
  },
  {
    href: "/reportes",
    titulo: "Reportes",
    subtitulo: "Alcoholemia y agentes",
    icon: FileBarChart,
    bg: "rgba(123,31,162,0.15)",
    iconColor: "#7B1FA2",
  },
]

export function DashboardView({ stats }: { stats: Stats }) {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">EnRuta</h2>
        <p className="mt-1 text-sm text-muted-foreground">Seleccione una opción</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {accesos.map((a) => {
          const Icon = a.icon
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: a.bg }}
              >
                <Icon className="h-7 w-7" style={{ color: a.iconColor }} />
              </div>
              <span className="text-base font-semibold text-foreground">{a.titulo}</span>
              <span className="text-[11px] text-muted-foreground">{a.subtitulo}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
