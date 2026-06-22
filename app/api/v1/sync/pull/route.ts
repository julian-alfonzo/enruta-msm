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
            `SELECT id, deleted_at FROM agentes WHERE deleted_at IS NOT NULL AND deleted_at > $1`,
            [lastSync],
          )
        : rawQuery(`SELECT id, deleted_at FROM agentes WHERE deleted_at IS NOT NULL`, []),
      lastSync
        ? rawQuery(
            `SELECT * FROM controles_alcoholemia WHERE created_at > $1 ORDER BY id`,
            [lastSync],
          )
        : rawQuery(`SELECT * FROM controles_alcoholemia ORDER BY id`, []),
      lastSync
        ? rawQuery(
            `SELECT * FROM observaciones_reclamos WHERE created_at > $1 ORDER BY id`,
            [lastSync],
          )
        : rawQuery(`SELECT * FROM observaciones_reclamos ORDER BY id`, []),
    ])

    return withCors(
      jsonOk({
        agentes: (agentes as any[]).map(agenteToDTO),
        alcoholemias: (controles as any[]).map(controlToDTO),
        observaciones: (observaciones as any[]).map(observacionToDTO),
        deleted: {
          agentes: (deletedAgentes as any[]).map((a) => ({ id: a.id, deletedAt: a.deleted_at })),
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
