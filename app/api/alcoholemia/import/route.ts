import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface ControlData {
  agente_id: number;
  resultado: "POSITIVO" | "NEGATIVO";
  graduacion?: number;
  servicio_extra?: string;
  observacion?: string;
  fecha: string;
}

async function importControls(controls: ControlData[]) {
  const results = { imported: 0, errors: 0, details: [] as string[] };

  for (const control of controls) {
    try {
      await sql`
        INSERT INTO controles_alcoholemia (agente_id, resultado, graduacion, servicio_extra, observacion, fecha, created_at)
        VALUES (${control.agente_id}, ${control.resultado}, ${control.graduacion ?? null}, ${control.servicio_extra ?? null}, ${control.observacion ?? null}, ${control.fecha}, ${new Date().toISOString()})
      `;
      results.imported++;
      results.details.push(`✓ Control importado para agente ${control.agente_id}`);
    } catch (error) {
      results.errors++;
      results.details.push(`✗ Error: ${error}`);
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const controls = body.controls || body;

    if (!Array.isArray(controls)) {
      return NextResponse.json({ error: "Invalid format: expected controls array" }, { status: 400 });
    }

    const results = await importControls(controls);

    return NextResponse.json({
      success: true,
      imported: results.imported,
      errors: results.errors,
      details: results.details,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
