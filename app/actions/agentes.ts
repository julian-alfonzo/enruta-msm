"use server"

import { sql, rawQuery } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getAgentes(search = "", dependencia = "", cargo = "", turno = "") {
  const conditions = ["deleted_at IS NULL"]
  const params: any[] = []

  if (search) {
    const like = "%" + search + "%"
    params.push(like, like, like)
    conditions.push(`(apellido_nombre ILIKE $${params.length - 2} OR legajo ILIKE $${params.length - 1} OR dependencia ILIKE $${params.length})`)
  }
  if (dependencia) {
    params.push(`%${dependencia}%`)
    conditions.push(`dependencia ILIKE $${params.length}`)
  }
  if (cargo) {
    params.push(`%${cargo}%`)
    conditions.push(`cargo ILIKE $${params.length}`)
  }
  if (turno) {
    params.push(turno)
    conditions.push(`turno = $${params.length}`)
  }

  const where = `WHERE ${conditions.join(" AND ")}`
  return rawQuery(`SELECT * FROM agentes ${where} ORDER BY apellido_nombre ASC`, params)
}

export async function getAgenteById(id: number) {
  const rows = await sql`SELECT * FROM agentes WHERE id = ${id} AND deleted_at IS NULL`
  return rows[0] ?? null
}

export async function getDashboardStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM agentes WHERE deleted_at IS NULL) AS total,
      (SELECT COUNT(*)::int FROM controles_alcoholemia) AS total_controles,
      (SELECT COUNT(*)::int FROM controles_alcoholemia WHERE resultado = 'Positivo') AS positivos,
      (SELECT COUNT(*)::int FROM observaciones_reclamos WHERE NOT resuelto) AS observaciones_abiertas
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
  const dup = await sql`SELECT id FROM agentes WHERE legajo = ${data.legajo} LIMIT 1`
  if (dup.length > 0) {
    throw new Error(`Ya existe un agente con legajo ${data.legajo}`)
  }
  await sql`
    INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
    VALUES (${data.legajo}, ${data.apellido_nombre}, ${data.fecha_ingreso ?? null}, ${data.dependencia ?? null}, ${data.cargo ?? null}, ${data.turno ?? null})
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
  const existing = await sql`SELECT legajo FROM agentes WHERE id = ${id} AND deleted_at IS NULL`
  if (existing.length === 0) throw new Error("Agente no encontrado")
  if (existing[0].legajo !== data.legajo) throw new Error("El legajo es inmutable")

  await sql`
    UPDATE agentes SET
      apellido_nombre = ${data.apellido_nombre},
      fecha_ingreso = ${data.fecha_ingreso ?? null},
      dependencia = ${data.dependencia ?? null},
      cargo = ${data.cargo ?? null},
      turno = ${data.turno ?? null}
    WHERE id = ${id} AND deleted_at IS NULL
  `
  revalidatePath("/agentes")
}

export async function deleteAgente(id: number) {
  const controls = await sql`SELECT COUNT(*)::int AS n FROM controles_alcoholemia WHERE agente_id = ${id}`
  const obs = await sql`SELECT COUNT(*)::int AS n FROM observaciones_reclamos WHERE agente_id = ${id}`
  if (controls[0].n > 0 || obs[0].n > 0) {
    throw new Error(`El agente tiene ${controls[0].n} control(es) y ${obs[0].n} observación(es) asociada(s)`)
  }
  await sql`UPDATE agentes SET deleted_at = NOW() WHERE id = ${id}`
  revalidatePath("/agentes")
  revalidatePath("/")
}
