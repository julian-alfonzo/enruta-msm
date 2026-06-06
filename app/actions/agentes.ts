"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getAgentes(search = "", tipo = "") {
  if (search && tipo && tipo !== "Todos los tipos") {
    return sql`
      SELECT * FROM agentes
      WHERE (nombre ILIKE ${"%" + search + "%"} OR legajo ILIKE ${"%" + search + "%"} OR dni ILIKE ${"%" + search + "%"})
      AND tipo = ${tipo}
      ORDER BY nombre ASC
    `
  }
  if (search) {
    return sql`
      SELECT * FROM agentes
      WHERE nombre ILIKE ${"%" + search + "%"} OR legajo ILIKE ${"%" + search + "%"} OR dni ILIKE ${"%" + search + "%"}
      ORDER BY nombre ASC
    `
  }
  if (tipo && tipo !== "Todos los tipos") {
    return sql`SELECT * FROM agentes WHERE tipo = ${tipo} ORDER BY nombre ASC`
  }
  return sql`SELECT * FROM agentes ORDER BY nombre ASC`
}

export async function getAgenteById(id: number) {
  const rows = await sql`SELECT * FROM agentes WHERE id = ${id}`
  return rows[0] ?? null
}

export async function getDashboardStats() {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE activo) AS activos,
      COUNT(*) FILTER (WHERE en_servicio) AS en_servicio,
      COUNT(*) FILTER (WHERE NOT activo) AS inactivos,
      COUNT(*) AS total
    FROM agentes
  `
  return rows[0]
}

export async function createAgente(data: {
  nombre: string
  dni: string
  legajo: string
  telefono?: string
  tipo: string
  dependencia?: string
  cargo?: string
}) {
  await sql`
    INSERT INTO agentes (nombre, dni, legajo, telefono, tipo, dependencia, cargo)
    VALUES (${data.nombre}, ${data.dni}, ${data.legajo}, ${data.telefono ?? null}, ${data.tipo}, ${data.dependencia ?? null}, ${data.cargo ?? null})
  `
  revalidatePath("/agentes")
  revalidatePath("/")
}

export async function updateAgente(
  id: number,
  data: {
    nombre: string
    legajo: string
    dependencia?: string
    cargo?: string
    tipo?: string
    telefono?: string
  },
) {
  await sql`
    UPDATE agentes SET
      nombre = ${data.nombre},
      legajo = ${data.legajo},
      dependencia = ${data.dependencia ?? null},
      cargo = ${data.cargo ?? null},
      tipo = ${data.tipo ?? null},
      telefono = ${data.telefono ?? null}
    WHERE id = ${id}
  `
  revalidatePath("/agentes")
}

export async function updateHoras(id: number, horas_mensuales: number, horas_extra: number) {
  await sql`
    UPDATE agentes SET horas_mensuales = ${horas_mensuales}, horas_extra = ${horas_extra}
    WHERE id = ${id}
  `
  revalidatePath("/agentes")
}

export async function toggleServicio(id: number, en_servicio: boolean) {
  await sql`UPDATE agentes SET en_servicio = ${en_servicio} WHERE id = ${id}`
  revalidatePath("/")
  revalidatePath("/agentes")
}
