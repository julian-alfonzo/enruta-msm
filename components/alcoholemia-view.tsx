"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Trash2, CheckCircle2, XCircle, ArrowLeft, Pencil, ExternalLink, FileSpreadsheet, FileText } from "lucide-react"
import type { Agente, ControlAlcoholemia } from "@/lib/db"
import Link from "next/link"
import {
  getAgentesConControl,
  getControlesByAgente,
  createControl,
  deleteControl,
  updateControl,
  buscarControles,
  deleteControlesByRango,
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

type UltimoControl = {
  id: number
  fecha: string
  resultado: "Positivo" | "Negativo"
  graduacion: number | null
  servicio_extra: string | null
  observacion: string | null
  created_at: string
}

type AgenteControl = Agente & { ultimo_control: UltimoControl | null }

type Stats = { total: number; con_control: number; positivos: number; negativos: number }

type ControlesItem = ControlAlcoholemia & { apellido_nombre: string; legajo: string; dependencia?: string | null; cargo?: string | null }

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
  const [editar, setEditar] = useState<ControlesItem | null>(null)

  // Buscar controles state
  const [tab, setTab] = useState<"agentes" | "buscar">("agentes")
  const [bSearch, setBSearch] = useState("")
  const [bDesde, setBDesde] = useState("")
  const [bHasta, setBHasta] = useState("")
  const [bDependencia, setBDependencia] = useState("")
  const [bCargo, setBCargo] = useState("")
  const [bResultados, setBResultados] = useState<ControlesItem[] | null>(null)
  const [, startB] = useTransition()

  function refresh(s = search) {
    startTransition(async () => {
      const data = (await getAgentesConControl(s)) as AgenteControl[]
      setAgentes(data)
    })
  }

  function doBuscar() {
    startB(async () => {
      const data = (await buscarControles(
        bSearch || undefined,
        bDesde || undefined,
        bHasta || undefined,
        bDependencia || undefined,
        bCargo || undefined,
      )) as ControlesItem[]
      setBResultados(data)
    })
  }

  function onBuscarChanged() {
    doBuscar()
  }

  const cards = [
    { label: "Total", value: stats.total, color: "text-primary" },
    { label: "Con control", value: stats.con_control, color: "text-chart-2" },
    { label: "Positivo", value: stats.positivos, color: "text-chart-2" },
    { label: "Negativo", value: stats.negativos, color: "text-destructive" },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <h2 className="mb-4 text-2xl font-bold text-foreground lg:text-3xl">Control de Alcoholemia</h2>

      <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => setTab("agentes")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "agentes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          Por Agente
        </button>
        <button
          onClick={() => setTab("buscar")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "buscar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          Buscar Controles
        </button>
      </div>

      {tab === "agentes" ? (
        <>
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
                <Link
                  href={`/agentes/${a.id}?tab=alcoholemia`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary hover:bg-accent/80"
                >
                  {initials(a.apellido_nombre)}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/agentes/${a.id}?tab=alcoholemia`} className="font-semibold text-foreground hover:text-primary">
                    <p className="truncate">{a.apellido_nombre}</p>
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    Leg: {a.legajo} · {a.dependencia?.slice(0, 18)}{a.cargo ? ` · ${a.cargo}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {a.ultimo_control ? (
                    <span
                      className={cn(
                        "text-xs font-bold",
                        a.ultimo_control.resultado === "Positivo" ? "text-chart-2" : "text-destructive",
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
        </>
      ) : (
        <BuscarControlesView
          search={bSearch}
          setSearch={setBSearch}
          desde={bDesde}
          setDesde={setBDesde}
          hasta={bHasta}
          setHasta={setBHasta}
          onBuscar={doBuscar}
          resultados={bResultados}
          onDelete={onBuscarChanged}
          onEdit={(item) => setEditar(item)}
        />
      )}

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
      {editar && (
        <EditarControlDialog
          control={editar}
          onClose={() => setEditar(null)}
          onDone={onBuscarChanged}
        />
      )}
    </div>
  )
}

const SERVICIOS = ["Cumpliendo servicio", "Hora extra"] as const

function BuscarControlesView({
  search,
  setSearch,
  desde,
  setDesde,
  hasta,
  setHasta,
  onBuscar,
  resultados,
  onDelete,
  onEdit,
}: {
  search: string
  setSearch: (v: string) => void
  desde: string
  setDesde: (v: string) => void
  hasta: string
  setHasta: (v: string) => void
  onBuscar: () => void
  resultados: ControlesItem[] | null
  onDelete: () => void
  onEdit: (item: ControlesItem) => void
}) {
  const [, start] = useTransition()
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<string | null>(null)
  const [fDependencia, setFDependencia] = useState("")
  const [fCargo, setFCargo] = useState("")
  const [working, setWorking] = useState<string | null>(null)

  function fmtDate(iso: string) {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("es-AR")
  }

  function exportarPdf() {
    setWorking("pdf")
    start(async () => {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])
      const jsPDF = jsPDFModule.default
      const autoTable = autoTableModule.default
      const doc = new jsPDF({ orientation: "landscape" })

      doc.setFillColor(36, 36, 36)
      doc.rect(0, 0, 297, 18, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.text("Control de Alcoholemia", 14, 12)
      doc.setTextColor(20, 20, 20)
      doc.setFontSize(9)
      const filtros = [
        desde && `Desde: ${desde}`, hasta && `Hasta: ${hasta}`,
        search && `Agente: ${search}`, fDependencia && `Dep: ${fDependencia}`,
        fCargo && `Cargo: ${fCargo}`,
      ].filter(Boolean).join(" · ")
      doc.text(`Total: ${resultados?.length ?? 0} controles${filtros ? ` · ${filtros}` : ""}`, 14, 22)

      autoTable(doc, {
        startY: 28,
        head: [["Agente", "Legajo", "Dep.", "Cargo", "Resultado", "Graduación", "Servicio", "Fecha"]],
        body: (resultados ?? []).map((c: any) => [
          c.apellido_nombre, c.legajo,
          c.dependencia ?? "-", c.cargo ?? "-",
          c.resultado,
          c.graduacion != null ? `${Number(c.graduacion).toFixed(2)} g/L` : "-",
          c.servicio_extra ?? "-", fmtDate(c.fecha),
        ]),
        headStyles: { fillColor: [79, 195, 247], fontSize: 7 },
        styles: { fontSize: 6 },
        margin: { left: 5, right: 5 },
      })
      doc.save(`alcoholemia-${desde || "reporte"}.pdf`)
      setWorking(null)
    })
  }

  function exportarExcel() {
    setWorking("excel")
    start(async () => {
      const XLSX = await import("xlsx")
      const rows = (resultados ?? []).map((c: any) => ({
        Agente: c.apellido_nombre, Legajo: c.legajo,
        Dependencia: c.dependencia ?? "", Cargo: c.cargo ?? "",
        Resultado: c.resultado,
        "Graduación (g/L)": c.graduacion != null ? Number(c.graduacion) : "",
        Servicio: c.servicio_extra ?? "",
        Fecha: fmtDate(c.fecha),
        Observación: c.observacion ?? "",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Alcoholemia")
      XLSX.writeFile(wb, `alcoholemia-${desde || "reporte"}.xlsx`)
      setWorking(null)
    })
  }

  function eliminar(id: number) {
    start(async () => {
      await deleteControl(id)
      onDelete()
    })
  }

  function handleDeleteAll() {
    if (!desde || !hasta) return
    if (confirmDeleteAll === null) {
      setConfirmDeleteAll(`${desde}_${hasta}`)
      return
    }
    if (confirmDeleteAll !== `${desde}_${hasta}`) {
      setConfirmDeleteAll(`${desde}_${hasta}`)
      return
    }
    start(async () => {
      await deleteControlesByRango(desde, hasta)
      setConfirmDeleteAll(null)
      onDelete()
    })
  }

  const puedeBorrarTodo = desde && hasta && resultados && resultados.length > 0
  const rangoEtiqueta = desde && hasta && desde === hasta ? desde : `${desde} a ${hasta}`

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Agente (nombre o legajo)"
            className="rounded-xl flex-1"
            onKeyDown={(e) => e.key === "Enter" && onBuscar()}
          />
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-40 rounded-xl"
          />
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40 rounded-xl"
          />
          <Button onClick={onBuscar} className="rounded-xl">
            <Search className="mr-1 h-4 w-4" /> Buscar
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={fDependencia}
            onChange={(e) => setFDependencia(e.target.value)}
            placeholder="Filtrar por dependencia"
            className="rounded-xl flex-1 text-xs"
          />
          <Input
            value={fCargo}
            onChange={(e) => setFCargo(e.target.value)}
            placeholder="Filtrar por cargo"
            className="rounded-xl flex-1 text-xs"
          />
        </div>
      </div>

      {resultados === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Usá los filtros y presioná Buscar</p>
      ) : resultados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{resultados.length} control(es) encontrado(s)</p>
              {resultados.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={exportarPdf} disabled={!!working} className="h-7 rounded-lg text-xs">
                    <FileText className="mr-1 h-3 w-3 text-red-500" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportarExcel} disabled={!!working} className="h-7 rounded-lg text-xs">
                    <FileSpreadsheet className="mr-1 h-3 w-3 text-green-600" /> Excel
                  </Button>
                </>
              )}
            </div>
            {puedeBorrarTodo && (
              confirmDeleteAll === null ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAll}
                  className="rounded-xl"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Borrar todos ({rangoEtiqueta})
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-destructive">
                    ¿Seguro? Se borrarán {resultados.length} controles
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAll}
                    className="rounded-xl"
                  >
                    Sí, borrar todo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteAll(null)}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                </div>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            {resultados.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
                {c.resultado === "Positivo" ? (
                  <CheckCircle2 className="h-7 w-7 shrink-0 text-chart-2" />
                ) : (
                  <XCircle className="h-7 w-7 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/agentes/${c.agente_id}?tab=alcoholemia`} className="text-sm font-semibold text-foreground hover:text-primary">
                    <p className="truncate">{c.apellido_nombre}</p>
                  </Link>
                   <p className="text-xs text-muted-foreground">
                    Leg: {c.legajo} · {typeof c.fecha === "string" ? c.fecha.slice(0, 10) : String(c.fecha)}
                  </p>
                  {(c.dependencia || c.cargo) && (
                    <p className="text-xs text-primary">
                      {[c.dependencia, c.cargo].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        c.resultado === "Positivo" ? "text-chart-2" : "text-destructive",
                      )}
                    >
                      {c.resultado}
                    </span>
                    {c.graduacion != null && (
                      <span className="text-xs">({Number(c.graduacion).toFixed(2)}g/L)</span>
                    )}
                    {c.servicio_extra && <span className="text-xs text-primary">{c.servicio_extra}</span>}
                    {c.observacion && (
                      <span className="truncate text-xs text-muted-foreground">{c.observacion}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(c)}
                  aria-label="Editar control"
                  className="rounded-lg p-2 text-primary hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => eliminar(c.id)}
                  aria-label="Eliminar control"
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function EditarControlDialog({
  control,
  onClose,
  onDone,
}: {
  control: ControlesItem
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<"Positivo" | "Negativo">(control.resultado)
  const [servicioExtra, setServicioExtra] = useState<string>(control.servicio_extra ?? "Cumpliendo servicio")
  const [graduacion, setGraduacion] = useState(control.graduacion != null ? String(control.graduacion) : "")
  const [observacion, setObservacion] = useState(control.observacion ?? "")
  const [fecha, setFecha] = useState(
    typeof control.fecha === "string" ? control.fecha.slice(0, 10) : new Date(control.fecha).toISOString().slice(0, 10),
  )

  function submit() {
    setError(null)
    if (resultado === "Positivo") {
      const g = Number(graduacion)
      if (!graduacion || isNaN(g) || g < 0.01 || g > 9.99) {
        setError("La graduación debe estar entre 0.01 y 9.99")
        return
      }
    }
    start(async () => {
      try {
        await updateControl(control.id, {
          resultado,
          graduacion: resultado === "Positivo" ? Number(graduacion) : null,
          servicio_extra: servicioExtra || null,
          observacion: observacion || null,
          fecha: new Date(fecha).toISOString(),
        })
        onDone()
        onClose()
      } catch (e) {
        setError(String((e as Error).message ?? e))
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Control</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-accent p-3">
          <p className="font-bold text-foreground">{control.apellido_nombre}</p>
          <p className="text-xs text-muted-foreground">Legajo: {control.legajo}</p>
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
                type="number"
                step="0.01"
                min="0.01"
                max="9.99"
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          agente_id: agente.id,
          resultado,
          graduacion: resultado === "Positivo" ? Number(graduacion) : undefined,
          servicio_extra: servicioExtra,
          observacion: observacion || undefined,
          fecha: new Date(fecha).toISOString(),
        })
        onDone()
        onClose()
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
                type="number"
                step="0.01"
                min="0.01"
                max="9.99"
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
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
              {c.resultado === "Positivo" ? (
                <CheckCircle2 className="h-7 w-7 text-chart-2" />
              ) : (
                <XCircle className="h-7 w-7 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  <span className={c.resultado === "Positivo" ? "text-chart-2" : "text-destructive"}>
                    {c.resultado}
                  </span>{" "}
                  {c.graduacion != null && (
                    <span className="text-foreground">({Number(c.graduacion).toFixed(2)}g/L)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typeof c.fecha === "string" ? c.fecha.slice(0, 10) : String(c.fecha)}
                </p>
                {c.servicio_extra && <p className="text-xs text-primary">{c.servicio_extra}</p>}
                {c.observacion && <p className="text-xs text-muted-foreground">{c.observacion}</p>}
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
