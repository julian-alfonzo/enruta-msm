"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, MessageSquareWarning, CheckCheck, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
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
import type { ControlAlcoholemia } from "@/lib/db"
import {
  getControlesByAgente,
  createControl,
  deleteControl,
} from "@/app/actions/alcoholemia"
import {
  getObservacionesByAgente,
  createObservacion,
  toggleObservacionResuelto,
  deleteObservacion,
} from "@/app/actions/observaciones"

type AgenteInfo = {
  id: number
  legajo: string
  apellido_nombre: string
  fecha_ingreso: string | null
  dependencia: string | null
  cargo: string | null
  turno: string | null
}

function initials(n: string) {
  return n.slice(0, 2).toUpperCase()
}

export function AgenteDetailView({ agente }: { agente: AgenteInfo }) {
  const [tab, setTab] = useState<"perfil" | "alcoholemia" | "observaciones">("perfil")
  const router = useRouter()

  const tabs = [
    { key: "perfil" as const, label: "Perfil" },
    { key: "alcoholemia" as const, label: "Alcoholemia" },
    { key: "observaciones" as const, label: "Obs. / Reclamos" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-primary">
          {initials(agente.apellido_nombre)}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{agente.apellido_nombre}</h2>
          <p className="text-sm text-muted-foreground">Legajo: {agente.legajo}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "perfil" && <PerfilTab agente={agente} />}
      {tab === "alcoholemia" && <AlcoholemiaTab agenteId={agente.id} />}
      {tab === "observaciones" && <ObservacionesTab agenteId={agente.id} />}
    </div>
  )
}

function PerfilTab({ agente }: { agente: AgenteInfo }) {
  const fields = [
    { label: "Legajo", value: agente.legajo },
    { label: "Apellido y Nombres", value: agente.apellido_nombre },
    { label: "Fecha de Ingreso", value: agente.fecha_ingreso ?? "-" },
    { label: "Dependencia", value: agente.dependencia ?? "-" },
    { label: "Cargo", value: agente.cargo ?? "-" },
    { label: "Turno", value: agente.turno ?? "-" },
  ]

  return (
    <div className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-border">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-xs font-semibold text-muted-foreground">{f.label}</p>
            <p className="mt-1 text-sm text-foreground">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlcoholemiaTab({ agenteId }: { agenteId: number }) {
  const [controles, setControles] = useState<ControlAlcoholemia[] | null>(null)
  const [, start] = useTransition()
  const [nuevo, setNuevo] = useState(false)

  function cargar() {
    start(async () => {
      const data = (await getControlesByAgente(agenteId)) as ControlAlcoholemia[]
      setControles(data)
    })
  }

  useEffect(() => {
    cargar()
  }, [agenteId])

  function eliminar(id: number) {
    start(async () => {
      await deleteControl(id)
      cargar()
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{controles?.length ?? 0} control(es) registrado(s)</p>
        <Button size="sm" onClick={() => setNuevo(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo
        </Button>
      </div>

      {controles?.length === 0 && (
        <p className="rounded-xl bg-card py-8 text-center text-sm text-muted-foreground ring-1 ring-border">
          Sin controles registrados
        </p>
      )}

      <div className="flex flex-col gap-2">
        {controles?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
            {c.resultado === "Positivo" ? (
              <CheckCircle2 className="h-7 w-7 shrink-0 text-chart-2" />
            ) : (
              <XCircle className="h-7 w-7 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                <span className={c.resultado === "Positivo" ? "text-chart-2" : "text-destructive"}>
                  {c.resultado}
                </span>
                {c.graduacion != null && (
                  <span className="text-foreground"> ({Number(c.graduacion).toFixed(2)}g/L)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{typeof c.fecha === "string" ? c.fecha.slice(0, 10) : String(c.fecha)}</p>
              {c.servicio_extra && <p className="text-xs text-primary">{c.servicio_extra}</p>}
              {c.observacion && <p className="text-xs text-muted-foreground">{c.observacion}</p>}
            </div>
            <button
              onClick={() => eliminar(c.id)}
              className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {nuevo && (
        <NuevoControlDialog
          agenteId={agenteId}
          onClose={() => setNuevo(false)}
          onDone={() => {
            cargar()
            setNuevo(false)
          }}
        />
      )}
    </div>
  )
}

const SERVICIOS = ["Cumpliendo servicio", "Hora extra"] as const

function NuevoControlDialog({
  agenteId,
  onClose,
  onDone,
}: {
  agenteId: number
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<"Positivo" | "Negativo" | "">("")
  const [servicioExtra, setServicioExtra] = useState<string>("Cumpliendo servicio")
  const [graduacion, setGraduacion] = useState("")
  const [observacion, setObservacion] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  function submit() {
    setError(null)
    if (!resultado) {
      setError("Seleccioná un resultado")
      return
    }
    if (resultado === "Positivo") {
      const g = Number(graduacion)
      if (!graduacion || isNaN(g) || g < 0.01 || g > 9.99) {
        setError("La graduación debe estar entre 0.01 y 9.99")
        return
      }
    }
    start(async () => {
      try {
        await createControl({
          agente_id: agenteId,
          resultado,
          graduacion: resultado === "Positivo" ? Number(graduacion) : undefined,
          servicio_extra: servicioExtra,
          observacion: observacion || undefined,
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
          <DialogTitle>Nuevo Control</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Resultado</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setResultado("Positivo")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  resultado === "Positivo" ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <CheckCircle2 className="h-4 w-4" /> Positivo
              </button>
              <button
                onClick={() => setResultado("Negativo")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  resultado === "Negativo" ? "bg-destructive text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <XCircle className="h-4 w-4" /> Negativo
              </button>
            </div>
          </div>

          {resultado === "Positivo" && (
            <div>
              <Label className="mb-1.5 block text-sm font-semibold">Graduación (g/L)</Label>
              <Input
                type="number" step="0.01" min="0.01" max="9.99"
                value={graduacion}
                onChange={(e) => setGraduacion(e.target.value)}
                placeholder="0.24"
                className="rounded-xl"
              />
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Servicio</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => setServicioExtra(s)}
                  className={cn(
                    "rounded-xl py-3 text-sm font-semibold transition-colors",
                    servicioExtra === s ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s}
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

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Guardar Control"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TIPO_ICON = {
  Observación: { icon: AlertTriangle, color: "text-chart-2", bg: "bg-chart-2/10" },
  Reclamo: { icon: MessageSquareWarning, color: "text-destructive", bg: "bg-destructive/10" },
} as const

type ObservacionRow = {
  id: number
  agente_id: number
  tipo: "Observación" | "Reclamo"
  descripcion: string
  resuelto: boolean
  fecha: string
  created_at: string
}

function ObservacionesTab({ agenteId }: { agenteId: number }) {
  const [observaciones, setObservaciones] = useState<ObservacionRow[] | null>(null)
  const [, start] = useTransition()
  const [nuevo, setNuevo] = useState(false)

  function cargar() {
    start(async () => {
      const data = (await getObservacionesByAgente(agenteId)) as ObservacionRow[]
      setObservaciones(data)
    })
  }

  useEffect(() => {
    cargar()
  }, [agenteId])

  function toggleResuelto(id: number, actual: boolean) {
    start(async () => {
      await toggleObservacionResuelto(id, !actual)
      cargar()
    })
  }

  function eliminar(id: number) {
    start(async () => {
      await deleteObservacion(id)
      cargar()
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{observaciones?.length ?? 0} registro(s)</p>
        <Button size="sm" onClick={() => setNuevo(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nueva
        </Button>
      </div>

      {observaciones?.length === 0 && (
        <p className="rounded-xl bg-card py-8 text-center text-sm text-muted-foreground ring-1 ring-border">
          Sin observaciones ni reclamos
        </p>
      )}

      <div className="flex flex-col gap-2">
        {observaciones?.map((o) => {
          const config = TIPO_ICON[o.tipo]
          const Icon = config.icon
          return (
            <div
              key={o.id}
              className={cn(
                "flex items-start gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border",
                o.resuelto && "opacity-60",
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "rounded px-2 py-0.5 text-xs font-bold",
                    o.tipo === "Reclamo" ? "bg-destructive/10 text-destructive" : "bg-chart-2/10 text-chart-2",
                  )}>
                    {o.tipo}
                  </span>
                  <span className={cn(
                    "rounded px-2 py-0.5 text-xs font-bold",
                    o.resuelto ? "bg-muted text-muted-foreground" : "bg-chart-2/10 text-chart-2",
                  )}>
                    {o.resuelto ? "RESUELTA" : "ABIERTA"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{o.descripcion}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {typeof o.fecha === "string" ? o.fecha.slice(0, 10) : String(o.fecha)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => toggleResuelto(o.id, o.resuelto)}
                  className="rounded-lg p-2 hover:bg-accent"
                  title={o.resuelto ? "Reabrir" : "Marcar como resuelta"}
                >
                  {o.resuelto ? (
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckCheck className="h-4 w-4 text-chart-2" />
                  )}
                </button>
                <button
                  onClick={() => eliminar(o.id)}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {nuevo && (
        <NuevaObservacionDialog
          agenteId={agenteId}
          onClose={() => setNuevo(false)}
          onDone={() => {
            cargar()
            setNuevo(false)
          }}
        />
      )}
    </div>
  )
}

function NuevaObservacionDialog({
  agenteId,
  onClose,
  onDone,
}: {
  agenteId: number
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [tipo, setTipo] = useState<"" | "Observación" | "Reclamo">("")
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    if (!tipo || !descripcion) {
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
            <Label className="mb-1.5 block text-sm font-semibold">Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-xl" />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-semibold">Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Observación", "Reclamo"] as const).map((t) => {
                const config = TIPO_ICON[t]
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
                    <Icon className="h-5 w-5" /> {t}
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || !tipo || !descripcion}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
