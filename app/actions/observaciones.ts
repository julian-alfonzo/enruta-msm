"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type ObservacionTipo = "FALTA" | "RECLAMO" | "NOVEDAD"

export async function getObservaciones(search = "", tipo = "", resuelto = "") {
  const conditions: any[] = []
  const params: any[] = []

  if (search) {
    const like = "%" + search + "%"
    conditions.push(sql`(a.apellido_nombre ILIKE ${like} OR a.legajo ILIKE ${like} OR o.descripcion ILIKE ${like})`)
  }
  if (tipo && tipo !== "Todos") {
    conditions.push(sql`o.tipo = ${tipo}`)
  }
  if (resuelto === "true") {
    conditions.push(sql`o.resuelto = TRUE`)
  } else if (resuelto === "false") {
    conditions.push(sql`o.resuelto = FALSE`)
  }

  const where = conditions.length > 0
    ? sql`WHERE ${conditions.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`)}`
    : sql``

  return sql`
    SELECT o.*, a.apellido_nombre AS agente_apellido_nombre, a.legajo AS agente_legajo
    FROM observaciones_reclamos o
    JOIN agentes a ON a.id = o.agente_id
    ${where}
    ORDER BY o.fecha DESC
  `
}

export async function getObservacionesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM observaciones_reclamos
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC
  `
}

export async function getObservacionById(id: number) {
  const rows = await sql`SELECT * FROM observaciones_reclamos WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getObservacionesStats() {
  const rows = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE NOT resuelto) AS abiertas,
      COUNT(*) FILTER (WHERE resuelto) AS resueltas,
      COUNT(*) FILTER (WHERE tipo = 'FALTA') AS faltas,
      COUNT(*) FILTER (WHERE tipo = 'RECLAMO') AS reclamos,
      COUNT(*) FILTER (WHERE tipo = 'NOVEDAD') AS novedades
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
    INSERT INTO observaciones_reclamos (agente_id, tipo, descripcion, fecha, resuelto, created_at)
    VALUES (${data.agente_id}, ${data.tipo}, ${data.descripcion}, ${data.fecha}, FALSE, ${new Date().toISOString()})
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
    ORDER BY apellido_nombre ASC
  `
}
