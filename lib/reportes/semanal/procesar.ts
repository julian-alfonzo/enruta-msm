import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
import { MAPPING_MANUAL, CODIGOS_REVISAR, CODIGO_IGNORADO, CODIGO_FLAG_927, cargarNomenclador, debeExcluir } from "./nomenclador"
import { VALIDACION, VALIDACION_BY_DESC } from "./validacion"
import { Registro, Entrada, OpcionesProceso, ResultadoProceso, MapeoFuente } from "./tipos"

const MESES_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5,
  junio: 6, julio: 7, agosto: 8, septiembre: 9,
  octubre: 10, noviembre: 11, diciembre: 12,
}
const MES_NUM_A_NOMBRE = Object.fromEntries(Object.entries(MESES_ES).map(([k, v]) => [v, k]))

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86400000

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH + Math.round(serial) * MS_PER_DAY)
}

function dateToSerial(d: Date): number {
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.round((utc - EXCEL_EPOCH) / MS_PER_DAY)
}

export function extraerMesAno(nombreArchivo: string): { mesStr: string; mesNum: number; ano: number } {
  const nombre = nombreArchivo.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim().toLowerCase()
  for (const [mesStr, mesNum] of Object.entries(MESES_ES)) {
    if (nombre.includes(mesStr)) {
      const yearMatch = nombre.match(/\b(20\d{2})\b/)
      return { mesStr, mesNum, ano: yearMatch ? Number(yearMatch[1]) : 2026 }
    }
  }
  return { mesStr: "mayo", mesNum: 5, ano: 2026 }
}

export function mapearLicencia(
  motivo: string | null | undefined,
  nomenclador: Record<string, number>,
): { codigo: number | null; fuente: MapeoFuente | null } {
  if (motivo == null) return { codigo: null, fuente: null }
  const texto = String(motivo).trim()
  if (texto === "" || texto === "*" || texto === "-") return { codigo: null, fuente: null }

  const lower = texto.toLowerCase()

  if (Object.prototype.hasOwnProperty.call(nomenclador, lower)) {
    return { codigo: nomenclador[lower], fuente: "nomenclador" }
  }
  if (Object.prototype.hasOwnProperty.call(MAPPING_MANUAL, lower)) {
    return { codigo: MAPPING_MANUAL[lower], fuente: "manual" }
  }
  if (Object.prototype.hasOwnProperty.call(VALIDACION_BY_DESC, lower)) {
    return { codigo: VALIDACION_BY_DESC[lower], fuente: "validacion" }
  }

  const validacionEntries = Object.entries(VALIDACION_BY_DESC).sort((a, b) => b[0].length - a[0].length)
  for (const [desc, codigo] of validacionEntries) {
    if (desc && (desc.includes(lower) || lower.includes(desc))) {
      return { codigo, fuente: "validacion" }
    }
  }

  const manualEntries = Object.entries(MAPPING_MANUAL).sort((a, b) => b[0].length - a[0].length)
  for (const [manualTexto, codigo] of manualEntries) {
    if (manualTexto && String(codigo) !== manualTexto && (manualTexto.includes(lower) || lower.includes(manualTexto))) {
      return { codigo, fuente: "manual" }
    }
  }

  return { codigo: null, fuente: null }
}

export function leerDatosFuente(buffer: ArrayBuffer, mesNum: number, ano: number): Registro[] {
  const wb = XLSX.read(buffer, { type: "array" })
  const sheetNames = wb.SheetNames
    .filter((s) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 31)
    .sort((a, b) => Number(a) - Number(b))

  const registros: Registro[] = []
  const vistos = new Set<string>()

  for (const sn of sheetNames) {
    const ws = wb.Sheets[sn]
    if (!ws) continue
    const dia = Number(sn)
    const filas: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
    for (let i = 1; i < filas.length; i++) {
      const row = filas[i]
      if (!row || row.length < 5) continue

      const fechaCelda = row[0]
      let fechaSerial: number
      if (typeof fechaCelda === "number" && Number.isFinite(fechaCelda)) {
        fechaSerial = Math.round(fechaCelda)
      } else {
        try {
          fechaSerial = dateToSerial(new Date(ano, mesNum - 1, dia))
        } catch {
          continue
        }
      }
      const fecha = serialToDate(fechaSerial)

      const legajoVal = row[1]
      if (legajoVal == null || String(legajoVal).trim() === "" || String(legajoVal).trim() === "-" || String(legajoVal).trim() === "*") {
        continue
      }
      let legajo: number
      try {
        legajo = Math.trunc(Number(String(legajoVal).replace(",", ".")))
        if (!Number.isFinite(legajo)) continue
      } catch {
        continue
      }

      const motivoRaw = row[4]
      const esVacio = motivoRaw == null || String(motivoRaw).trim() === "" || String(motivoRaw).trim() === "-" || String(motivoRaw).trim() === "*"

      if (!esVacio && debeExcluir(motivoRaw as string | null)) continue

      const clave = `${legajo}|${fechaSerial}|${motivoRaw ?? ""}`
      if (vistos.has(clave)) continue
      vistos.add(clave)

      registros.push({
        legajo,
        fecha,
        motivo: esVacio ? null : String(motivoRaw),
        es_vacio: esVacio,
      })
    }
  }

  return registros
}

export function consolidarPorRango(registros: Registro[]): Entrada[] {
  const resultado: Entrada[] = []

  const porConsolidar = registros.filter((r) => r.codigo != null)
  const sinConsolidar = registros.filter((r) => r.codigo == null)

  for (const reg of sinConsolidar) {
    resultado.push({
      legajo: reg.legajo,
      codigo: null,
      fecha_inicio: reg.fecha,
      fecha_fin: reg.fecha,
      flag_927: reg.flag_927 ?? false,
    })
  }

  const grupos = new Map<string, Registro[]>()
  for (const reg of porConsolidar) {
    const k = `${reg.legajo}|${reg.codigo}`
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(reg)
  }

  for (const [, items] of grupos) {
    const fechasSet = new Set<number>()
    for (const it of items) fechasSet.add(it.fecha.getTime())
    const fechasOrdenadas = Array.from(fechasSet).sort((a, b) => a - b).map((t) => new Date(t))
    if (fechasOrdenadas.length === 0) continue

    const has927 = items.some((r) => r.flag_927)
    const firstLegajo = items[0].legajo
    const firstCodigo: number | null = items[0].codigo ?? null
    let inicioRango = fechasOrdenadas[0]
    let finRango = fechasOrdenadas[0]

    for (let i = 1; i < fechasOrdenadas.length; i++) {
      const diff = Math.round((fechasOrdenadas[i].getTime() - fechasOrdenadas[i - 1].getTime()) / 86400000)
      if (diff === 1) {
        finRango = fechasOrdenadas[i]
      } else {
        resultado.push({ legajo: firstLegajo, codigo: firstCodigo, fecha_inicio: inicioRango, fecha_fin: finRango, flag_927: has927 })
        inicioRango = fechasOrdenadas[i]
        finRango = fechasOrdenadas[i]
      }
    }
    resultado.push({ legajo: firstLegajo, codigo: firstCodigo, fecha_inicio: inicioRango, fecha_fin: finRango, flag_927: has927 })
  }

  return resultado
}

export function agruparPorSemana(inicio: Date, fin: Date, consolidadas: Entrada[]): Entrada[] {
  const out: Entrada[] = []
  for (const e of consolidadas) {
    const ini = e.fecha_inicio < inicio ? inicio : e.fecha_inicio
    const finCorte = e.fecha_fin > fin ? fin : e.fecha_fin
    if (ini <= finCorte) {
      out.push({ ...e, fecha_inicio: ini, fecha_fin: finCorte })
    }
  }
  return out
}

export function ordenarEntradas(entradas: Entrada[]): Entrada[] {
  return [...entradas].sort((a, b) => {
    if (a.fecha_inicio.getTime() !== b.fecha_inicio.getTime()) return a.fecha_inicio.getTime() - b.fecha_inicio.getTime()
    return a.legajo - b.legajo
  })
}

export function procesarParteSemanal(
  inputBuffer: ArrayBuffer,
  inputFileName: string,
  opciones: OpcionesProceso,
): ResultadoProceso {
  const nomenclador = opciones.nomencladorPath ? cargarNomenclador(opciones.nomencladorPath) : cargarNomenclador()
  const registros = leerDatosFuente(inputBuffer, opciones.mesNum, opciones.ano)

  const contadorFuentes: Record<string, number> = { nomenclador: 0, manual: 0, validacion: 0, none: 0 }
  const motivosSinCoincidencia = new Set<string>()
  const registrosConCodigo: Registro[] = []

  for (const reg of registros) {
    const { codigo, fuente } = mapearLicencia(reg.motivo, nomenclador)
    reg.codigo = codigo
    reg.fuente_mapeo = fuente

    if (codigo === CODIGO_IGNORADO) continue

    if (codigo != null) {
      const k = fuente ?? "none"
      contadorFuentes[k] = (contadorFuentes[k] ?? 0) + 1
    } else {
      contadorFuentes.none = (contadorFuentes.none ?? 0) + 1
      const motivoStr = reg.motivo ? String(reg.motivo).trim() : ""
      if (motivoStr && motivoStr !== "None") motivosSinCoincidencia.add(motivoStr)
    }

    if (codigo === CODIGO_FLAG_927) reg.flag_927 = true

    registrosConCodigo.push(reg)
  }

  const consolidadas = consolidarPorRango(registrosConCodigo)

  const diaInicio = new Date(Date.UTC(opciones.ano, opciones.mesNum - 1, opciones.inicioSemana))
  const diaFin = new Date(Date.UTC(opciones.ano, opciones.mesNum - 1, opciones.finSemana))
  const entradasSemana = agruparPorSemana(diaInicio, diaFin, consolidadas)

  const mesStr = MES_NUM_A_NOMBRE[opciones.mesNum] ?? "mayo"
  const nombreSalida = `Parte Semanal del ${opciones.inicioSemana} al ${opciones.finSemana} de ${mesStr}.xlsx`

  return {
    entradas: entradasSemana,
    nombreSalida,
    motivosSinCoincidencia: Array.from(motivosSinCoincidencia).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    contadorFuentes,
    nomencladorActualizado: false,
    nuevosEnNomenclador: 0,
  }
}

export function generarExcelSemanal(
  entradas: Entrada[],
  opciones: OpcionesProceso,
  _nombreSalida: string,
): ArrayBuffer {
  void _nombreSalida

  const entradasOrdenadas = ordenarEntradas(entradas)

  const legajoCount = new Map<number, number>()
  for (const e of entradasOrdenadas) {
    if (e.codigo != null && CODIGOS_REVISAR.has(e.codigo)) {
      legajoCount.set(e.legajo, (legajoCount.get(e.legajo) ?? 0) + 1)
    }
  }

  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet("Datos")
  ws.columns = [
    { header: "Legajo", key: "legajo", width: 9.14 },
    { header: "Nro Cargo", key: "nro_cargo", width: 10 },
    { header: "Licencia", key: "licencia", width: 10 },
    { header: "Fecha Inicio", key: "fecha_inicio", width: 11.71, style: { numFmt: "d-mmm" } },
    { header: "Fecha Fin", key: "fecha_fin", width: 10, style: { numFmt: "d-mmm" } },
    { header: "Año", key: "anio", width: 11.71 },
  ]
  ws.getRow(1).font = { name: "Calibri", size: 11 }
  ws.getRow(1).alignment = { horizontal: "center" }

  for (let i = 0; i < entradasOrdenadas.length; i++) {
    const e = entradasOrdenadas[i]
    const serialInicio = dateToSerial(e.fecha_inicio)
    const serialFin = dateToSerial(e.fecha_fin)
    const isVacio = e.codigo == null
    const isHighlight =
      e.flag_927 ||
      (e.codigo != null && CODIGOS_REVISAR.has(e.codigo) && (legajoCount.get(e.legajo) ?? 0) > 1)

    const row = ws.addRow({
      legajo: e.legajo,
      nro_cargo: 1,
      licencia: isVacio ? "VACIO" : e.codigo,
      fecha_inicio: serialInicio,
      fecha_fin: serialFin,
      anio: opciones.ano,
    })

    row.font = { name: "Calibri", size: 11 }
    row.alignment = { horizontal: "center" }

    const fechaInicioCell = row.getCell("fecha_inicio")
    fechaInicioCell.numFmt = "d-mmm"

    const fechaFinCell = row.getCell("fecha_fin")
    fechaFinCell.numFmt = "d-mmm"

    const licenciaCell = row.getCell("licencia")
    if (isVacio) {
      licenciaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } }
    } else if (isHighlight) {
      licenciaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }
    }
  }

  const wsHoja1 = workbook.addWorksheet("Hoja1")
  wsHoja1.getCell("A1").value = "Legajo"

  const wsValidacion = workbook.addWorksheet("Validacion")
  wsValidacion.columns = [
    { header: "Licencia", key: "codigo", width: 10 },
    { header: "Descripcion", key: "descripcion", width: 40 },
  ]
  wsValidacion.getRow(1).font = { name: "Calibri", size: 11 }
  wsValidacion.getRow(1).alignment = { horizontal: "center" }
  for (const [codigo, desc] of VALIDACION) {
    wsValidacion.addRow({ codigo, descripcion: desc })
  }

  return workbook.xlsx.writeBuffer({ useStyles: true }) as unknown as ArrayBuffer
}
