import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function toTimestamp(iso: string | Date | null): number | null {
  if (!iso) return null;
  return new Date(iso).getTime();
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
  { params }: { params: Promise<{ legajo: string }> },
) {
  try {
    const { legajo } = await params;

    const rows = await sql`
      SELECT c.*, a.nombre, a.legajo, a.dependencia, a.cargo
      FROM alcoholemia_controles c
      JOIN agentes a ON a.id = c.agente_id
      WHERE a.legajo ILIKE ${legajo}
      ORDER BY c.fecha_control DESC
    `;

    return NextResponse.json(rows.map(mapRowToDTO));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
