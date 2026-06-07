import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function toTimestamp(iso: string | Date | null): number | null {
  if (!iso) return null;
  return new Date(iso).getTime();
}

function toIso(timestamp: number | null | undefined): string | null {
  if (timestamp == null) return null;
  return new Date(timestamp).toISOString();
}

function mapRowToDTO(row: any) {
  return {
    id: row.id,
    legajo: row.legajo ?? "",
    nombre: row.nombre ?? "",
    dependencia: row.dependencia ?? null,
    cargo: row.cargo ?? null,
    turno: row.turno ?? null,
    fecha: toTimestamp(row.fecha_control),
    resultado: row.resultado,
    graduacion: row.valor ?? null,
    quienTestea: row.quien_testea ?? "",
    observaciones: row.observaciones ?? null,
    createdAt: toTimestamp(row.created_at),
  };
}

export async function GET(request: NextRequest) {
  try {
    const rows = await sql`
      SELECT c.*, a.nombre, a.legajo, a.dependencia, a.cargo
      FROM alcoholemia_controles c
      JOIN agentes a ON a.id = c.agente_id
      ORDER BY c.fecha_control DESC
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
    const fechaControl = body.fecha != null ? new Date(body.fecha).toISOString() : new Date().toISOString();
    const tipoServicio = body.tipo_servicio ?? "REGULAR";

    const inserted = await sql`
      INSERT INTO alcoholemia_controles (agente_id, resultado, valor, tipo_servicio, observaciones, fecha_control, turno, quien_testea, legajo)
      VALUES (${agenteId}, ${body.resultado}, ${body.graduacion ?? null}, ${tipoServicio}, ${body.observaciones ?? null}, ${fechaControl}, ${body.turno ?? null}, ${body.quienTestea ?? null}, ${body.legajo})
      RETURNING id, created_at
    `;

    const row = inserted[0];

    const dto = {
      id: row.id,
      legajo: body.legajo,
      nombre: body.nombre ?? "",
      dependencia: body.dependencia ?? null,
      cargo: body.cargo ?? null,
      turno: body.turno ?? null,
      fecha: body.fecha ?? toTimestamp(fechaControl),
      resultado: body.resultado,
      graduacion: body.graduacion ?? null,
      quienTestea: body.quienTestea ?? "",
      observaciones: body.observaciones ?? null,
      createdAt: toTimestamp(row.created_at),
    };

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
