import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM agentes ORDER BY apellido_nombre ASC`;
    const data = rows.map(mapRowToDTO);
    return NextResponse.json({ status: "success", data, total: data.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
