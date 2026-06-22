"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Pencil, X } from "lucide-react"
import type { Agente } from "@/lib/db"
import { getAgentes, createAgente, updateAgente } from "@/app/actions/agentes"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function initials(apellidoNombre: string) {
  return apellidoNombre.slice(0, 2).toUpperCase()
}

export function AgentesView({ initialAgentes }: { initialAgentes: Agente[] }) {
  const [agentes, setAgentes] = useState(initialAgentes)
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()

  const [crearOpen, setCrearOpen] = useState(false)
  const [editar, setEditar] = useState<Agente | null>(null)

  function refresh(s = search) {
    startTransition(async () => {
      const data = (await getAgentes(s)) as Agente[]
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
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{agentes.length} agente(s) encontrado(s)</p>

      <div className="grid gap-2 lg:grid-cols-2">
        {agentes.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
              {initials(a.apellido_nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{a.apellido_nombre}</p>
              <p className="text-xs text-muted-foreground">Legajo: {a.legajo}</p>
              <p className="text-xs text-primary">{a.dependencia ?? "—"}</p>
              {a.turno && <p className="text-xs text-muted-foreground">{a.turno}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditar(a)}
                aria-label="Editar agente"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <Pencil className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB mobile */}
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
  const [form, setForm] = useState({
    apellido_nombre: "",
    legajo: "",
    fecha_ingreso: "",
    dependencia: "",
    cargo: "",
    turno: "",
  })

  function submit() {
    if (!form.apellido_nombre || !form.legajo) return
    start(async () => {
      await createAgente({
        apellido_nombre: form.apellido_nombre,
        legajo: form.legajo,
        fecha_ingreso: form.fecha_ingreso || undefined,
        dependencia: form.dependencia || undefined,
        cargo: form.cargo || undefined,
        turno: form.turno || undefined,
      })
      setForm({ apellido_nombre: "", legajo: "", fecha_ingreso: "", dependencia: "", cargo: "", turno: "" })
      onDone()
      onClose()
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
          <Field label="Fecha de ingreso" placeholder="DD/MM/AAAA" value={form.fecha_ingreso} onChange={(v) => setForm({ ...form, fecha_ingreso: v })} />
          <Field label="Dependencia" value={form.dependencia} onChange={(v) => setForm({ ...form, dependencia: v })} />
          <Field label="Cargo" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
          <Field label="Turno" value={form.turno} onChange={(v) => setForm({ ...form, turno: v })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || !form.apellido_nombre || !form.legajo}>
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
  const [form, setForm] = useState({
    apellido_nombre: agente.apellido_nombre,
    legajo: agente.legajo,
    fecha_ingreso: agente.fecha_ingreso ?? "",
    dependencia: agente.dependencia ?? "",
    cargo: agente.cargo ?? "",
    turno: agente.turno ?? "",
  })

  function submit() {
    start(async () => {
      await updateAgente(agente.id, {
        apellido_nombre: form.apellido_nombre,
        legajo: form.legajo,
        fecha_ingreso: form.fecha_ingreso || undefined,
        dependencia: form.dependencia || undefined,
        cargo: form.cargo || undefined,
        turno: form.turno || undefined,
      })
      onDone()
      onClose()
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
          <Field label="Legajo" value={form.legajo} onChange={(v) => setForm({ ...form, legajo: v })} />
          <Field label="Fecha de ingreso" value={form.fecha_ingreso} onChange={(v) => setForm({ ...form, fecha_ingreso: v })} />
          <Field label="Dependencia" value={form.dependencia} onChange={(v) => setForm({ ...form, dependencia: v })} />
          <Field label="Cargo" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
          <Field label="Turno" value={form.turno} onChange={(v) => setForm({ ...form, turno: v })} />
        </div>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  )
}
