import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { controlToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  if (!desde || !hasta) {
    return withCors(jsonError(400, "VALIDATION_ERROR", "desde y hasta son requeridos (YYYY-MM-DD)"))
  }

  try {
    const rows = await sql`
      SELECT c.*, a.legajo, a.apellido_nombre
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      WHERE a.deleted_at IS NULL
        AND c.fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY c.fecha DESC, a.apellido_nombre ASC
    `

    const data = rows.map((r: any) => ({
      ...controlToDTO(r),
      agente: {
        legajo: r.legajo,
        apellidoNombre: r.apellido_nombre,
      },
    }))

    return withCors(jsonOk(data))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
