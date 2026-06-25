import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
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
  const dependencia = searchParams.get("dependencia") ?? ""
  const cargo = searchParams.get("cargo") ?? ""
  const turno = searchParams.get("turno") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const offset = (page - 1) * limit

  try {
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
    const countParams = [...params]
    const total = (await rawQuery<any>(`SELECT COUNT(*)::int AS n FROM agentes ${where}`, countParams))[0].n
    const rows = await rawQuery<any>(
      `SELECT * FROM agentes ${where} ORDER BY apellido_nombre ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    )

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
