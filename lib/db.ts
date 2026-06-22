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
  legajo: string
  apellido_nombre: string
  fecha_ingreso: string | null
  dependencia: string | null
  cargo: string | null
  turno: string | null
  created_at: string
  updated_at: string | null
}

export type ControlAlcoholemia = {
  id: number
  agente_id: number
  fecha: string
  resultado: "POSITIVO" | "NEGATIVO"
  graduacion: number | null
  servicio_extra: string | null
  observacion: string | null
  created_at: string
}

export type ObservacionReclamo = {
  id: number
  agente_id: number
  tipo: "FALTA" | "RECLAMO" | "NOVEDAD"
  descripcion: string
  fecha: string
  resuelto: boolean
  created_at: string
}
