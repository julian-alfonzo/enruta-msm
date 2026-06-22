import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, jsonNoContent, withCors } from "@/lib/auth"
import { agenteToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const offset = (page - 1) * limit

  try {
    let rows: any[]
    let total: number

    if (search) {
      const like = "%" + search + "%"
      rows = await sql`
        SELECT * FROM agentes
        WHERE deleted_at IS NULL
          AND (apellido_nombre ILIKE ${like} OR legajo ILIKE ${like} OR dependencia ILIKE ${like})
        ORDER BY apellido_nombre ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      const t = await sql`
        SELECT COUNT(*)::int AS n FROM agentes
        WHERE deleted_at IS NULL
          AND (apellido_nombre ILIKE ${like} OR legajo ILIKE ${like} OR dependencia ILIKE ${like})
      `
      total = t[0].n
    } else {
      rows = await sql`
        SELECT * FROM agentes
        WHERE deleted_at IS NULL
        ORDER BY apellido_nombre ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      const t = await sql`SELECT COUNT(*)::int AS n FROM agentes WHERE deleted_at IS NULL`
      total = t[0].n
    }

    return withCors(jsonOk(rows.map(agenteToDTO), { total, page, limit }))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  try {
    const body = await req.json()
    const { legajo, apellidoNombre, fechaIngreso, dependencia, cargo, turno } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!legajo) errors.push({ field: "legajo", message: "legajo es obligatorio" })
    else if (String(legajo).length > 20) errors.push({ field: "legajo", message: "legajo máximo 20 caracteres" })
    if (!apellidoNombre) errors.push({ field: "apellidoNombre", message: "apellidoNombre es obligatorio" })
    else if (String(apellidoNombre).length > 200) errors.push({ field: "apellidoNombre", message: "apellidoNombre máximo 200 caracteres" })
    if (turno && !["ROTATIVO", "MAÑANA", "TARDE", "NOCHE", "FIJO"].includes(turno)) {
      errors.push({ field: "turno", message: `turno debe ser uno de: ROTATIVO, MAÑANA, TARDE, NOCHE, FIJO` })
    }
    if (errors.length) {
      return withCors(jsonError(400, "VALIDATION_ERROR", errors[0].message, errors))
    }

    const dup = await sql`SELECT id FROM agentes WHERE legajo = ${legajo} LIMIT 1`
    if (dup.length > 0) {
      return withCors(jsonError(409, "DUPLICATE_LEGAJO", `Ya existe un agente con legajo ${legajo}`))
    }

    const inserted = await sql`
      INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
      VALUES (${legajo}, ${apellidoNombre}, ${fechaIngreso ?? null}, ${dependencia ?? null}, ${cargo ?? null}, ${turno ?? null})
      RETURNING *
    `

    return withCors(jsonOk(agenteToDTO(inserted[0]), undefined, 201))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
