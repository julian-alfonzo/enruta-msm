import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"
import { agenteToDTO, controlToDTO, observacionToDTO } from "@/lib/dto"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  try {
    const body = await req.json()
    const lastSync = body.lastSync ?? null

    const [agentes, deletedAgentes, controles, observaciones] = await Promise.all([
      lastSync
        ? rawQuery(
            `SELECT * FROM agentes WHERE deleted_at IS NULL AND updated_at > $1 ORDER BY id`,
            [lastSync],
          )
        : rawQuery(`SELECT * FROM agentes WHERE deleted_at IS NULL ORDER BY id`, []),
      lastSync
        ? rawQuery(
            `SELECT id, legajo, deleted_at FROM agentes WHERE deleted_at IS NOT NULL AND deleted_at > $1`,
            [lastSync],
          )
        : rawQuery(`SELECT id, legajo, deleted_at FROM agentes WHERE deleted_at IS NOT NULL`, []),
      lastSync
        ? rawQuery(
            `SELECT c.*, a.legajo AS agente_legajo FROM controles_alcoholemia c JOIN agentes a ON a.id = c.agente_id WHERE c.created_at > $1 ORDER BY c.id`,
            [lastSync],
          )
        : rawQuery(`SELECT c.*, a.legajo AS agente_legajo FROM controles_alcoholemia c JOIN agentes a ON a.id = c.agente_id ORDER BY c.id`, []),
      lastSync
        ? rawQuery(
            `SELECT o.*, a.legajo AS agente_legajo FROM observaciones_reclamos o JOIN agentes a ON a.id = o.agente_id WHERE o.created_at > $1 ORDER BY o.id`,
            [lastSync],
          )
        : rawQuery(`SELECT o.*, a.legajo AS agente_legajo FROM observaciones_reclamos o JOIN agentes a ON a.id = o.agente_id ORDER BY o.id`, []),
    ])

    return withCors(
      jsonOk({
        agentes: (agentes as any[]).map(agenteToDTO),
        alcoholemias: (controles as any[]).map((c) => ({
          ...controlToDTO(c),
          agenteLegajo: c.agente_legajo,
        })),
        observaciones: (observaciones as any[]).map((o) => ({
          ...observacionToDTO(o),
          agenteLegajo: o.agente_legajo,
        })),
        deleted: {
          agentes: (deletedAgentes as any[]).map((a) => ({ id: a.id, legajo: a.legajo, deletedAt: a.deleted_at })),
          alcoholemias: [],
          observaciones: [],
        },
        serverTime: new Date().toISOString(),
      }),
    )
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
