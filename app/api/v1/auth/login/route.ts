import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const legajo = body.legajo ?? body.username;
    const password = body.password ?? body.pin;

    if (!legajo) {
      return NextResponse.json(
        { error: "legajo is required" },
        { status: 400 },
      );
    }

    const rows = await sql`
      SELECT id, nombre, legajo, tipo, dependencia
      FROM agentes
      WHERE legajo = ${legajo}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const user = rows[0];

    const rolMap: Record<string, string> = {
      Caminadora: "CAMINADORA",
      Moto: "MOTO",
      "Tránsito": "TRANSITO",
      "Patrulla de Moto": "PATRULLA",
      Supervisor: "SUPERVISOR",
      Administrador: "ADMIN",
    };

    const token = Buffer.from(
      JSON.stringify({ id: user.id, legajo: user.legajo, rol: user.tipo, ts: Date.now() }),
    ).toString("base64");

    return NextResponse.json({
      status: "success",
      data: {
        token,
        token_type: "Bearer",
        expires_in: 86400,
        refresh_token: token + "_refresh",
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: `${user.legajo}@msm.gob.ar`,
          rol: rolMap[user.tipo] ?? user.tipo ?? "AGENTE",
          legajo: user.legajo,
          municipalidad: "Municipalidad de San Miguel",
        },
      },
      message: "Inicio de sesión exitoso",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
