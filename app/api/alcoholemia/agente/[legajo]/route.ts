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
  { params }: { params: Promise<{ legajo: string }> },
) {
  try {
    const { legajo } = await params;

    const rows = await sql`
      SELECT c.*, a.apellido_nombre, a.legajo, a.dependencia, a.cargo, a.turno
      FROM controles_alcoholemia c
      JOIN agentes a ON a.id = c.agente_id
      WHERE a.legajo ILIKE ${legajo}
      ORDER BY c.fecha DESC
    `;

    return NextResponse.json(rows.map(mapRowToDTO));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
