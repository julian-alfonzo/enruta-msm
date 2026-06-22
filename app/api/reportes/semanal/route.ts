import { NextRequest, NextResponse } from "next/server"
import { extraerMesAno, procesarParteSemanal, generarExcelSemanal } from "@/lib/reportes/semanal/procesar"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("fuente")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Subí el archivo Excel fuente (campo 'fuente')" }, { status: 400 })
    }

    const inicioSemana = Number(formData.get("inicioSemana") ?? 1)
    const finSemana = Number(formData.get("finSemana") ?? 7)
    if (!Number.isFinite(inicioSemana) || !Number.isFinite(finSemana) || inicioSemana < 1 || finSemana < inicioSemana) {
      return NextResponse.json({ error: "Rango de semana inválido" }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const { mesNum, ano } = extraerMesAno(file.name)

    const resultado = procesarParteSemanal(buffer, file.name, {
      inicioSemana,
      finSemana,
      mesNum,
      ano,
    })

    if (resultado.entradas.length === 0) {
      return NextResponse.json(
        { error: "No hay registros para la semana indicada", motivosSinCoincidencia: resultado.motivosSinCoincidencia, contadorFuentes: resultado.contadorFuentes },
        { status: 422 },
      )
    }

    const xlsxBuffer = generarExcelSemanal(resultado.entradas, { inicioSemana, finSemana, mesNum, ano }, resultado.nombreSalida)

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${resultado.nombreSalida}"`,
        "X-Motivos-Sin-Coincidencia": String(resultado.motivosSinCoincidencia.length),
        "X-Contador-Fuentes": JSON.stringify(resultado.contadorFuentes),
        "X-Total-Registros": String(resultado.entradas.length),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 })
  }
}
