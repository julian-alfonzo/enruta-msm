import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function mapRowToDTO(row: any) {
  return {
    id: row.id,
    agente_id: row.agente_id,
    legajo: row.legajo ?? "",
    apellido_nombre: row.apellido_nombre ?? "",
    dependencia: row.dependencia ?? null,
    cargo: row.cargo ?? null,
    turno: row.turno ?? null,
    fecha: row.fecha,
    resultado: row.resultado,
    graduacion: row.graduacion != null ? Number(row.graduacion) : null,
    servicio_extra: row.servicio_extra ?? null,
    observacion: row.observacion ?? null,
    created_at: row.created_at,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const rows = await sql`
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      ORDER BY c.fecha DESC
    `;
    return NextResponse.json(rows.map(mapRowToDTO));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const agente = await sql`
      SELECT id FROM agentes WHERE legajo = ${body.legajo} LIMIT 1
    `;

    if (agente.length === 0) {
      return NextResponse.json(
        { error: `Agente with legajo '${body.legajo}' not found` },
        { status: 404 },
      );
    }

    const agenteId = agente[0].id;
    const fecha = body.fecha ?? new Date().toISOString();

    const inserted = await sql`
      INSERT INTO controles_alcoholemia (agente_id, resultado, graduacion, servicio_extra, observacion, fecha, created_at)
      VALUES (${agenteId}, ${body.resultado}, ${body.graduacion ?? null}, ${body.servicio_extra ?? null}, ${body.observacion ?? null}, ${fecha}, ${new Date().toISOString()})
      RETURNING *
    `;

    const row = inserted[0];

    return NextResponse.json(
      {
        ...mapRowToDTO(row),
        legajo: body.legajo,
        apellido_nombre: body.apellido_nombre ?? "",
        dependencia: body.dependencia ?? null,
        cargo: body.cargo ?? null,
        turno: body.turno ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
