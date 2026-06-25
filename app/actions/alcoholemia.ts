"use server"

import { sql, rawQuery } from "@/lib/db"
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

export async function deleteControlesByFecha(fecha: string) {
  await sql`DELETE FROM controles_alcoholemia WHERE fecha >= ${fecha} AND fecha < ${fecha}::date + INTERVAL '1 day'`
  revalidatePath("/alcoholemia")
}

export async function deleteControlesByRango(desde: string, hasta: string) {
  await sql`DELETE FROM controles_alcoholemia WHERE fecha >= ${desde} AND fecha <= ${hasta}`
  revalidatePath("/alcoholemia")
}

export async function updateControl(
  id: number,
  data: {
    resultado: "Positivo" | "Negativo"
    graduacion?: number | null
    servicio_extra?: string | null
    observacion?: string | null
    fecha: string
  },
) {
  const graduacionValue =
    data.resultado === "Positivo" ? data.graduacion ?? null : null

  await sql`
    UPDATE controles_alcoholemia SET
      resultado = ${data.resultado},
      graduacion = ${graduacionValue},
      servicio_extra = ${data.servicio_extra ?? null},
      observacion = ${data.observacion ?? null},
      fecha = ${data.fecha}
    WHERE id = ${id}
  `
  revalidatePath("/alcoholemia")
}

export async function buscarControles(search?: string, desde?: string, hasta?: string) {
  const conditions: string[] = ["a.deleted_at IS NULL"]
  const params: any[] = []

  if (search) {
    const like = "%" + search + "%"
    params.push(like, like)
    conditions.push(`(a.apellido_nombre ILIKE $${params.length - 1} OR a.legajo ILIKE $${params.length})`)
  }
  if (desde) {
    params.push(desde)
    conditions.push(`c.fecha >= $${params.length}`)
  }
  if (hasta) {
    params.push(hasta)
    conditions.push(`c.fecha <= $${params.length}`)
  }

  const where = `WHERE ${conditions.join(" AND ")}`
  const query = `
    SELECT c.*, a.apellido_nombre, a.legajo
    FROM controles_alcoholemia c
    JOIN agentes a ON a.id = c.agente_id
    ${where}
    ORDER BY c.fecha DESC, c.id DESC
    LIMIT 200
  `
  return rawQuery(query, params)
}

export async function getControlesParaReporte(desde?: string, hasta?: string) {
  if (desde && hasta) {
    return sql`
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      WHERE a.deleted_at IS NULL
        AND c.fecha >= ${desde} AND c.fecha <= ${hasta}
      ORDER BY c.fecha DESC, c.id DESC
    `
  }
  return sql`
    SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
    FROM controles_alcoholemia c
    JOIN agentes a ON a.id = c.agente_id
    WHERE a.deleted_at IS NULL
    ORDER BY c.fecha DESC, c.id DESC
  `
}
