"use client"

import { useState, useTransition } from "react"
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  X,
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
  toggleObservacionEstado,
  deleteObservacion,
} from "@/app/actions/observaciones"

type ObservacionRow = {
  id: number
  agente_id: number
  tipo: "FALTA" | "RECLAMO" | "NOVEDAD"
  descripcion: string
  estado: "ABIERTO" | "CERRADO"
  fecha: string
  agente_nombre: string
  agente_legajo: string
}

type Stats = {
  total: number
  abiertos: number
  cerrados: number
  faltas: number
  reclamos: number
  novedades: number
}

const tipoConfig = {
  FALTA: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  RECLAMO: { icon: XCircle, color: "text-chart-2", bg: "bg-chart-2/10" },
  NOVEDAD: { icon: Info, color: "text-primary", bg: "bg-primary/10" },
}

function initials(n: string) {
  return n.slice(0, 2).toUpperCase()
}

function fmtFecha(iso: string) {
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
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [, startTransition] = useTransition()
  const [nuevo, setNuevo] = useState(false)

  function refresh() {
    startTransition(async () => {
      const data = (await getObservaciones(
        search,
        filtroTipo,
        filtroEstado
      )) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    startTransition(async () => {
      const data = (await getObservaciones(
        value,
        filtroTipo,
        filtroEstado
      )) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleTipoChange(value: string) {
    setFiltroTipo(value)
    startTransition(async () => {
      const data = (await getObservaciones(
        search,
        value,
        filtroEstado
      )) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  function handleEstadoChange(value: string) {
    setFiltroEstado(value)
    startTransition(async () => {
      const data = (await getObservaciones(
        search,
        filtroTipo,
        value
      )) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  const cards = [
    { label: "Total", value: stats.total, color: "text-primary" },
    { label: "Abiertos", value: stats.abiertos, color: "text-chart-2" },
    { label: "Cerrados", value: stats.cerrados, color: "text-muted-foreground" },
    { label: "Faltas", value: stats.faltas, color: "text-destructive" },
    { label: "Reclamos", value: stats.reclamos, color: "text-chart-2" },
    { label: "Novedades", value: stats.novedades, color: "text-primary" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">
          Reclamos y Observaciones
        </h2>
        <Button onClick={() => setNuevo(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nueva
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
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
            <SelectItem value="FALTA">Falta</SelectItem>
            <SelectItem value="RECLAMO">Reclamo</SelectItem>
            <SelectItem value="NOVEDAD">Novedad</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={handleEstadoChange}>
          <SelectTrigger className="w-full lg:w-40 rounded-xl">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="ABIERTO">Abiertos</SelectItem>
            <SelectItem value="CERRADO">Cerrados</SelectItem>
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
                obs.estado === "CERRADO" && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  config.bg
                )}
              >
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      obs.tipo === "FALTA"
                        ? "bg-destructive/10 text-destructive"
                        : obs.tipo === "RECLAMO"
                          ? "bg-chart-2/10 text-chart-2"
                          : "bg-primary/10 text-primary"
                    )}
                  >
                    {obs.tipo}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold",
                      obs.estado === "ABIERTO"
                        ? "bg-chart-2/10 text-chart-2"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {obs.estado}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {obs.agente_nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  Leg: {obs.agente_legajo} · {fmtFecha(obs.fecha)}
                </p>
                <p className="mt-2 text-sm text-foreground">{obs.descripcion}</p>
              </div>
              <div className="flex flex-col gap-1">
                {obs.estado === "ABIERTO" ? (
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await toggleObservacionEstado(obs.id, "CERRADO")
                        refresh()
                      })
                    }}
                    className="rounded-lg p-2 text-chart-2 hover:bg-chart-2/10"
                    title="Cerrar observación"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await toggleObservacionEstado(obs.id, "ABIERTO")
                        refresh()
                      })
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    title="Reabrir observación"
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
  const [tipo, setTipo] = useState<"FALTA" | "RECLAMO" | "NOVEDAD" | "">("")
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  if (agentes === null) {
    start(async () => {
      const data = (await getAgentesForObservacion()) as Agente[]
      setAgentes(data)
    })
  }

  function submit() {
    if (!agenteId || !tipo || !descripcion) return
    start(async () => {
      await createObservacion({
        agente_id: agenteId,
        tipo,
        descripcion,
        fecha: new Date(fecha).toISOString(),
      })
      onDone()
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
                    {a.nombre} (Leg: {a.legajo})
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
            <div className="grid grid-cols-3 gap-2">
              {(["FALTA", "RECLAMO", "NOVEDAD"] as const).map((t) => {
                const config = tipoConfig[t]
                const Icon = config.icon
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition-colors",
                      tipo === t
                        ? `${config.bg} ${config.color}`
                        : "bg-muted text-muted-foreground"
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