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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await sql`
      SELECT c.*, a.nombre, a.legajo, a.dependencia, a.cargo
      FROM alcoholemia_controles c
      JOIN agentes a ON a.id = c.agente_id
      WHERE c.id = ${Number(id)}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapRowToDTO(rows[0]));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const numericId = Number(id);

    const existing = await sql`
      SELECT c.*, a.nombre, a.legajo, a.dependencia, a.cargo
      FROM alcoholemia_controles c
      JOIN agentes a ON a.id = c.agente_id
      WHERE c.id = ${numericId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await sql`
      UPDATE alcoholemia_controles SET
        resultado = COALESCE(${body.resultado ?? null}, resultado),
        valor = COALESCE(${body.graduacion ?? null}, valor),
        quien_testea = COALESCE(${body.quienTestea ?? null}, quien_testea),
        observaciones = COALESCE(${body.observaciones ?? null}, observaciones)
      WHERE id = ${numericId}
      RETURNING id, created_at, fecha_control, resultado, valor, observaciones, turno, quien_testea, legajo
    `;

    const row = updated[0];
    const agente = await sql`
      SELECT nombre, legajo, dependencia, cargo FROM agentes WHERE id = ${row.agente_id ?? existing[0].agente_id}
    `;

    const dto = {
      id: row.id,
      legajo: row.legajo ?? agente[0]?.legajo ?? "",
      nombre: agente[0]?.nombre ?? "",
      dependencia: agente[0]?.dependencia ?? null,
      cargo: agente[0]?.cargo ?? null,
      turno: row.turno ?? null,
      fecha: toTimestamp(row.fecha_control),
      resultado: row.resultado,
      graduacion: row.valor ?? null,
      quienTestea: row.quien_testea ?? "",
      observaciones: row.observaciones ?? null,
      createdAt: toTimestamp(row.created_at),
    };

    return NextResponse.json(dto);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = Number(id);

    const existing = await sql`
      SELECT id FROM alcoholemia_controles WHERE id = ${numericId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sql`DELETE FROM alcoholemia_controles WHERE id = ${numericId}`;

    return NextResponse.json({
      status: "success",
      message: "Control deleted successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
