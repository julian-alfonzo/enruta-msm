import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function mapRowToDTO(a: any) {
  return {
    id: a.id,
    legajo: a.legajo,
    apellido_nombre: a.apellido_nombre,
    fecha_ingreso: a.fecha_ingreso ?? null,
    dependencia: a.dependencia ?? null,
    cargo: a.cargo ?? null,
    turno: a.turno ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at ?? a.created_at,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await sql`SELECT * FROM agentes WHERE id = ${Number(id)}`;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "success", data: mapRowToDTO(rows[0]) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
