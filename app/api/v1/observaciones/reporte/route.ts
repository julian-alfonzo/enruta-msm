import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  const conditions: string[] = []
  const params: any[] = []
  if (desde) {
    params.push(desde)
    conditions.push(`o.fecha >= $${params.length}`)
  }
  if (hasta) {
    params.push(hasta)
    conditions.push(`o.fecha <= $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  const rows = (await rawQuery(
    `SELECT o.*, a.legajo, a.apellido_nombre, a.dependencia, a.cargo
     FROM observaciones_reclamos o
     JOIN agentes a ON a.id = o.agente_id
     ${where}
     ORDER BY o.fecha DESC, a.apellido_nombre ASC`,
    params,
  )) as any[]

  const data = rows.map((r) => ({
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
