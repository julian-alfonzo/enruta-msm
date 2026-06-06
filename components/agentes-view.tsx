"use client"

import { useState, useTransition } from "react"
import { Search, Plus, Pencil, Clock, X } from "lucide-react"
import type { Agente } from "@/lib/db"
import { getAgentes, createAgente, updateAgente, updateHoras } from "@/app/actions/agentes"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const tipos = ["Caminadora", "Moto", "Tránsito", "Patrulla de Moto", "Sin tipo"]

function initials(nombre: string) {
  return nombre.slice(0, 2).toUpperCase()
}

export function AgentesView({ initialAgentes }: { initialAgentes: Agente[] }) {
  const [agentes, setAgentes] = useState(initialAgentes)
  const [search, setSearch] = useState("")
  const [tipo, setTipo] = useState("Todos los tipos")
  const [, startTransition] = useTransition()

  const [crearOpen, setCrearOpen] = useState(false)
  const [editar, setEditar] = useState<Agente | null>(null)
  const [horas, setHoras] = useState<Agente | null>(null)

  function refresh(s = search, t = tipo) {
    startTransition(async () => {
      const data = (await getAgentes(s, t)) as Agente[]
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
            refresh(e.target.value, tipo)
          }}
          placeholder="Buscar por nombre, legajo o DNI"
          className="rounded-xl pl-10"
        />
      </div>

      <Select
        value={tipo}
        onValueChange={(v) => {
          setTipo(v)
          refresh(search, v)
        }}
      >
        <SelectTrigger className="mb-4 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todos los tipos">Todos los tipos</SelectItem>
          {tipos.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="mb-3 text-sm text-muted-foreground">{agentes.length} agente(s) encontrado(s)</p>

      <div className="grid gap-2 lg:grid-cols-2">
        {agentes.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
              {initials(a.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{a.nombre}</p>
              <p className="text-xs text-muted-foreground">Legajo: {a.legajo}</p>
              <p className="text-xs">
                <span className="text-primary">{a.tipo}</span>{" "}
                <span className={a.activo ? "text-chart-2 font-medium" : "text-destructive font-medium"}>
                  {a.activo ? "Activo" : "Inactivo"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHoras(a)}
                aria-label="Editar horas"
                className="rounded-lg p-2 text-primary hover:bg-accent"
              >
                <Clock className="h-5 w-5" />
              </button>
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
      {horas && <EditarHorasDialog agente={horas} onClose={() => setHoras(null)} onDone={() => refresh()} />}
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
  const [form, setForm] = useState({ nombre: "", dni: "", legajo: "", telefono: "", tipo: "" })

  function submit() {
    if (!form.nombre || !form.dni || !form.legajo || !form.tipo) return
    start(async () => {
      await createAgente(form)
      setForm({ nombre: "", dni: "", legajo: "", telefono: "", tipo: "" })
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
          <Field label="Nombre completo *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
          <Field label="DNI *" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
          <Field label="Legajo *" value={form.legajo} onChange={(v) => setForm({ ...form, legajo: v })} />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Tipo de agente *</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
  const [form, setForm] = useState({
    nombre: agente.nombre,
    legajo: agente.legajo,
    dependencia: agente.dependencia ?? "",
    cargo: agente.cargo ?? "",
    tipo: agente.tipo ?? "",
    telefono: agente.telefono ?? "",
  })

  function submit() {
    start(async () => {
      await updateAgente(agente.id, form)
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
          <Field label="Nombre" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
          <Field label="Legajo" value={form.legajo} onChange={(v) => setForm({ ...form, legajo: v })} />
          <Field
            label="Dependencia"
            value={form.dependencia}
            onChange={(v) => setForm({ ...form, dependencia: v })}
          />
          <Field label="Cargo" value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
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

function EditarHorasDialog({
  agente,
  onClose,
  onDone,
}: {
  agente: Agente
  onClose: () => void
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [mensuales, setMensuales] = useState(String(agente.horas_mensuales ?? 0))
  const [extra, setExtra] = useState(String(agente.horas_extra ?? 0))

  function submit() {
    start(async () => {
      await updateHoras(agente.id, Number(mensuales) || 0, Number(extra) || 0)
      onDone()
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar horas — {agente.nombre}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Horas mensuales</Label>
            <Input
              type="number"
              value={mensuales}
              onChange={(e) => setMensuales(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Horas extra</Label>
            <Input type="number" value={extra} onChange={(e) => setExtra(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Guardando..." : "Guardar horas"}
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  )
}
