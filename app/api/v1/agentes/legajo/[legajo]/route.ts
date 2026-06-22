import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { agenteToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ legajo: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  const { legajo } = await params
  const rows = await sql`SELECT * FROM agentes WHERE legajo = ${legajo} AND deleted_at IS NULL`
  if (rows.length === 0) {
    return withCors(jsonError(404, "NOT_FOUND", "Agente no encontrado"))
  }
  return withCors(jsonOk(agenteToDTO(rows[0])))
}
