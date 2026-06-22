"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getAgentes(search = "") {
  if (search) {
    const like = "%" + search + "%"
    return sql`
      SELECT * FROM agentes
      WHERE apellido_nombre ILIKE ${like}
        OR legajo ILIKE ${like}
        OR dependencia ILIKE ${like}
      ORDER BY apellido_nombre ASC
    `
  }
  return sql`SELECT * FROM agentes ORDER BY apellido_nombre ASC`
}

export async function getAgenteById(id: number) {
  const rows = await sql`SELECT * FROM agentes WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getDashboardStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM agentes) AS total,
      (SELECT COUNT(*) FROM controles_alcoholemia) AS total_controles,
      (SELECT COUNT(*) FROM controles_alcoholemia WHERE resultado = 'POSITIVO') AS positivos,
      (SELECT COUNT(*) FROM controles_alcoholemia WHERE resultado = 'NEGATIVO') AS negativos,
      (SELECT COUNT(*) FROM observaciones_reclamos WHERE NOT resuelto) AS observaciones_abiertas
  `
  return rows[0]
}

export async function createAgente(data: {
  legajo: string
  apellido_nombre: string
  fecha_ingreso?: string
  dependencia?: string
  cargo?: string
  turno?: string
}) {
  const now = new Date().toISOString()
  await sql`
    INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno, created_at, updated_at)
    VALUES (${data.legajo}, ${data.apellido_nombre}, ${data.fecha_ingreso ?? null}, ${data.dependencia ?? null}, ${data.cargo ?? null}, ${data.turno ?? null}, ${now}, ${now})
  `
  revalidatePath("/agentes")
  revalidatePath("/")
}

export async function updateAgente(
  id: number,
  data: {
    legajo: string
    apellido_nombre: string
    fecha_ingreso?: string
    dependencia?: string
    cargo?: string
    turno?: string
  },
) {
  await sql`
    UPDATE agentes SET
      legajo = ${data.legajo},
      apellido_nombre = ${data.apellido_nombre},
      fecha_ingreso = ${data.fecha_ingreso ?? null},
      dependencia = ${data.dependencia ?? null},
      cargo = ${data.cargo ?? null},
      turno = ${data.turno ?? null},
      updated_at = ${new Date().toISOString()}
    WHERE id = ${id}
  `
  revalidatePath("/agentes")
}
