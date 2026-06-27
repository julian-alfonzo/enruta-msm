import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

const TIPOS_VALIDOS = ["Observación", "Reclamo"]

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ legajo: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { legajo } = await params
  const agente = await sql`SELECT id FROM agentes WHERE legajo = ${legajo} AND deleted_at IS NULL LIMIT 1`
  if (agente.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", `Agente ${legajo} no encontrado`))
  }

  const rows = await rawQuery(
    `SELECT o.*, a.legajo, a.apellido_nombre, a.dependencia, a.cargo
     FROM observaciones_reclamos o
     JOIN agentes a ON a.id = o.agente_id
     WHERE o.agente_id = $1
     ORDER BY o.fecha DESC, o.id DESC`,
    [agente[0].id],
  )

  const data = (rows as any[]).map((r) => ({
    ...observacionToDTO(r),
    agente: {
      legajo: r.legajo,
      apellidoNombre: r.apellido_nombre,
      dependencia: r.dependencia,
      cargo: r.cargo,
    },
  }))

  return withCors(jsonOk(data))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ legajo: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { legajo } = await params
  const agente = await sql`SELECT id FROM agentes WHERE legajo = ${legajo} AND deleted_at IS NULL LIMIT 1`
  if (agente.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", `Agente ${legajo} no encontrado`))
  }
  const agenteId = agente[0].id as number

  try {
    const body = await req.json()
    const { tipo, descripcion, fecha, resuelto } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!tipo) errors.push({ field: "tipo", message: "tipo es obligatorio" })
    else if (!TIPOS_VALIDOS.includes(tipo)) errors.push({ field: "tipo", message: `tipo debe ser "Observación" o "Reclamo"` })
    if (!descripcion) errors.push({ field: "descripcion", message: "descripcion es obligatoria" })
    if (!fecha) errors.push({ field: "fecha", message: "fecha es obligatoria" })
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push({ field: "fecha", message: "fecha debe tener formato YYYY-MM-DD" })
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const inserted = await sql`
      INSERT INTO observaciones_reclamos (agente_id, tipo, descripcion, fecha, resuelto)
      VALUES (${agenteId}, ${tipo}, ${descripcion}, ${fecha}, ${resuelto ?? false})
      RETURNING *
    `

    const row = inserted[0]
    const data = {
      ...observacionToDTO(row),
      agente: {
        legajo: legajo,
        apellidoNombre: null,
        dependencia: null,
        cargo: null,
      },
    }

    return withCors(jsonOk(data, undefined, 201))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
