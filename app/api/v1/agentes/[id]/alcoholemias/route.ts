import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
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
  const agenteId = Number(id)

  const rows = await sql`
    SELECT * FROM controles_alcoholemia
    WHERE agente_id = ${agenteId}
    ORDER BY fecha DESC, id DESC
  `
  return withCors(jsonOk(rows.map(controlToDTO)))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const agenteId = Number(id)

  try {
    const body = await req.json()
    const { fecha, resultado, graduacion, servicioExtra, observacion } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!fecha) errors.push({ field: "fecha", message: "fecha es requerida" })
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })
    if (!resultado) errors.push({ field: "resultado", message: "resultado es requerido" })
    else if (!RESULTADOS_VALIDOS.includes(resultado)) errors.push({ field: "resultado", message: `resultado debe ser "Positivo" o "Negativo"` })
    if (resultado === "Positivo") {
      if (graduacion == null) errors.push({ field: "graduacion", message: "graduacion es requerida cuando resultado es Positivo" })
      else if (Number(graduacion) < 0.01 || Number(graduacion) > 9.99) errors.push({ field: "graduacion", message: "graduacion debe ser entre 0.01 y 9.99" })
    } else if (resultado === "Negativo" && graduacion != null) {
      errors.push({ field: "graduacion", message: "graduacion debe ser null cuando resultado es Negativo" })
    }
    if (servicioExtra && !SERVICIOS_VALIDOS.includes(servicioExtra)) {
      errors.push({ field: "servicioExtra", message: `servicioExtra debe ser uno de: ${SERVICIOS_VALIDOS.join(", ")}` })
    }
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const agente = await sql`SELECT id FROM agentes WHERE id = ${agenteId} AND deleted_at IS NULL LIMIT 1`
    if (agente.length === 0) {
      return withCors(jsonError(404, "AGENTE_NOT_FOUND", `Agente ${agenteId} no existe`))
    }

    const inserted = await sql`
      INSERT INTO controles_alcoholemia (agente_id, fecha, resultado, graduacion, servicio_extra, observacion)
      VALUES (${agenteId}, ${fecha}, ${resultado}, ${graduacion ?? null}, ${servicioExtra ?? null}, ${observacion ?? null})
      RETURNING *
    `
    return withCors(jsonOk(controlToDTO(inserted[0]), undefined, 201))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
