import { neon } from "@neondatabase/serverless"

export const sql = neon(process.env.DATABASE_URL!)

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
