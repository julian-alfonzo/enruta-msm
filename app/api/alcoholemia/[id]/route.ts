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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await sql`
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
      FROM controles_alcoholemia c
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
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      WHERE c.id = ${numericId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await sql`
      UPDATE controles_alcoholemia SET
        resultado = COALESCE(${body.resultado ?? null}, resultado),
        graduacion = COALESCE(${body.graduacion ?? null}, graduacion),
        servicio_extra = COALESCE(${body.servicio_extra ?? null}, servicio_extra),
        observacion = COALESCE(${body.observacion ?? null}, observacion)
      WHERE id = ${numericId}
      RETURNING *
    `;

    return NextResponse.json({
      ...mapRowToDTO(updated[0]),
      legajo: existing[0].legajo,
      apellido_nombre: existing[0].apellido_nombre,
      dependencia: existing[0].dependencia,
      cargo: existing[0].cargo,
      turno: existing[0].turno,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = Number(id);

    const existing = await sql`
      SELECT id FROM controles_alcoholemia WHERE id = ${numericId}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sql`DELETE FROM controles_alcoholemia WHERE id = ${numericId}`;

    return NextResponse.json({
      status: "success",
      message: "Control deleted successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
