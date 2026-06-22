import { NextRequest, NextResponse } from "next/server"
import { sql, rawQuery } from "@/lib/db"
import { requireAuth, jsonOk, jsonError, withCors } from "@/lib/auth"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

const TIPOS_VALIDOS = ["Observación", "Reclamo"]
const RESULTADOS_VALIDOS = ["Positivo", "Negativo"]
const SERVICIOS_VALIDOS = ["Cumpliendo servicio", "Hora extra"]

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return withCors(auth)

  try {
    const body = await req.json()
    const serverIds: { agentes: Record<string, number>; alcoholemias: Record<string, number>; observaciones: Record<string, number> } = {
      agentes: {},
      alcoholemias: {},
      observaciones: {},
    }
    const conflicts: any[] = []

    if (body.agentes?.created) {
      for (const a of body.agentes.created) {
        const localId = a.localId ?? a.id
        if (!a.legajo || !a.apellidoNombre) continue
        const dup = await sql`SELECT id FROM agentes WHERE legajo = ${a.legajo} LIMIT 1`
        if (dup.length > 0) {
          serverIds.agentes[String(localId)] = dup[0].id
          continue
        }
        const inserted = await sql`
          INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
          VALUES (${a.legajo}, ${a.apellidoNombre}, ${a.fechaIngreso ?? null}, ${a.dependencia ?? null}, ${a.cargo ?? null}, ${a.turno ?? null})
          RETURNING id
        `
        serverIds.agentes[String(localId)] = inserted[0].id
      }
    }

    if (body.agentes?.updated) {
      for (const a of body.agentes.updated) {
        if (!a.id) continue
        const existing = (await rawQuery(`SELECT id, updated_at FROM agentes WHERE id = $1`, [a.id]))[0]
        if (!existing) continue
        if (a.updatedAt && new Date(existing.updated_at) > new Date(a.updatedAt)) {
          conflicts.push({ type: "agente", id: a.id, reason: "stale" })
          continue
        }
        await sql`
          UPDATE agentes SET
            apellido_nombre = ${a.apellidoNombre},
            fecha_ingreso = ${a.fechaIngreso ?? null},
            dependencia = ${a.dependencia ?? null},
            cargo = ${a.cargo ?? null},
            turno = ${a.turno ?? null}
          WHERE id = ${a.id}
        `
      }
    }

    if (body.alcoholemias?.created) {
      for (const c of body.alcoholemias.created) {
        const localId = c.localId ?? c.id
        if (!c.agenteId || !c.fecha || !RESULTADOS_VALIDOS.includes(c.resultado)) continue
        const inserted = await sql`
          INSERT INTO controles_alcoholemia (agente_id, fecha, resultado, graduacion, servicio_extra, observacion)
          VALUES (${c.agenteId}, ${c.fecha}, ${c.resultado}, ${c.graduacion ?? null}, ${c.servicioExtra ?? null}, ${c.observacion ?? null})
          RETURNING id
        `
        serverIds.alcoholemias[String(localId)] = inserted[0].id
      }
    }

    if (body.observaciones?.created) {
      for (const o of body.observaciones.created) {
        const localId = o.localId ?? o.id
        if (!o.agenteId || !TIPOS_VALIDOS.includes(o.tipo) || !o.descripcion || !o.fecha) continue
        const inserted = await sql`
          INSERT INTO observaciones_reclamos (agente_id, tipo, descripcion, fecha, resuelto)
          VALUES (${o.agenteId}, ${o.tipo}, ${o.descripcion}, ${o.fecha}, ${o.resuelto ?? false})
          RETURNING id
        `
        serverIds.observaciones[String(localId)] = inserted[0].id
      }
    }

    return withCors(jsonOk({ conflicts, serverIds }))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
