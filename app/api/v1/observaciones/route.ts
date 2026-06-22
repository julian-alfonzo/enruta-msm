import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

const TIPOS_VALIDOS = ["Observación", "Reclamo"]

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const agenteId = searchParams.get("agenteId")
  const tipo = searchParams.get("tipo")
  const resuelto = searchParams.get("resuelto")

  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return withCors(jsonError(400, "VALIDATION_ERROR", `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`))
  }

  const conditions: string[] = []
  const params: any[] = []
  if (agenteId) {
    params.push(Number(agenteId))
    conditions.push(`agente_id = $${params.length}`)
  }
  if (tipo) {
    params.push(tipo)
    conditions.push(`tipo = $${params.length}`)
  }
  if (resuelto === "true" || resuelto === "false") {
    params.push(resuelto === "true")
    conditions.push(`resuelto = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  try {
    const rows = await rawQuery(
      `SELECT * FROM observaciones_reclamos ${where} ORDER BY fecha DESC, id DESC`,
      params,
    )
    return withCors(jsonOk(rows.map(observacionToDTO)))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  try {
    const body = await req.json()
    const { agenteId, tipo, descripcion, fecha, resuelto } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!agenteId) errors.push({ field: "agenteId", message: "agenteId es requerido" })
    if (!tipo) errors.push({ field: "tipo", message: "tipo es requerido" })
    else if (!TIPOS_VALIDOS.includes(tipo)) errors.push({ field: "tipo", message: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(", ")}` })
    if (!descripcion) errors.push({ field: "descripcion", message: "descripcion es requerida" })
    else if (String(descripcion).length > 2000) errors.push({ field: "descripcion", message: "descripcion máximo 2000 caracteres" })
    if (!fecha) errors.push({ field: "fecha", message: "fecha es requerida" })
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const agente = await sql`SELECT id FROM agentes WHERE id = ${agenteId} AND deleted_at IS NULL LIMIT 1`
    if (agente.length === 0) {
      return withCors(jsonError(404, "AGENTE_NOT_FOUND", `Agente ${agenteId} no existe`))
    }

    const inserted = await sql`
      INSERT INTO observaciones_reclamos (agente_id, tipo, descripcion, fecha, resuelto)
      VALUES (${agenteId}, ${tipo}, ${descripcion}, ${fecha}, ${resuelto ?? false})
      RETURNING *
    `
    return withCors(jsonOk(observacionToDTO(inserted[0]), undefined, 201))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
