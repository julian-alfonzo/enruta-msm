"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquareWarning,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Agente } from "@/lib/db"
import {
  getObservaciones,
  getAgentesForObservacion,
  getObservacionesStats,
  createObservacion,
  toggleObservacionResuelto,
  deleteObservacion,
} from "@/app/actions/observaciones"

type ObservacionRow = {
  id: number
  agente_id: number
  tipo: "Observación" | "Reclamo"
  descripcion: string
  resuelto: boolean
  fecha: string
  created_at: string
  agente_apellido_nombre: string
  agente_legajo: string
}

type Stats = {
  total: number
  abiertas: number
  resueltas: number
  observaciones: number
  reclamos: number
}

const tipoConfig = {
  Observación: { icon: AlertTriangle, color: "text-chart-2", bg: "bg-chart-2/10" },
  Reclamo: { icon: MessageSquareWarning, color: "text-destructive", bg: "bg-destructive/10" },
} as const

function initials(n: string) {
  return n.slice(0, 2).toUpperCase()
}

function fmtFecha(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ObservacionesView({
  initialObservaciones,
  stats,
}: {
  initialObservaciones: ObservacionRow[]
  stats: Stats
}) {
  const [observaciones, setObservaciones] = useState(initialObservaciones)
  const [search, setSearch] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroResuelto, setFiltroResuelto] = useState("Todos")
  const [, startTransition] = useTransition()
  const [nuevo, setNuevo] = useState(false)

  function refresh() {
    startTransition(async () => {
      const data = (await getObservaciones(search, filtroTipo, filtroResuelto)) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    startTransition(async () => {
      const data = (await getObservaciones(value, filtroTipo, filtroResuelto)) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleTipoChange(value: string | null) {
    const v = value ?? "Todos"
    setFiltroTipo(v)
    startTransition(async () => {
      const data = (await getObservaciones(search, v, filtroResuelto)) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleResueltoChange(value: string | null) {
    const v = value ?? "Todos"
    setFiltroResuelto(v)
    startTransition(async () => {
      const data = (await getObservaciones(search, filtroTipo, v)) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  const cards = [
    { label: "Total", value: stats.total, color: "text-primary" },
    { label: "Abiertas", value: stats.abiertas, color: "text-chart-2" },
    { label: "Resueltas", value: stats.resueltas, color: "text-muted-foreground" },
    { label: "Observaciones", value: stats.observaciones, color: "text-chart-2" },
    { label: "Reclamos", value: stats.reclamos, color: "text-destructive" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Reclamos y Observaciones</h2>
        <Button onClick={() => setNuevo(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nueva
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-card p-3 text-center shadow-sm ring-1 ring-border"
          >
            <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por agente, legajo o descripción"
            className="rounded-xl pl-10"
          />
        </div>
        <Select value={filtroTipo} onValueChange={handleTipoChange}>
          <SelectTrigger className="w-full lg:w-40 rounded-xl">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos los tipos</SelectItem>
            <SelectItem value="Observación">Observación</SelectItem>
            <SelectItem value="Reclamo">Reclamo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroResuelto} onValueChange={handleResueltoChange}>
          <SelectTrigger className="w-full lg:w-40 rounded-xl">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="false">Abiertas</SelectItem>
            <SelectItem value="true">Resueltas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {observaciones.length} observación(es) encontrada(s)
      </p>

      <div className="flex flex-col gap-2">
        {observaciones.length === 0 && (
          <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">
            Sin observaciones registradas
          </div>
        )}
        {observaciones.map((obs) => {
          const config = tipoConfig[obs.tipo]
          const Icon = config.icon
          return (
            <div
              key={obs.id}
              className={cn(
                "flex items-start gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border",
                obs.resuelto && "opacity-60",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  config.bg,
                )}
              >
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      obs.tipo === "Reclamo" ? "bg-destructive/10 text-destructive" : "bg-chart-2/10 text-chart-2",
                    )}
                  >
                    {obs.tipo}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      obs.resuelto ? "bg-muted text-muted-foreground" : "bg-chart-2/10 text-chart-2",
                    )}
                  >
                    {obs.resuelto ? "RESUELTA" : "ABIERTA"}
                  </span>
                </div>
                <Link href={`/agentes/${obs.agente_id}?tab=observaciones`} className="mt-1 block text-sm font-semibold text-foreground hover:text-primary">
                  {obs.agente_apellido_nombre}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Leg: {obs.agente_legajo} · {fmtFecha(obs.created_at)}
                </p>
                <p className="mt-2 text-sm text-foreground">{obs.descripcion}</p>
              </div>
              <div className="flex flex-col gap-1">
                {!obs.resuelto ? (
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await toggleObservacionResuelto(obs.id, true)
                        refresh()
                      })
                    }}
                    className="rounded-lg p-2 text-chart-2 hover:bg-chart-2/10"
                    title="Marcar como resuelta"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await toggleObservacionResuelto(obs.id, false)
                        refresh()
                      })
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    title="Reabrir"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await deleteObservacion(obs.id)
                      refresh()
                    })
                  }}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  title="Eliminar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {nuevo && (
        <NuevaObservacionDialog
          onClose={() => setNuevo(false)}
          onDone={() => {
            refresh()
            setNuevo(false)
          }}
        />
      )}
    </div>
  )
}

function NuevaObservacionDialog({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [agentes, setAgentes] = useState<Agente[] | null>(null)
  const [agenteId, setAgenteId] = useState<number | null>(null)
  const [tipo, setTipo] = useState<"" | "Observación" | "Reclamo">("")
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  if (agentes === null) {
    start(async () => {
      const data = (await getAgentesForObservacion()) as Agente[]
      setAgentes(data)
    })
  }

  function submit() {
    setError(null)
    if (!agenteId || !tipo || !descripcion) {
      setError("Todos los campos son obligatorios")
      return
    }
    start(async () => {
      try {
        await createObservacion({
          agente_id: agenteId,
          tipo,
          descripcion,
          fecha: new Date(fecha).toISOString(),
        })
        onDone()
      } catch (e) {
        setError(String((e as Error).message ?? e))
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Observación</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Agente</Label>
            <Select
              value={agenteId?.toString() ?? ""}
              onValueChange={(v) => setAgenteId(Number(v))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seleccionar agente" />
              </SelectTrigger>
              <SelectContent>
                {agentes?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.apellido_nombre} (Leg: {a.legajo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Observación", "Reclamo"] as const).map((t) => {
                const config = tipoConfig[t]
                const Icon = config.icon
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition-colors",
                      tipo === t ? `${config.bg} ${config.color}` : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle de la observación..."
              className="rounded-xl"
              rows={4}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !agenteId || !tipo || !descripcion}
          >
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
