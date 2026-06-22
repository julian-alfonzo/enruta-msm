"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Trash2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import type { Agente, ControlAlcoholemia } from "@/lib/db"
import {
  getAgentesConControl,
  getControlesByAgente,
  createControl,
  deleteControl,
} from "@/app/actions/alcoholemia"
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
import { cn } from "@/lib/utils"

type AgenteControl = Agente & {
  ultimo_control: { resultado: string; graduacion: number | null; fecha: string } | null
}

type Stats = { total: number; con_control: number; positivos: number; negativos: number }

function initials(n: string) {
  return n.slice(0, 2).toUpperCase()
}

function fmtFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function AlcoholemiaView({ initialAgentes, stats }: { initialAgentes: AgenteControl[]; stats: Stats }) {
  const [agentes, setAgentes] = useState(initialAgentes)
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()
  const [nuevo, setNuevo] = useState<Agente | null>(null)
  const [detalle, setDetalle] = useState<Agente | null>(null)

  function refresh(s = search) {
    startTransition(async () => {
      const data = (await getAgentesConControl(s)) as AgenteControl[]
      setAgentes(data)
    })
  }

  const cards = [
    { label: "Total", value: stats.total, color: "text-primary" },
    { label: "Con control", value: stats.con_control, color: "text-chart-2" },
    { label: "POSITIVO", value: stats.positivos, color: "text-chart-2" },
    { label: "NEGATIVO", value: stats.negativos, color: "text-destructive" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <h2 className="mb-4 text-2xl font-bold text-foreground lg:text-3xl">Control de Alcoholemia</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            refresh(e.target.value)
          }}
          placeholder="Buscar por apellido y nombre o legajo"
          className="rounded-xl pl-10"
        />
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-card p-3 text-center shadow-sm ring-1 ring-border">
            <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{agentes.length} agente(s) encontrado(s)</p>

      <div className="grid gap-2 lg:grid-cols-2">
        {agentes.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
            <button
              onClick={() => setDetalle(a)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary"
            >
              {initials(a.apellido_nombre)}
            </button>
            <button onClick={() => setDetalle(a)} className="min-w-0 flex-1 text-left">
              <p className="truncate font-semibold text-foreground">{a.apellido_nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                Leg: {a.legajo} · {a.dependencia?.slice(0, 18)}
              </p>
            </button>
            <div className="text-right">
              {a.ultimo_control ? (
                <span
                  className={cn(
                    "text-xs font-bold",
                    a.ultimo_control.resultado === "POSITIVO" ? "text-chart-2" : "text-destructive",
                  )}
                >
                  {a.ultimo_control.resultado}
                  {a.ultimo_control.graduacion != null && ` (${Number(a.ultimo_control.graduacion).toFixed(2)}g/L)`}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Sin control</span>
              )}
            </div>
            <button
              onClick={() => setNuevo(a)}
              aria-label="Nuevo control"
              className="rounded-lg p-2 text-primary hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {nuevo && (
        <NuevoControlDialog
          agente={nuevo}
          onClose={() => setNuevo(null)}
          onDone={() => refresh()}
        />
      )}
      {detalle && (
        <DetalleAgenteDialog
          agente={detalle}
          onClose={() => setDetalle(null)}
          onNuevo={() => {
            setNuevo(detalle)
            setDetalle(null)
          }}
          onChanged={() => refresh()}
        />
      )}
    </div>
  )
}

function NuevoControlDialog({
  agente,
  onClose,
  onDone,
}: {
  agente: Agente
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [resultado, setResultado] = useState<"POSITIVO" | "NEGATIVO" | "">("")
  const [servicioExtra, setServicioExtra] = useState("Servicio Ordinario")
  const [graduacion, setGraduacion] = useState("")
  const [observacion, setObservacion] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  function submit() {
    if (!resultado) return
    start(async () => {
      await createControl({
        agente_id: agente.id,
        resultado,
        graduacion: graduacion ? Number(graduacion) : undefined,
        servicio_extra: servicioExtra || undefined,
        observacion: observacion || undefined,
        fecha: new Date(fecha).toISOString(),
      })
      onDone()
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Control</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-accent p-3">
          <p className="font-bold text-foreground">{agente.apellido_nombre}</p>
          <p className="text-xs text-muted-foreground">Legajo: {agente.legajo}</p>
          <p className="text-xs text-primary">{agente.dependencia}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Fecha del control</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Resultado</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setResultado("POSITIVO")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  resultado === "POSITIVO" ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <CheckCircle2 className="h-4 w-4" /> POSITIVO
              </button>
              <button
                onClick={() => setResultado("NEGATIVO")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  resultado === "NEGATIVO" ? "bg-destructive text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <XCircle className="h-4 w-4" /> NEGATIVO
              </button>
            </div>
          </div>

          {resultado === "POSITIVO" && (
            <div>
              <Label className="mb-1.5 block text-sm font-semibold">Graduación (g/L)</Label>
              <Input
                type="number"
                step="0.01"
                value={graduacion}
                onChange={(e) => setGraduacion(e.target.value)}
                placeholder="0.24"
                className="rounded-xl"
              />
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Servicio extra</Label>
            <div className="grid grid-cols-2 gap-2">
              {["Servicio Ordinario", "Horas Extra"].map((t) => (
                <button
                  key={t}
                  onClick={() => setServicioExtra(t)}
                  className={cn(
                    "rounded-xl py-3 text-sm font-semibold transition-colors",
                    servicioExtra === t ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Observación (opcional)"
            className="rounded-xl"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || !resultado}>
            {pending ? "Guardando..." : "Guardar Control"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetalleAgenteDialog({
  agente,
  onClose,
  onNuevo,
  onChanged,
}: {
  agente: Agente
  onClose: () => void
  onNuevo: () => void
  onChanged: () => void
}) {
  const [controles, setControles] = useState<ControlAlcoholemia[] | null>(null)
  const [, start] = useTransition()

  if (controles === null) {
    start(async () => {
      const data = (await getControlesByAgente(agente.id)) as ControlAlcoholemia[]
      setControles(data)
    })
  }

  function eliminar(id: number) {
    start(async () => {
      await deleteControl(id)
      const data = (await getControlesByAgente(agente.id)) as ControlAlcoholemia[]
      setControles(data)
      onChanged()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={onClose} aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {agente.apellido_nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Legajo: {agente.legajo}</p>
            <p className="text-xs text-primary">{agente.dependencia}</p>
            <p className="mt-1 text-xs text-muted-foreground">{controles?.length ?? 0} control(es) registrado(s)</p>
          </div>
          <Button size="sm" onClick={onNuevo}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo
          </Button>
        </div>

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {controles?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin controles registrados.</p>
          )}
          {controles?.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border">
              {c.resultado === "POSITIVO" ? (
                <CheckCircle2 className="h-7 w-7 text-chart-2" />
              ) : (
                <XCircle className="h-7 w-7 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  <span className={c.resultado === "POSITIVO" ? "text-chart-2" : "text-destructive"}>
                    {c.resultado}
                  </span>{" "}
                  {c.graduacion != null && (
                    <span className="text-foreground">({Number(c.graduacion).toFixed(2)}g/L)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{fmtFecha(c.fecha)}</p>
                <p className="text-xs text-primary">{c.servicio_extra}</p>
              </div>
              <button
                onClick={() => eliminar(c.id)}
                aria-label="Eliminar control"
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
