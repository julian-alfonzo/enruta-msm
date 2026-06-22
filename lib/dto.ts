export type AgenteDTO = {
  id: number
  legajo: string
  apellidoNombre: string
  fechaIngreso: string | null
  dependencia: string | null
  cargo: string | null
  turno: string | null
  createdAt: string
  updatedAt: string
}

export function agenteToDTO(a: any): AgenteDTO {
  return {
    id: Number(a.id),
    legajo: a.legajo,
    apellidoNombre: a.apellido_nombre,
    fechaIngreso: a.fecha_ingreso,
    dependencia: a.dependencia,
    cargo: a.cargo,
    turno: a.turno,
    createdAt: toIso(a.created_at),
    updatedAt: toIso(a.updated_at),
  }
}

export type ControlAlcoholemiaDTO = {
  id: number
  agenteId: number
  fecha: string
  resultado: "Positivo" | "Negativo"
  graduacion: number | null
  servicioExtra: string | null
  observacion: string | null
  createdAt: string
}

export function controlToDTO(c: any): ControlAlcoholemiaDTO {
  return {
    id: Number(c.id),
    agenteId: Number(c.agente_id),
    fecha: toDateOnly(c.fecha),
    resultado: c.resultado,
    graduacion: c.graduacion != null ? Number(c.graduacion) : null,
    servicioExtra: c.servicio_extra,
    observacion: c.observacion,
    createdAt: toIso(c.created_at),
  }
}

export type ObservacionReclamoDTO = {
  id: number
  agenteId: number
  tipo: "Observación" | "Reclamo"
  descripcion: string
  fecha: string
  resuelto: boolean
  createdAt: string
}

export function observacionToDTO(o: any): ObservacionReclamoDTO {
  return {
    id: Number(o.id),
    agenteId: Number(o.agente_id),
    tipo: o.tipo,
    descripcion: o.descripcion,
    fecha: toDateOnly(o.fecha),
    resuelto: Boolean(o.resuelto),
    createdAt: toIso(o.created_at),
  }
}

function toIso(v: string | Date | null | undefined): string {
  if (!v) return ""
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

function toDateOnly(v: string | Date | null | undefined): string {
  if (!v) return ""
  if (v instanceof Date) {
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, "0")
    const d = String(v.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return String(v).slice(0, 10)
}
