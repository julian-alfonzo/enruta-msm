"use client"

import Link from "next/link"
import { Users, Camera, MessageSquareWarning, FileBarChart, ChevronRight, FileSpreadsheet } from "lucide-react"

type Stats = {
  total: number
  total_controles: number
  positivos: number
  observaciones_abiertas: number
}

type Acceso = {
  href: string
  titulo: string
  descripcion: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  border: string
  stat: (s: Stats) => { value: number; label: string }
}

const accesos: Acceso[] = [
  {
    href: "/agentes",
    titulo: "Agentes",
    descripcion: "Lista, búsqueda, alta, edición y baja de agentes",
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "hover:border-primary",
    stat: (s) => ({ value: s.total, label: "en padrón" }),
  },
  {
    href: "/alcoholemia",
    titulo: "Alcoholemia",
    descripcion: "Carga y consulta de controles por agente",
    icon: Camera,
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "hover:border-chart-2",
    stat: (s) => ({ value: s.total_controles, label: "controles" }),
  },
  {
    href: "/observaciones",
    titulo: "Observaciones",
    descripcion: "Reclamos y novedades registradas por agente",
    icon: MessageSquareWarning,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "hover:border-destructive",
    stat: (s) => ({ value: s.observaciones_abiertas, label: "abiertas" }),
  },
  {
    href: "/reportes",
    titulo: "Estadísticas",
    descripcion: "Exportación de alcoholemia y padrón en PDF/Excel",
    icon: FileBarChart,
    color: "text-foreground",
    bg: "bg-muted",
    border: "hover:border-foreground",
    stat: () => ({ value: 0, label: "PDF / Excel" }),
  },
  {
    href: "/reportes-personal",
    titulo: "Reportes de personal",
    descripcion: "Subí un Excel mensual, generá partes semanales",
    icon: FileSpreadsheet,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "hover:border-primary",
    stat: () => ({ value: 0, label: "Excel → Excel" }),
  },
]

export function DashboardView({ stats }: { stats: Stats }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Panel de Administración</h2>
        <p className="text-sm text-muted-foreground">Elegí una sección para empezar</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {accesos.map((a) => {
          const Icon = a.icon
          const s = a.stat(stats)
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`group flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${a.border}`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.bg}`}>
                  <Icon className={`h-6 w-6 ${a.color}`} />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{a.titulo}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{a.descripcion}</p>
              </div>
              <div className="mt-auto flex items-baseline gap-1.5 border-t border-border pt-3">
                <span className={`text-2xl font-bold ${a.color}`}>{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
