"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Pencil, Trash2, ExternalLink, Filter } from "lucide-react"
import type { Agente } from "@/lib/db"
import { getAgentes, createAgente, updateAgente, deleteAgente } from "@/app/actions/agentes"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const TURNOS = ["ROTATIVO", "MAÑANA", "TARDE", "NOCHE", "FIJO"]

function initials(apellidoNombre: string) {
  return apellidoNombre.slice(0, 2).toUpperCase()
}

export function AgentesView({ initialAgentes }: { initialAgentes: Agente[] }) {
  const [agentes, setAgentes] = useState(initialAgentes)
  const [search, setSearch] = useState("")
  const [fDependencia, setFDependencia] = useState("")
  const [fCargo, setFCargo] = useState("")
  const [, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(false)

  const [crearOpen, setCrearOpen] = useState(false)
  const [editar, setEditar] = useState<Agente | null>(null)
  const [borrar, setBorrar] = useState<Agente | null>(null)

  function refresh(s = search, d = fDependencia, c = fCargo) {
    startTransition(async () => {
      const data = (await getAgentes(s, d, c)) as Agente[]
      setAgentes(data)
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Gestión de Agentes</h2>
        <Button onClick={() => setCrearOpen(true)} className="hidden lg:inline-flex">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            refresh(e.target.value)
          }}
          placeholder="Buscar por apellido y nombre, legajo o dependencia"
          className="rounded-xl pl-10"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5",
            showFilters ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {showFilters && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Input
            value={fDependencia}
            onChange={(e) => { setFDependencia(e.target.value); if (!e.target.value) refresh(search, "", fCargo) }}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Filtrar por dependencia"
            className="rounded-xl text-xs"
          />
          <Input
            value={fCargo}
            onChange={(e) => { setFCargo(e.target.value); if (!e.target.value) refresh(search, fDependencia, "") }}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Filtrar por cargo"
            className="rounded-xl text-xs"
          />
        </div>
      )}

      <p className="mb-3 text-sm text-muted-foreground">{agentes.length} agente(s) encontrado(s)</p>

      <div className="grid gap-2 lg:grid-cols-2">
        {agentes.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
            <Link href={`/agentes/${a.id}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary hover:bg-accent/80">
              {initials(a.apellido_nombre)}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/agentes/${a.id}`} className="font-semibold text-foreground hover:text-primary">
                {a.apellido_nombre}
              </Link>
              <p className="text-xs text-muted-foreground">Legajo: {a.legajo}</p>
              <p className="text-xs text-primary">{a.dependencia ?? "—"}{a.cargo ? ` · ${a.cargo}` : ""}</p>
              {a.turno && <p className="text-xs text-muted-foreground">{a.turno}</p>}
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/agentes/${a.id}`}
                title="Ver detalle"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <ExternalLink className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setEditar(a)}
                aria-label="Editar agente"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => setBorrar(a)}
                aria-label="Eliminar agente"
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setCrearOpen(true)}
        aria-label="Nuevo agente"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg lg:hidden"
      >
        <Plus className="h-7 w-7" />
      </button>

      <CrearAgenteDialog open={crearOpen} onClose={() => setCrearOpen(false)} onDone={() => refresh()} />
      {editar && (
        <EditarAgenteDialog agente={editar} onClose={() => setEditar(null)} onDone={() => refresh()} />
      )}
      {borrar && (
        <BorrarAgenteDialog agente={borrar} onClose={() => setBorrar(null)} onDone={() => refresh()} />
      )}
    </div>
  )
}

function CrearAgenteDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    legajo: "",
    apellido_nombre: "",
    fecha_ingreso: "",
    dependencia: "",
    cargo: "",
    turno: "",
  })

  function submit() {
    setError(null)
    if (!form.legajo || !form.apellido_nombre) {
      setError("Legajo y apellido/nombre son obligatorios")
      return
    }
    start(async () => {
      try {
        await createAgente({
          legajo: form.legajo,
          apellido_nombre: form.apellido_nombre,
          fecha_ingreso: form.fecha_ingreso || undefined,
          dependencia: form.dependencia || undefined,
          cargo: form.cargo || undefined,
          turno: form.turno || undefined,
        })
        setForm({ legajo: "", apellido_nombre: "", fecha_ingreso: "", dependencia: "", cargo: "", turno: "" })
        onDone()
        onClose()
      } catch (e) {
        setError(String((e as Error).message ?? e))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Agente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Apellido y nombre *" value={form.apellido_nombre} onChange={(v) => setForm({ ...form, apellido_nombre: v })} />
          <Field label="Legajo *" value={form.legajo} onChange={(v) => setForm({ ...form, legajo: v })} />
          <Field label="Fecha de ingreso" placeholder="DD/MM/AA" value={form.fecha_ingreso} onChange={(v) => setForm({ ...form, fecha_ingreso: v })} />
          <Field label="Dependencia" value={form.dependencia} onChange={(v) => setForm({ ...form, dependencia: v })} />
          <Field label="Cargo" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
          <TurnoSelect value={form.turno} onChange={(v) => setForm({ ...form, turno: v })} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creando..." : "Crear Agente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditarAgenteDialog({
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
  const [form, setForm] = useState({
    legajo: agente.legajo,
    apellido_nombre: agente.apellido_nombre,
    fecha_ingreso: agente.fecha_ingreso ?? "",
    dependencia: agente.dependencia ?? "",
    cargo: agente.cargo ?? "",
    turno: agente.turno ?? "",
  })

  function submit() {
    setError(null)
    if (form.legajo !== agente.legajo) {
      setError("El legajo es inmutable")
      return
    }
    start(async () => {
      try {
        await updateAgente(agente.id, {
          legajo: form.legajo,
          apellido_nombre: form.apellido_nombre,
          fecha_ingreso: form.fecha_ingreso || undefined,
          dependencia: form.dependencia || undefined,
          cargo: form.cargo || undefined,
          turno: form.turno || undefined,
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
          <DialogTitle>Editar datos del agente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Apellido y nombre" value={form.apellido_nombre} onChange={(v) => setForm({ ...form, apellido_nombre: v })} />
          <Field label="Legajo" value={form.legajo} onChange={(v) => setForm({ ...form, legajo: v })} disabled />
          <Field label="Fecha de ingreso" value={form.fecha_ingreso} onChange={(v) => setForm({ ...form, fecha_ingreso: v })} />
          <Field label="Dependencia" value={form.dependencia} onChange={(v) => setForm({ ...form, dependencia: v })} />
          <Field label="Cargo" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
          <TurnoSelect value={form.turno} onChange={(v) => setForm({ ...form, turno: v })} />
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

function BorrarAgenteDialog({
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

  function submit() {
    setError(null)
    start(async () => {
      try {
        await deleteAgente(agente.id)
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
          <DialogTitle>Eliminar agente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          ¿Eliminar a <strong>{agente.apellido_nombre}</strong> (Leg. {agente.legajo})? El agente se
          marcará como eliminado y no aparecerá en los listados.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TurnoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">Turno</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Sin especificar</option>
        {TURNOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-xl"
      />
    </div>
  )
}
