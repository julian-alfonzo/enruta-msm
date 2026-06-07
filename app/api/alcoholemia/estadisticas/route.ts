import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json(
        { error: "Query params 'desde' and 'hasta' are required (milliseconds epoch)" },
        { status: 400 },
      );
    }

    const desdeDate = new Date(Number(desde)).toISOString();
    const hastaDate = new Date(Number(hasta)).toISOString();

    const rows = await sql`
      SELECT
        COUNT(*)::int AS "totalTests",
        COUNT(*) FILTER (WHERE resultado = 'POSITIVO')::int AS "totalPositivos",
        COUNT(*) FILTER (WHERE resultado = 'NEGATIVO')::int AS "totalNegativos"
      FROM alcoholemia_controles
      WHERE fecha_control >= ${desdeDate} AND fecha_control <= ${hastaDate}
    `;

    const stats = rows[0];

    return NextResponse.json({
      status: "success",
      data: {
        totalTests: Number(stats.totalTests),
        totalPositivos: Number(stats.totalPositivos),
        totalNegativos: Number(stats.totalNegativos),
        desde: Number(desde),
        hasta: Number(hasta),
      },
      message: "Statistics retrieved successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
