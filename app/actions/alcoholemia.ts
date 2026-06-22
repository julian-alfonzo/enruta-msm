"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getControlesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM controles_alcoholemia
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC
  `
}

export async function getAgentesConControl(search = "") {
  const like = "%" + search + "%"
  if (search) {
    return sql`
      SELECT a.*,
        (SELECT row_to_json(c) FROM (
          SELECT resultado, graduacion, fecha FROM controles_alcoholemia
          WHERE agente_id = a.id ORDER BY fecha DESC LIMIT 1
        ) c) AS ultimo_control
      FROM agentes a
      WHERE a.apellido_nombre ILIKE ${like} OR a.legajo ILIKE ${like}
      ORDER BY a.apellido_nombre ASC
    `
  }
  return sql`
    SELECT a.*,
      (SELECT row_to_json(c) FROM (
        SELECT resultado, graduacion, fecha FROM controles_alcoholemia
        WHERE agente_id = a.id ORDER BY fecha DESC LIMIT 1
      ) c) AS ultimo_control
    FROM agentes a
    ORDER BY a.apellido_nombre ASC
  `
}

export async function getAlcoholemiaStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM agentes) AS total,
      COUNT(DISTINCT agente_id) AS con_control,
      COUNT(*) FILTER (WHERE resultado = 'POSITIVO') AS positivos,
      COUNT(*) FILTER (WHERE resultado = 'NEGATIVO') AS negativos
    FROM controles_alcoholemia
  `
  return rows[0]
}

export async function createControl(data: {
  agente_id: number
  resultado: "POSITIVO" | "NEGATIVO"
  graduacion?: number
  servicio_extra?: string
  observacion?: string
  fecha: string
}) {
  await sql`
    INSERT INTO controles_alcoholemia (agente_id, resultado, graduacion, servicio_extra, observacion, fecha, created_at)
    VALUES (${data.agente_id}, ${data.resultado}, ${data.graduacion ?? null}, ${data.servicio_extra ?? null}, ${data.observacion ?? null}, ${data.fecha}, ${new Date().toISOString()})
  `
  revalidatePath("/alcoholemia")
}

export async function deleteControl(id: number) {
  await sql`DELETE FROM controles_alcoholemia WHERE id = ${id}`
  revalidatePath("/alcoholemia")
}

export async function getControlesParaReporte(desde?: string, hasta?: string) {
  if (desde && hasta) {
    return sql`
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      WHERE c.fecha >= ${desde} AND c.fecha <= ${hasta}
      ORDER BY c.fecha DESC
    `
  }
  return sql`
    SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia
    FROM controles_alcoholemia c
    JOIN agentes a ON a.id = c.agente_id
    ORDER BY c.fecha DESC
  `
}
