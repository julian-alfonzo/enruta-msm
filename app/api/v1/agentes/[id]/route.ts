import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await sql`SELECT * FROM agentes WHERE id = ${Number(id)}`;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const a = rows[0];
    const data = {
      id: a.id,
      nombre: a.nombre,
      dni: a.dni ?? "",
      legajo: a.legajo,
      telefono: a.telefono ?? null,
      tipo_agente_id: null,
      supervisor_id: null,
      horario_id: null,
      dependencia: a.dependencia ?? null,
      cargo: a.cargo ?? null,
      tipo: a.tipo ?? null,
      activo: a.activo,
      en_servicio: a.en_servicio,
      foto_url: null,
      ultima_ubicacion: null,
      created_at: a.created_at,
      updated_at: a.created_at,
    };

    return NextResponse.json({ status: "success", data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
