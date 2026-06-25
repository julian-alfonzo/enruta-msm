import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { controlToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

const SERVICIOS_VALIDOS = ["Cumpliendo servicio", "Hora extra"]
const RESULTADOS_VALIDOS = ["Positivo", "Negativo"]

function validateControl(body: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = []
  if (!body.fecha) errors.push({ field: "fecha", message: "fecha es requerida (YYYY-MM-DD)" })
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })

  if (!body.resultado) errors.push({ field: "resultado", message: "resultado es requerido" })
  else if (!RESULTADOS_VALIDOS.includes(body.resultado)) errors.push({ field: "resultado", message: `resultado debe ser "Positivo" o "Negativo"` })

  if (body.resultado === "Positivo") {
    if (body.graduacion == null) {
      errors.push({ field: "graduacion", message: "graduacion es requerida cuando resultado es Positivo" })
    } else {
      const g = Number(body.graduacion)
      if (isNaN(g) || g < 0.01 || g > 9.99) {
        errors.push({ field: "graduacion", message: "graduacion debe ser un decimal entre 0.01 y 9.99" })
      }
    }
  } else if (body.resultado === "Negativo" && body.graduacion != null) {
    errors.push({ field: "graduacion", message: "graduacion debe ser null cuando resultado es Negativo" })
  }

  if (body.servicioExtra && !SERVICIOS_VALIDOS.includes(body.servicioExtra)) {
    errors.push({ field: "servicioExtra", message: `servicioExtra debe ser uno de: ${SERVICIOS_VALIDOS.join(", ")}` })
  }
  return errors
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get("fecha")
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const search = searchParams.get("search")
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)))

  try {
    let rows: any[]

    if (search || desde || hasta || fecha) {
      const conditions: string[] = ["a.deleted_at IS NULL"]
      const params: any[] = []
      const offset = (page - 1) * limit

      if (search) {
        const like = "%" + search + "%"
        params.push(like, like)
        conditions.push(`(a.apellido_nombre ILIKE $${params.length - 1} OR a.legajo ILIKE $${params.length})`)
      }
      if (fecha) {
        params.push(fecha)
        conditions.push(`c.fecha = $${params.length}`)
      }
      if (desde) {
        params.push(desde)
        conditions.push(`c.fecha >= $${params.length}`)
      }
      if (hasta) {
        params.push(hasta)
        conditions.push(`c.fecha <= $${params.length}`)
      }

      const where = `WHERE ${conditions.join(" AND ")}`
      rows = await rawQuery<any>(
        `SELECT c.*, a.legajo, a.apellido_nombre
         FROM controles_alcoholemia c
         JOIN agentes a ON a.id = c.agente_id
         ${where}
         ORDER BY c.fecha DESC, c.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      )
    } else {
      rows = await sql`SELECT * FROM controles_alcoholemia ORDER BY fecha DESC, id DESC LIMIT ${limit}`
    }

    if (search || desde || hasta || fecha) {
      return withCors(jsonOk(rows.map((r: any) => ({
        ...controlToDTO(r),
        legajo: r.legajo,
        apellidoNombre: r.apellido_nombre,
      })), { page, limit }))
    }

    return withCors(jsonOk(rows.map(controlToDTO)))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  try {
    const body = await req.json()
    const errors = validateControl(body)
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const { agenteId, fecha, resultado, graduacion, servicioExtra, observacion } = body

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
