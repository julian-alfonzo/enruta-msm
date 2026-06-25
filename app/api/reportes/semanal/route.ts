import { NextRequest, NextResponse } from "next/server"
import { extraerMesAno, procesarParteSemanal, generarExcelSemanal, generarTodasLasSemanas } from "@/lib/reportes/semanal/procesar"
import { sql } from "@/lib/db"
import JSZip from "jszip"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("fuente")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Subí el archivo Excel fuente (campo 'fuente')" }, { status: 400 })
    }

    const modo = (formData.get("modo") as string) || "semana"

    const buffer = await file.arrayBuffer()
    const { mesStr, mesNum, ano } = extraerMesAno(file.name)

    const incluirNombre = (formData.get("incluirNombre") as string) === "true"
    let nombres: Map<number, string> | undefined
    if (incluirNombre) {
      const agentes = await sql`SELECT legajo, apellido_nombre FROM agentes WHERE deleted_at IS NULL` as { legajo: string; apellido_nombre: string }[]
      nombres = new Map(agentes.map((a) => [Number(a.legajo), a.apellido_nombre]))
    }

    if (modo === "mes") {
      const resultado = await generarTodasLasSemanas(buffer, file.name, incluirNombre, nombres)

      if (resultado.semanas.length === 0) {
        return NextResponse.json(
          {
            error: "No hay registros para ninguna semana del mes",
            motivosSinCoincidencia: resultado.motivosSinCoincidencia,
            contadorFuentes: resultado.contadorFuentes,
          },
          { status: 422 },
        )
      }

      const zip = new JSZip()
      for (const s of resultado.semanas) {
        zip.file(s.nombreArchivo, s.buffer)
      }
      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

      const zipName = `Partes Semanales - ${mesStr.charAt(0).toUpperCase() + mesStr.slice(1)} ${ano}.zip`

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipName}"`,
          "X-Modo": "mes",
          "X-Total-Archivos": String(resultado.semanas.length),
          "X-Total-Registros": String(resultado.totalRegistros),
          "X-Contador-Fuentes": JSON.stringify(resultado.contadorFuentes),
        },
      })
    }

    const inicioSemana = Number(formData.get("inicioSemana") ?? 1)
    const finSemana = Number(formData.get("finSemana") ?? 7)
    if (!Number.isFinite(inicioSemana) || !Number.isFinite(finSemana) || inicioSemana < 1 || finSemana < inicioSemana) {
      return NextResponse.json({ error: "Rango de semana inválido" }, { status: 400 })
    }

    const resultado = procesarParteSemanal(buffer, file.name, {
      inicioSemana,
      finSemana,
      mesNum,
      ano,
      incluirNombre,
    })

    if (resultado.entradas.length === 0) {
      return NextResponse.json(
        { error: "No hay registros para la semana indicada", motivosSinCoincidencia: resultado.motivosSinCoincidencia, contadorFuentes: resultado.contadorFuentes },
        { status: 422 },
      )
    }

    const xlsxBuffer = await generarExcelSemanal(resultado.entradas, { inicioSemana, finSemana, mesNum, ano, incluirNombre }, resultado.nombreSalida, nombres)

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${resultado.nombreSalida}"`,
        "X-Modo": "semana",
        "X-Motivos-Sin-Coincidencia": String(resultado.motivosSinCoincidencia.length),
        "X-Contador-Fuentes": JSON.stringify(resultado.contadorFuentes),
        "X-Total-Registros": String(resultado.entradas.length),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 })
  }
}
