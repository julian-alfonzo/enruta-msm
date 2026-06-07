"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export type ObservacionTipo = "FALTA" | "RECLAMO" | "NOVEDAD"
export type ObservacionEstado = "ABIERTO" | "CERRADO"

export async function getObservaciones(search = "", tipo = "", estado = "") {
  let query = sql`
    SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
    FROM observaciones o
    JOIN agentes a ON a.id = o.agente_id
    WHERE 1=1
  `

  if (search) {
    const like = "%" + search + "%"
    query = sql`
      SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
      FROM observaciones o
      JOIN agentes a ON a.id = o.agente_id
      WHERE (a.nombre ILIKE ${like} OR a.legajo ILIKE ${like} OR o.descripcion ILIKE ${like})
      ORDER BY o.fecha DESC
    `
    if (tipo && tipo !== "Todos") {
      query = sql`
        SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
        FROM observaciones o
        JOIN agentes a ON a.id = o.agente_id
        WHERE (a.nombre ILIKE ${like} OR a.legajo ILIKE ${like} OR o.descripcion ILIKE ${like})
        AND o.tipo = ${tipo}
        ORDER BY o.fecha DESC
      `
      if (estado && estado !== "Todos") {
        query = sql`
          SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
          FROM observaciones o
          JOIN agentes a ON a.id = o.agente_id
          WHERE (a.nombre ILIKE ${like} OR a.legajo ILIKE ${like} OR o.descripcion ILIKE ${like})
          AND o.tipo = ${tipo}
          AND o.estado = ${estado}
          ORDER BY o.fecha DESC
        `
      }
    } else if (estado && estado !== "Todos") {
      query = sql`
        SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
        FROM observaciones o
        JOIN agentes a ON a.id = o.agente_id
        WHERE (a.nombre ILIKE ${like} OR a.legajo ILIKE ${like} OR o.descripcion ILIKE ${like})
        AND o.estado = ${estado}
        ORDER BY o.fecha DESC
      `
    }
  } else if (tipo && tipo !== "Todos") {
    query = sql`
      SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
      FROM observaciones o
      JOIN agentes a ON a.id = o.agente_id
      WHERE o.tipo = ${tipo}
      ORDER BY o.fecha DESC
    `
    if (estado && estado !== "Todos") {
      query = sql`
        SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
        FROM observaciones o
        JOIN agentes a ON a.id = o.agente_id
        WHERE o.tipo = ${tipo}
        AND o.estado = ${estado}
        ORDER BY o.fecha DESC
      `
    }
  } else if (estado && estado !== "Todos") {
    query = sql`
      SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
      FROM observaciones o
      JOIN agentes a ON a.id = o.agente_id
      WHERE o.estado = ${estado}
      ORDER BY o.fecha DESC
    `
  } else {
    query = sql`
      SELECT o.*, a.nombre as agente_nombre, a.legajo as agente_legajo
      FROM observaciones o
      JOIN agentes a ON a.id = o.agente_id
      ORDER BY o.fecha DESC
    `
  }

  return query
}

export async function getObservacionesByAgente(agenteId: number) {
  return sql`
    SELECT * FROM observaciones
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC
  `
}

export async function getObservacionById(id: number) {
  const rows = await sql`SELECT * FROM observaciones WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getObservacionesStats() {
  const rows = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE estado = 'ABIERTO') AS abiertos,
      COUNT(*) FILTER (WHERE estado = 'CERRADO') AS cerrados,
      COUNT(*) FILTER (WHERE tipo = 'FALTA') AS faltas,
      COUNT(*) FILTER (WHERE tipo = 'RECLAMO') AS reclamos,
      COUNT(*) FILTER (WHERE tipo = 'NOVEDAD') AS novedades
    FROM observaciones
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
    INSERT INTO observaciones (agente_id, tipo, descripcion, estado, fecha)
    VALUES (${data.agente_id}, ${data.tipo}, ${data.descripcion}, 'ABIERTO', ${data.fecha})
  `
  revalidatePath("/observaciones")
}

export async function updateObservacion(
  id: number,
  data: {
    tipo?: ObservacionTipo
    descripcion?: string
    estado?: ObservacionEstado
  }
) {
  const updates: string[] = []
  const values: any[] = []

  if (data.tipo) {
    updates.push(`tipo = $${updates.length + 1}`)
    values.push(data.tipo)
  }
  if (data.descripcion) {
    updates.push(`descripcion = $${updates.length + 1}`)
    values.push(data.descripcion)
  }
  if (data.estado) {
    updates.push(`estado = $${updates.length + 1}`)
    values.push(data.estado)
  }

  if (updates.length === 0) return

  await sql`UPDATE observaciones SET ${sql(updates.join(', '))} WHERE id = ${id}`
  revalidatePath("/observaciones")
}

export async function toggleObservacionEstado(id: number, estado: ObservacionEstado) {
  await sql`UPDATE observaciones SET estado = ${estado} WHERE id = ${id}`
  revalidatePath("/observaciones")
}

export async function deleteObservacion(id: number) {
  await sql`DELETE FROM observaciones WHERE id = ${id}`
  revalidatePath("/observaciones")
}

export async function getAgentesForObservacion() {
  return sql`
    SELECT id, nombre, legajo, dependencia
    FROM agentes
    ORDER BY nombre ASC
  `
}