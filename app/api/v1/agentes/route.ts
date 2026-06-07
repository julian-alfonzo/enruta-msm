import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM agentes ORDER BY nombre ASC`;

    const data = rows.map((a: any) => ({
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
    }));

    return NextResponse.json({ status: "success", data, total: data.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
