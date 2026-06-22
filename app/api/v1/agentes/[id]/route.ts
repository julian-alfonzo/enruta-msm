import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { agenteToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const rows = await sql`SELECT * FROM agentes WHERE id = ${Number(id)} AND deleted_at IS NULL`
  if (rows.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Agente no encontrado"))
  }
  return withCors(jsonOk(agenteToDTO(rows[0])))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  try {
    const body = await req.json()
    const { legajo, apellidoNombre, fechaIngreso, dependencia, cargo, turno } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!legajo) errors.push({ field: "legajo", message: "legajo es obligatorio" })
    if (!apellidoNombre) errors.push({ field: "apellidoNombre", message: "apellidoNombre es obligatorio" })
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const existing = await sql`SELECT id, legajo FROM agentes WHERE id = ${numericId} AND deleted_at IS NULL`
    if (existing.length === 0) {
      return withCors(jsonError(404, "NOT_FOUND", "Agente no encontrado"))
    }
    if (existing[0].legajo !== legajo) {
      return withCors(jsonError(400, "IMMUTABLE_LEGAJO", "El legajo es inmutable una vez creado"))
    }

    const updated = await sql`
      UPDATE agentes SET
        apellido_nombre = ${apellidoNombre},
        fecha_ingreso = ${fechaIngreso ?? null},
        dependencia = ${dependencia ?? null},
        cargo = ${cargo ?? null},
        turno = ${turno ?? null}
      WHERE id = ${numericId} AND deleted_at IS NULL
      RETURNING *
    `

    return withCors(jsonOk(agenteToDTO(updated[0])))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  const existing = await sql`SELECT id FROM agentes WHERE id = ${numericId} AND deleted_at IS NULL`
  if (existing.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Agente no encontrado"))
  }

  // Soft delete: verificar que no tenga controles ni observaciones
  const controls = await sql`SELECT COUNT(*)::int AS n FROM controles_alcoholemia WHERE agente_id = ${numericId}`
  const obs = await sql`SELECT COUNT(*)::int AS n FROM observaciones_reclamos WHERE agente_id = ${numericId}`
  if (controls[0].n > 0 || obs[0].n > 0) {
    return withCors(
      jsonError(
        409,
        "AGENTE_HAS_DEPENDENCIES",
        `El agente tiene ${controls[0].n} control(es) y ${obs[0].n} observación(es) asociada(s)`,
      ),
    )
  }

  await sql`UPDATE agentes SET deleted_at = NOW() WHERE id = ${numericId}`
  return withCors(jsonNoContent())
}
