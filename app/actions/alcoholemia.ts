"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getControlesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM alcoholemia_controles
    WHERE agente_id = ${agenteId}
    ORDER BY fecha_control DESC
  `
}

export async function getAgentesConControl(search = "") {
  const like = "%" + search + "%"
  if (search) {
    return sql`
      SELECT a.*,
        (SELECT row_to_json(c) FROM (
          SELECT resultado, valor, fecha_control FROM alcoholemia_controles
          WHERE agente_id = a.id ORDER BY fecha_control DESC LIMIT 1
        ) c) AS ultimo_control
      FROM agentes a
      WHERE a.nombre ILIKE ${like} OR a.legajo ILIKE ${like}
      ORDER BY a.nombre ASC
    `
  }
  return sql`
    SELECT a.*,
      (SELECT row_to_json(c) FROM (
        SELECT resultado, valor, fecha_control FROM alcoholemia_controles
        WHERE agente_id = a.id ORDER BY fecha_control DESC LIMIT 1
      ) c) AS ultimo_control
    FROM agentes a
    ORDER BY a.nombre ASC
  `
}

export async function getAlcoholemiaStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM agentes) AS total,
      COUNT(DISTINCT agente_id) AS con_control,
      COUNT(*) FILTER (WHERE resultado = 'POSITIVO') AS positivos,
      COUNT(*) FILTER (WHERE resultado = 'NEGATIVO') AS negativos
    FROM alcoholemia_controles
  `
  return rows[0]
}

export async function createControl(data: {
  agente_id: number
  resultado: string
  valor?: number
  tipo_servicio: string
  observaciones?: string
  fecha_control: string
}) {
  await sql`
    INSERT INTO alcoholemia_controles (agente_id, resultado, valor, tipo_servicio, observaciones, fecha_control)
    VALUES (${data.agente_id}, ${data.resultado}, ${data.valor ?? null}, ${data.tipo_servicio}, ${data.observaciones ?? null}, ${data.fecha_control})
  `
  revalidatePath("/alcoholemia")
}

export async function deleteControl(id: number) {
  await sql`DELETE FROM alcoholemia_controles WHERE id = ${id}`
  revalidatePath("/alcoholemia")
}

export async function getControlesParaReporte(desde?: string, hasta?: string) {
  if (desde && hasta) {
    return sql`
      SELECT c.*, a.nombre, a.legajo, a.dependencia
      FROM alcoholemia_controles c
      JOIN agentes a ON a.id = c.agente_id
      WHERE c.fecha_control >= ${desde} AND c.fecha_control <= ${hasta}
      ORDER BY c.fecha_control DESC
    `
  }
  return sql`
    SELECT c.*, a.nombre, a.legajo, a.dependencia
    FROM alcoholemia_controles c
    JOIN agentes a ON a.id = c.agente_id
    ORDER BY c.fecha_control DESC
  `
}
