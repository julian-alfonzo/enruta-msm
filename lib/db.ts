import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

let _sql: NeonQueryFunction<false, false> | null = null

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

export function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values)
}

export type Agente = {
  id: number
  nombre: string
  legajo: string
  dni: string | null
  telefono: string | null
  dependencia: string | null
  cargo: string | null
  tipo: string | null
  activo: boolean
  en_servicio: boolean
  horas_mensuales: number
  horas_extra: number
  created_at: string
}

export type Control = {
  id: number
  agente_id: number
  resultado: string
  valor: number | null
  tipo_servicio: string
  observaciones: string | null
  fecha_control: string
  created_at: string
}

export type Observacion = {
  id: number
  agente_id: number
  tipo: "FALTA" | "RECLAMO" | "NOVEDAD"
  descripcion: string
  estado: "ABIERTO" | "CERRADO"
  fecha: string
  created_at: string
}
