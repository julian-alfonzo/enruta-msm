import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

const TIPOS_VALIDOS = ["Observación", "Reclamo"]

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const rows = await sql`SELECT * FROM observaciones_reclamos WHERE id = ${Number(id)}`
  if (rows.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Observación no encontrada"))
  }
  return withCors(jsonOk(observacionToDTO(rows[0])))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  try {
    const body = await req.json()
    const { tipo, descripcion, fecha, resuelto } = body

    const errors: Array<{ field: string; message: string }> = []
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) errors.push({ field: "tipo", message: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}` })
    if (descripcion && String(descripcion).length > 2000) errors.push({ field: "descripcion", message: "descripcion máximo 2000 caracteres" })
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const existing = await sql`SELECT id FROM observaciones_reclamos WHERE id = ${numericId}`
    if (existing.length === 0) {
      return withCors(jsonError(404, "NOT_FOUND", "Observación no encontrada"))
    }

    const updated = await sql`
      UPDATE observaciones_reclamos SET
        tipo = COALESCE(${tipo ?? null}, tipo),
        descripcion = COALESCE(${descripcion ?? null}, descripcion),
        fecha = COALESCE(${fecha ?? null}, fecha),
        resuelto = COALESCE(${resuelto ?? null}, resuelto)
      WHERE id = ${numericId}
      RETURNING *
    `

    return withCors(jsonOk(observacionToDTO(updated[0])))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  const existing = await sql`SELECT id FROM observaciones_reclamos WHERE id = ${numericId}`
  if (existing.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Observación no encontrada"))
  }

  await sql`DELETE FROM observaciones_reclamos WHERE id = ${numericId}`
  return withCors(jsonNoContent())
}
