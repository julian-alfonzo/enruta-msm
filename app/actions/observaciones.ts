"use server"

import { sql, rawQuery } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type ObservacionTipo = "Observación" | "Reclamo"

export async function getObservaciones(search = "", tipo = "", resuelto = "") {
  const conditions: string[] = []
  const params: any[] = []
  if (search) {
    const like = "%" + search + "%"
    conditions.push(`(a.apellido_nombre ILIKE $${params.length + 1} OR a.legajo ILIKE $${params.length + 1} OR o.descripcion ILIKE $${params.length + 1})`)
    params.push(like)
  }
  if (tipo && tipo !== "Todos") {
    conditions.push(`o.tipo = $${params.length + 1}`)
    params.push(tipo)
  }
  if (resuelto === "true") {
    conditions.push(`o.resuelto = $${params.length + 1}`)
    params.push(true)
  } else if (resuelto === "false") {
    conditions.push(`o.resuelto = $${params.length + 1}`)
    params.push(false)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  return rawQuery(
    `SELECT o.*, a.apellido_nombre AS agente_apellido_nombre, a.legajo AS agente_legajo
     FROM observaciones_reclamos o
     JOIN agentes a ON a.id = o.agente_id
     ${where}
     ORDER BY o.fecha DESC, o.id DESC`,
    params,
  )
}

export async function getObservacionesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM observaciones_reclamos
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC, id DESC
  `
}

export async function getObservacionById(id: number) {
  const rows = await sql`SELECT * FROM observaciones_reclamos WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getObservacionesStats() {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT resuelto)::int AS abiertas,
      COUNT(*) FILTER (WHERE resuelto)::int AS resueltas,
      COUNT(*) FILTER (WHERE tipo = 'Observación')::int AS observaciones,
      COUNT(*) FILTER (WHERE tipo = 'Reclamo')::int AS reclamos
    FROM observaciones_reclamos
  `
  return rows[0]
}

export async function createObservacion(data: {
  agente_id: number
  tipo: ObservacionTipo
  descripcion: string
  fecha: string
}) {
  await sql`
    INSERT INTO observaciones_reclamos (agente_id, tipo, descripcion, fecha, resuelto)
    VALUES (${data.agente_id}, ${data.tipo}, ${data.descripcion}, ${data.fecha}, FALSE)
  `
  revalidatePath("/observaciones")
}

export async function updateObservacion(
  id: number,
  data: {
    tipo?: ObservacionTipo
    descripcion?: string
    resuelto?: boolean
  },
) {
  if (data.tipo !== undefined) {
    await sql`UPDATE observaciones_reclamos SET tipo = ${data.tipo} WHERE id = ${id}`
  }
  if (data.descripcion !== undefined) {
    await sql`UPDATE observaciones_reclamos SET descripcion = ${data.descripcion} WHERE id = ${id}`
  }
  if (data.resuelto !== undefined) {
    await sql`UPDATE observaciones_reclamos SET resuelto = ${data.resuelto} WHERE id = ${id}`
  }
  revalidatePath("/observaciones")
}

export async function toggleObservacionResuelto(id: number, resuelto: boolean) {
  await sql`UPDATE observaciones_reclamos SET resuelto = ${resuelto} WHERE id = ${id}`
  revalidatePath("/observaciones")
}

export async function deleteObservacion(id: number) {
  await sql`DELETE FROM observaciones_reclamos WHERE id = ${id}`
  revalidatePath("/observaciones")
}

export async function getAgentesForObservacion() {
  return sql`
    SELECT id, apellido_nombre, legajo, dependencia
    FROM agentes
    WHERE deleted_at IS NULL
    ORDER BY apellido_nombre ASC
  `
}
