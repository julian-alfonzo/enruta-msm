"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getControlesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM controles_alcoholemia
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC, id DESC
  `
}

export async function getAgentesConControl(search = "") {
  const like = "%" + search + "%"
  if (search) {
    return sql`
      SELECT a.*,
        (SELECT row_to_json(c) FROM (
          SELECT id, fecha, resultado, graduacion, servicio_extra, observacion, created_at
          FROM controles_alcoholemia
          WHERE agente_id = a.id ORDER BY fecha DESC, id DESC LIMIT 1
        ) c) AS ultimo_control
      FROM agentes a
      WHERE a.deleted_at IS NULL
        AND (a.apellido_nombre ILIKE ${like} OR a.legajo ILIKE ${like})
      ORDER BY a.apellido_nombre ASC
    `
  }
  return sql`
    SELECT a.*,
      (SELECT row_to_json(c) FROM (
        SELECT id, fecha, resultado, graduacion, servicio_extra, observacion, created_at
        FROM controles_alcoholemia
        WHERE agente_id = a.id ORDER BY fecha DESC, id DESC LIMIT 1
      ) c) AS ultimo_control
    FROM agentes a
    WHERE a.deleted_at IS NULL
    ORDER BY a.apellido_nombre ASC
  `
}

export async function getAlcoholemiaStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM agentes WHERE deleted_at IS NULL) AS total,
      COUNT(DISTINCT agente_id)::int AS con_control,
      COUNT(*) FILTER (WHERE resultado = 'Positivo')::int AS positivos,
      COUNT(*) FILTER (WHERE resultado = 'Negativo')::int AS negativos
    FROM controles_alcoholemia
  `
  return rows[0]
}

export async function createControl(data: {
  agente_id: number
  resultado: "Positivo" | "Negativo"
  graduacion?: number
  servicio_extra?: string
  observacion?: string
  fecha: string
}) {
  const graduacionValue =
    data.resultado === "Positivo" ? data.graduacion ?? null : null

  await sql`
    INSERT INTO controles_alcoholemia (agente_id, resultado, graduacion, servicio_extra, observacion, fecha)
    VALUES (${data.agente_id}, ${data.resultado}, ${graduacionValue}, ${data.servicio_extra ?? null}, ${data.observacion ?? null}, ${data.fecha})
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
      WHERE a.deleted_at IS NULL
        AND c.fecha >= ${desde} AND c.fecha <= ${hasta}
      ORDER BY c.fecha DESC, c.id DESC
    `
  }
  return sql`
    SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia
    FROM controles_alcoholemia c
    JOIN agentes a ON a.id = c.agente_id
    WHERE a.deleted_at IS NULL
    ORDER BY c.fecha DESC, c.id DESC
  `
}
