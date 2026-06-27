import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

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

  const rows = (await rawQuery(
    `SELECT o.*, a.legajo, a.apellido_nombre, a.dependencia, a.cargo
     FROM observaciones_reclamos o
     JOIN agentes a ON a.id = o.agente_id
     WHERE o.agente_id = $1
     ORDER BY o.fecha DESC, o.id DESC`,
    [agente[0].id],
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
