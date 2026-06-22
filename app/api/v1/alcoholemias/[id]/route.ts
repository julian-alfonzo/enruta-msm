import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { controlToDTO } from "@/lib/dto"

const RESULTADOS_VALIDOS = ["Positivo", "Negativo"]
const SERVICIOS_VALIDOS = ["Cumpliendo servicio", "Hora extra"]

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const rows = await sql`SELECT * FROM controles_alcoholemia WHERE id = ${Number(id)}`
  if (rows.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Control no encontrado"))
  }
  return withCors(jsonOk(controlToDTO(rows[0])))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  try {
    const body = await req.json()
    const { fecha, resultado, graduacion, servicioExtra, observacion } = body

    const errors: Array<{ field: string; message: string }> = []
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })
    if (resultado && !RESULTADOS_VALIDOS.includes(resultado)) errors.push({ field: "resultado", message: `resultado debe ser "Positivo" o "Negativo"` })
    if (resultado === "Negativo" && graduacion != null) errors.push({ field: "graduacion", message: "graduacion debe ser null cuando resultado es Negativo" })
    if (servicioExtra && !SERVICIOS_VALIDOS.includes(servicioExtra)) errors.push({ field: "servicioExtra", message: `servicioExtra debe ser uno de: ${SERVICIOS_VALIDOS.join(", ")}` })
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const existing = await sql`SELECT id FROM controles_alcoholemia WHERE id = ${numericId}`
    if (existing.length === 0) {
      return withCors(jsonError(404, "NOT_FOUND", "Control no encontrado"))
    }

    const updated = await sql`
      UPDATE controles_alcoholemia SET
        fecha = COALESCE(${fecha ?? null}, fecha),
        resultado = COALESCE(${resultado ?? null}, resultado),
        graduacion = COALESCE(${graduacion ?? null}, graduacion),
        servicio_extra = COALESCE(${servicioExtra ?? null}, servicio_extra),
        observacion = COALESCE(${observacion ?? null}, observacion)
      WHERE id = ${numericId}
      RETURNING *
    `

    return withCors(jsonOk(controlToDTO(updated[0])))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const numericId = Number(id)

  const existing = await sql`SELECT id FROM controles_alcoholemia WHERE id = ${numericId}`
  if (existing.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Control no encontrado"))
  }

  await sql`DELETE FROM controles_alcoholemia WHERE id = ${numericId}`
  return withCors(jsonNoContent())
}
