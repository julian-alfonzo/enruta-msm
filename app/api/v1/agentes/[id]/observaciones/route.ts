import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { observacionToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { id } = await params
  const agenteId = Number(id)

  const rows = await rawQuery(
    `SELECT o.*, a.legajo, a.apellido_nombre, a.dependencia, a.cargo
     FROM observaciones_reclamos o
     JOIN agentes a ON a.id = o.agente_id
     WHERE o.agente_id = $1
     ORDER BY o.fecha DESC, o.id DESC`,
    [agenteId],
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
