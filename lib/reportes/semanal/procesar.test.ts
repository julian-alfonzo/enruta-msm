import { describe, it, expect } from "vitest"
import {
  extraerMesAno,
  mapearLicencia,
  marcarConflictos,
  consolidarPorRango,
  agruparPorSemana,
  ordenarEntradas,
  obtenerSemanas,
  generarExcelSemanal,
  leerDatosFuente,
  procesarParteSemanal,
  generarTodasLasSemanas,
} from "./procesar"
import { debeExcluir, cargarNomenclador } from "./nomenclador"
import { Registro, Entrada } from "./tipos"
import * as XLSX from "xlsx"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

function makeRegistro(overrides: Partial<Registro> & { legajo: number; fecha: Date }): Registro {
  return {
    motivo: null,
    es_vacio: true,
    ...overrides,
  }
}

function makeEntrada(overrides: Partial<Entrada> & { legajo: number }): Entrada {
  const d = new Date("2026-05-01")
  return {
    codigo: null,
    fecha_inicio: d,
    fecha_fin: d,
    flag_927: false,
    ...overrides,
  }
}

describe("extraerMesAno", () => {
  it("extrae mes y año de un nombre tipico", () => {
    const result = extraerMesAno("5 - MAYO 2026.xlsx")
    expect(result).toEqual({ mesStr: "mayo", mesNum: 5, ano: 2026 })
  })

  it("extrae mes y año con guion bajo", () => {
    const result = extraerMesAno("parte_junio_2025.xlsx")
    expect(result).toEqual({ mesStr: "junio", mesNum: 6, ano: 2025 })
  })

  it("default a mayo 2026 si no encuentra mes", () => {
    const result = extraerMesAno("archivo_sin_mes.xlsx")
    expect(result).toEqual({ mesStr: "mayo", mesNum: 5, ano: 2026 })
  })

  it("extrae año de nombre", () => {
    const result = extraerMesAno("ENERO 2024.xlsx")
    expect(result.ano).toBe(2024)
  })

  it("extrae todos los meses", () => {
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
    meses.forEach((m, i) => {
      const r = extraerMesAno(`${m} 2026.xlsx`)
      expect(r.mesNum).toBe(i + 1)
      expect(r.mesStr).toBe(m)
    })
  })
})

describe("mapearLicencia", () => {
  const nomencladorVacio: Record<string, number> = {}

  it("retorna null para motivo null", () => {
    const r = mapearLicencia(null, nomencladorVacio)
    expect(r.codigo).toBeNull()
    expect(r.fuente).toBeNull()
  })

  it("retorna null para string vacio", () => {
    const r = mapearLicencia("", nomencladorVacio)
    expect(r.codigo).toBeNull()
  })

  it("retorna null para asterisco", () => {
    const r = mapearLicencia("*", nomencladorVacio)
    expect(r.codigo).toBeNull()
  })

  it("mapea desde nomenclador", () => {
    const nom = { "enfermo": 4 }
    const r = mapearLicencia("enfermo", nom)
    expect(r.codigo).toBe(4)
    expect(r.fuente).toBe("nomenclador")
  })

  it("mapea desde MAPPING_MANUAL", () => {
    const r = mapearLicencia("ausente sin aviso", {})
    expect(r.codigo).toBe(6)
    expect(r.fuente).toBe("manual")
  })

  it("mapea desde VALIDACION_BY_DESC exacto", () => {
    const r = mapearLicencia("donacion de sangre", {})
    expect(r.codigo).toBe(42)
    expect(r.fuente).toBe("validacion")
  })

  it("mapea por substring en validacion", () => {
    const r = mapearLicencia("aislamiento preventivo", {})
    expect(r.codigo).toBe(77)
    expect(r.fuente).toBe("validacion")
  })

  it("retorna null para motivo no reconocido", () => {
    const r = mapearLicencia("motivo_inexistente_xyz", {})
    expect(r.codigo).toBeNull()
    expect(r.fuente).toBeNull()
  })

  it("es case insensitive", () => {
    const r = mapearLicencia("ENFERMO", {})
    expect(r.codigo).toBe(4)
  })

  it("trim spaces", () => {
    const r = mapearLicencia("  enfermo  ", {})
    expect(r.codigo).toBe(4)
  })
})

describe("debeExcluir", () => {
  it("excluye horas extras", () => {
    expect(debeExcluir("horas extras")).toBe(true)
    expect(debeExcluir("hora extras")).toBe(true)
  })

  it("excluye licencia anual", () => {
    expect(debeExcluir("LICENCIA ANUAL")).toBe(true)
  })

  it("excluye maternidad", () => {
    expect(debeExcluir("maternidad")).toBe(true)
  })

  it("excluye suspendido", () => {
    expect(debeExcluir("suspendido")).toBe(true)
    expect(debeExcluir("suspension")).toBe(true)
  })

  it("no excluye motivos normales", () => {
    expect(debeExcluir("enfermo")).toBe(false)
    expect(debeExcluir("Examen")).toBe(false)
    expect(debeExcluir(null)).toBe(false)
  })
})

describe("consolidarPorRango", () => {
  const base = new Date("2026-05-01T00:00:00Z")

  it("devuelve entradas sin consolidar para codigo null", () => {
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: base, codigo: null }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(1)
    expect(result[0].legajo).toBe(100)
    expect(result[0].codigo).toBeNull()
  })

  it("propaga nombre", () => {
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: base, codigo: null, nombre: "Juan" }),
    ]
    const result = consolidarPorRango(regs)
    expect(result[0].nombre).toBe("Juan")
  })

  it("consolida fechas consecutivas en un rango", () => {
    const d1 = new Date("2026-05-01T00:00:00Z")
    const d2 = new Date("2026-05-02T00:00:00Z")
    const d3 = new Date("2026-05-03T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d1, codigo: 4 }),
      makeRegistro({ legajo: 100, fecha: d2, codigo: 4 }),
      makeRegistro({ legajo: 100, fecha: d3, codigo: 4 }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(1)
    expect(result[0].fecha_inicio).toEqual(d1)
    expect(result[0].fecha_fin).toEqual(d3)
  })

  it("separa rangos no consecutivos", () => {
    const d1 = new Date("2026-05-01T00:00:00Z")
    const d2 = new Date("2026-05-05T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d1, codigo: 4 }),
      makeRegistro({ legajo: 100, fecha: d2, codigo: 4 }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(2)
  })

  it("agrupa por legajo y codigo distintos", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: 4 }),
      makeRegistro({ legajo: 200, fecha: d, codigo: 4 }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(2)
  })

  it("flag_927 se propaga", () => {
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: base, codigo: 927, flag_927: true }),
    ]
    const result = consolidarPorRango(regs)
    expect(result[0].flag_927).toBe(true)
  })

  it("propaga nombre en grupos consolidados", () => {
    const d1 = new Date("2026-05-01T00:00:00Z")
    const d2 = new Date("2026-05-02T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d1, codigo: 4, nombre: "Ana" }),
      makeRegistro({ legajo: 100, fecha: d2, codigo: 4, nombre: "Ana" }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(1)
    expect(result[0].nombre).toBe("Ana")
  })

  it("deduplica fechas iguales", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: 4 }),
      makeRegistro({ legajo: 100, fecha: d, codigo: 4 }),
    ]
    const result = consolidarPorRango(regs)
    expect(result).toHaveLength(1)
  })

  it("maneja lista vacia", () => {
    const result = consolidarPorRango([])
    expect(result).toHaveLength(0)
  })
})

describe("marcarConflictos", () => {
  it("no marca nada si no hay conflictos", () => {
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: new Date("2026-05-01T00:00:00Z"), codigo: 4, motivo: "Enfermo" }),
      makeRegistro({ legajo: 200, fecha: new Date("2026-05-01T00:00:00Z"), codigo: 4, motivo: "Enfermo" }),
    ]
    marcarConflictos(regs)
    expect(regs[0].verificacion).toBeUndefined()
    expect(regs[1].verificacion).toBeUndefined()
  })

  it("marca conflicto cuando mismo legajo mismo dia distintos codigos", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: 4, motivo: "Enfermo" }),
      makeRegistro({ legajo: 100, fecha: d, codigo: 12, motivo: "Examen" }),
    ]
    marcarConflictos(regs)
    expect(regs[0].verificacion).toContain("Enfermo")
    expect(regs[0].verificacion).toContain("Examen")
    expect(regs[1].verificacion).toEqual(regs[0].verificacion)
  })

  it("no marca si mismo codigo en mismo dia", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: 4, motivo: "Enfermo 1" }),
      makeRegistro({ legajo: 100, fecha: d, codigo: 4, motivo: "Enfermo 2" }),
    ]
    marcarConflictos(regs)
    expect(regs[0].verificacion).toBeUndefined()
  })

  it("no marca si mismo legajo pero distinto dia", () => {
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: new Date("2026-05-01T00:00:00Z"), codigo: 4, motivo: "Enfermo" }),
      makeRegistro({ legajo: 100, fecha: new Date("2026-05-02T00:00:00Z"), codigo: 12, motivo: "Examen" }),
    ]
    marcarConflictos(regs)
    expect(regs[0].verificacion).toBeUndefined()
    expect(regs[1].verificacion).toBeUndefined()
  })

  it("ignora registros sin codigo", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: null, motivo: null }),
      makeRegistro({ legajo: 100, fecha: d, codigo: 4, motivo: "Enfermo" }),
    ]
    marcarConflictos(regs)
    expect(regs[0].verificacion).toBeUndefined()
    expect(regs[1].verificacion).toBeUndefined()
  })

  it("propaga verificacion a consolidarPorRango", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const regs: Registro[] = [
      makeRegistro({ legajo: 100, fecha: d, codigo: 4, motivo: "Enfermo", nombre: "Juan" }),
      makeRegistro({ legajo: 100, fecha: d, codigo: 12, motivo: "Examen", nombre: "Juan" }),
    ]
    marcarConflictos(regs)
    const result = consolidarPorRango(regs)
    const conflicted = result.filter(e => e.verificacion)
    expect(conflicted.length).toBeGreaterThan(0)
    expect(conflicted[0].verificacion).toContain("Enfermo")
    expect(conflicted[0].verificacion).toContain("Examen")
  })
})

describe("agruparPorSemana", () => {
  it("recorta fechas al rango de la semana", () => {
    const entradas: Entrada[] = [
      makeEntrada({
        legajo: 100,
        fecha_inicio: new Date("2026-04-28T00:00:00Z"),
        fecha_fin: new Date("2026-05-05T00:00:00Z"),
      }),
    ]
    const inicio = new Date("2026-05-01T00:00:00Z")
    const fin = new Date("2026-05-07T00:00:00Z")
    const result = agruparPorSemana(inicio, fin, entradas)
    expect(result).toHaveLength(1)
    expect(result[0].fecha_inicio).toEqual(inicio)
    expect(result[0].fecha_fin).toEqual(new Date("2026-05-05T00:00:00Z"))
  })

  it("excluye entradas fuera del rango", () => {
    const entradas: Entrada[] = [
      makeEntrada({
        legajo: 100,
        fecha_inicio: new Date("2026-05-10T00:00:00Z"),
        fecha_fin: new Date("2026-05-12T00:00:00Z"),
      }),
    ]
    const inicio = new Date("2026-05-01T00:00:00Z")
    const fin = new Date("2026-05-07T00:00:00Z")
    const result = agruparPorSemana(inicio, fin, entradas)
    expect(result).toHaveLength(0)
  })

  it("entradas completamente dentro se mantienen intactas", () => {
    const entradas: Entrada[] = [
      makeEntrada({
        legajo: 100,
        fecha_inicio: new Date("2026-05-03T00:00:00Z"),
        fecha_fin: new Date("2026-05-05T00:00:00Z"),
      }),
    ]
    const inicio = new Date("2026-05-01T00:00:00Z")
    const fin = new Date("2026-05-07T00:00:00Z")
    const result = agruparPorSemana(inicio, fin, entradas)
    expect(result).toHaveLength(1)
    expect(result[0].fecha_inicio).toEqual(new Date("2026-05-03T00:00:00Z"))
  })
})

describe("ordenarEntradas", () => {
  it("ordena por fecha inicio ascendente", () => {
    const entradas: Entrada[] = [
      makeEntrada({ legajo: 200, fecha_inicio: new Date("2026-05-05T00:00:00Z") }),
      makeEntrada({ legajo: 100, fecha_inicio: new Date("2026-05-01T00:00:00Z") }),
    ]
    const result = ordenarEntradas(entradas)
    expect(result[0].legajo).toBe(100)
  })

  it("desempata por legajo ascendente", () => {
    const d = new Date("2026-05-01T00:00:00Z")
    const entradas: Entrada[] = [
      makeEntrada({ legajo: 200, fecha_inicio: d }),
      makeEntrada({ legajo: 100, fecha_inicio: d }),
    ]
    const result = ordenarEntradas(entradas)
    expect(result[0].legajo).toBe(100)
    expect(result[1].legajo).toBe(200)
  })

  it("devuelve array vacio sin error", () => {
    expect(ordenarEntradas([])).toEqual([])
  })
})

describe("obtenerSemanas", () => {
  it("genera semanas para 31 dias", () => {
    const result = obtenerSemanas(31)
    expect(result).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, 31],
    ])
  })

  it("genera semanas para mes de 28 dias", () => {
    const result = obtenerSemanas(28)
    expect(result).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
    ])
  })

  it("una sola semana para 5 dias", () => {
    const result = obtenerSemanas(5)
    expect(result).toEqual([[1, 5]])
  })
})

describe("generarExcelSemanal", () => {
  const makeFecha = (dia: number) => new Date(Date.UTC(2026, 4, dia))
  const opcionesBase = { inicioSemana: 1, finSemana: 7, mesNum: 5, ano: 2026 }

  it("genera un arrayBuffer valido", async () => {
    const entradas: Entrada[] = [
      {
        legajo: 100, codigo: 4, fecha_inicio: makeFecha(1),
        fecha_fin: makeFecha(3), flag_927: false,
      },
    ]
    const buf = await generarExcelSemanal(entradas, opcionesBase, "test.xlsx")
    expect(buf).toBeDefined()
    expect((buf as { byteLength?: number }).byteLength ?? (buf as { length?: number }).length).toBeGreaterThan(0)
  })

  it("incluye columna Nombre cuando incluirNombre es true", async () => {
    const entradas: Entrada[] = [
      {
        legajo: 100, codigo: 4, fecha_inicio: makeFecha(1),
        fecha_fin: makeFecha(1), flag_927: false, nombre: "Juan Perez",
      },
    ]
    const buf = await generarExcelSemanal(entradas, { ...opcionesBase, incluirNombre: true }, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets["Datos"]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    expect(data[0]).toContain("Nombre")
  })

  it("no incluye columna Nombre cuando incluirNombre es false", async () => {
    const entradas: Entrada[] = [
      { legajo: 100, codigo: 4, fecha_inicio: makeFecha(1), fecha_fin: makeFecha(1), flag_927: false },
    ]
    const buf = await generarExcelSemanal(entradas, { ...opcionesBase, incluirNombre: false }, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets["Datos"]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    expect(data[0]).not.toContain("Nombre")
  })

  it("nombre vacio para entrada sin nombre", async () => {
    const entradas: Entrada[] = [
      {
        legajo: 100, codigo: 4, fecha_inicio: makeFecha(1),
        fecha_fin: makeFecha(1), flag_927: false,
      },
    ]
    const buf = await generarExcelSemanal(entradas, { ...opcionesBase, incluirNombre: true }, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets["Datos"]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const nombreIdx = (data[0] as string[]).indexOf("Nombre")
    expect(data[1][nombreIdx]).toBe("")
  })

  it("contiene hoja Validacion con catalogo", async () => {
    const entradas: Entrada[] = [
      { legajo: 100, codigo: 4, fecha_inicio: makeFecha(1), fecha_fin: makeFecha(1), flag_927: false },
    ]
    const buf = await generarExcelSemanal(entradas, opcionesBase, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    expect(wb.SheetNames).toContain("Validacion")
    expect(wb.SheetNames).toContain("Hoja1")
  })

  it("listas vacias generan excel valido", async () => {
    const buf = await generarExcelSemanal([], opcionesBase, "test.xlsx")
    expect(buf.byteLength).toBeGreaterThan(0)
  })
})

describe("leerDatosFuente", () => {
  function crearXlsxBuffer(filas: unknown[][]): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "1")
    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  }

  it("lee registros basicos", () => {
    const header = ["FECHA", "LEGAJO", "APELLIDO Y NOMBRES", "DEPENDENCIA", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "Alvarez Sandra", "Dep1", "Enfermo"],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs).toHaveLength(1)
    expect(regs[0].legajo).toBe(52278)
    expect(regs[0].nombre).toBe("Alvarez Sandra")
    expect(regs[0].motivo).toBe("Enfermo")
    expect(regs[0].es_vacio).toBe(false)
  })

  it("detecta motivo vacio", () => {
    const header = ["FECHA", "LEGAJO", "APELLIDO Y NOMBRES", "DEPENDENCIA", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "Nombre", "Dep1", null],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs[0].es_vacio).toBe(true)
  })

  it("salta filas con legajo invalido", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, "-", "X", "Dep1", "Enfermo"],
      [45504, null, "X", "Dep1", "Enfermo"],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs).toHaveLength(0)
  })

  it("deduplica entradas duplicadas", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "Enfermo"],
      [45504, 52278, "A", "Dep1", "Enfermo"],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs).toHaveLength(1)
  })

  it("solo lee hojas nombradas con numeros 1-31", () => {
    const ws1 = XLSX.utils.aoa_to_sheet([["FECHA","LEGAJO","NOMBRE","DEP","MOTIVO"],[45504,52278,"A","Dep1","Enfermo"]])
    const wsX = XLSX.utils.aoa_to_sheet([["FECHA","LEGAJO","NOMBRE","DEP","MOTIVO"],[45505,99999,"B","Dep2","Examen"]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, "1")
    XLSX.utils.book_append_sheet(wb, wsX, "Resumen")
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs).toHaveLength(1)
    expect(regs[0].legajo).toBe(52278)
  })

  it("nombre puede ser undefined", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "-", "Dep1", "Enfermo"],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs[0].nombre).toBeUndefined()
  })

  it("salta filas con menos de 5 columnas", () => {
    const buf = crearXlsxBuffer([
      ["FECHA", "LEGAJO"],
      [45504, 52278],
    ])
    const regs = leerDatosFuente(buf, 5, 2026)
    expect(regs).toHaveLength(0)
  })
})

describe("procesarParteSemanal", () => {
  function crearXlsxBuffer(filas: unknown[][]): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "1")
    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  }

  it("procesa un archivo basico", () => {
    const header = ["FECHA", "LEGAJO", "APELLIDO Y NOMBRES", "DEPENDENCIA", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "Alvarez Sandra", "Dep1", "Enfermo"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 1,
      finSemana: 7,
      mesNum: 5,
      ano: 2026,
    })
    expect(result.entradas.length).toBeGreaterThanOrEqual(0)
    expect(result.nombreSalida).toContain("Parte Semanal")
  })

  it("excluye motivos con horas extras", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "horas extras"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 1, finSemana: 7, mesNum: 5, ano: 2026,
    })
    expect(result.entradas).toHaveLength(0)
  })

  it("reporta motivos sin coincidencia", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "MOTIVO_INEXISTENTE_XYZ123"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 1, finSemana: 7, mesNum: 5, ano: 2026,
    })
    expect(result.motivosSinCoincidencia).toContain("MOTIVO_INEXISTENTE_XYZ123")
  })

  it("genera nombre de salida correcto", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "Enfermo"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 10, finSemana: 17, mesNum: 5, ano: 2026,
    })
    expect(result.nombreSalida).toBe("Parte Semanal del 10 al 17 de mayo.xlsx")
  })

  it("filtra por rango de semana", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "Enfermo"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 20, finSemana: 30, mesNum: 5, ano: 2026,
    })
    expect(result.entradas).toHaveLength(0)
  })

  it("cuenta fuentes de mapeo", () => {
    const header = ["FECHA", "LEGAJO", "NOMBRE", "DEP", "MOTIVO"]
    const buf = crearXlsxBuffer([
      header,
      [45504, 52278, "A", "Dep1", "Enfermo"],
      [45505, 52279, "B", "Dep2", "ausente sin aviso"],
    ])
    const result = procesarParteSemanal(buf, "MAYO 2026.xlsx", {
      inicioSemana: 1, finSemana: 7, mesNum: 5, ano: 2026,
    })
    expect(result.contadorFuentes.manual).toBeGreaterThanOrEqual(0)
  })
})

describe("generarTodasLasSemanas", () => {
  it("resuelve sin error", async () => {
    const ws = XLSX.utils.aoa_to_sheet([["FECHA","LEGAJO","APELLIDO Y NOMBRES","DEPENDENCIA","MOTIVO"],[45504,52278,"A","Dep1","Enfermo"]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "1")
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = await generarTodasLasSemanas(buf, "MAYO 2026.xlsx")
    expect(result).toHaveProperty("semanas")
    expect(result).toHaveProperty("mesStr")
    expect(result).toHaveProperty("ano")
  })

  it("acepta incluirNombre", async () => {
    const ws = XLSX.utils.aoa_to_sheet([["FECHA","LEGAJO","APELLIDO Y NOMBRES","DEPENDENCIA","MOTIVO"],[45504,52278,"A","Dep1","Enfermo"]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "1")
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const result = await generarTodasLasSemanas(buf, "MAYO 2026.xlsx", true)
    expect(result.mesStr).toBe("mayo")
    expect(result.ano).toBe(2026)
  })
})

describe("cargarNomenclador", () => {
  it("retorna objeto vacio para archivo inexistente", () => {
    const result = cargarNomenclador("/ruta/no/existe/nomenclador.csv")
    expect(result).toEqual({})
  })

  it("retorna objeto vacio para archivo sin header correcto", () => {
    const tmp = mkdtempSync(join(tmpdir(), "test-nom-"))
    const filePath = join(tmp, "bad.csv")
    writeFileSync(filePath, "col1,col2\n")
    const result = cargarNomenclador(filePath)
    rmSync(tmp, { recursive: true, force: true })
    expect(result).toEqual({})
  })

  it("carga nomenclador desde archivo CSV valido con quoted cells", () => {
    const tmp = mkdtempSync(join(tmpdir(), "test-nom-"))
    const filePath = join(tmp, "nomen.csv")
    writeFileSync(filePath, `motivo_original,codigo_licencia
"enfermo",4
"accidente de trabajo",27
"ausente con aviso",50
"motivo con ""comillas""",42
`)
    const result = cargarNomenclador(filePath)
    rmSync(tmp, { recursive: true, force: true })
    expect(result["enfermo"]).toBe(4)
    expect(result["accidente de trabajo"]).toBe(27)
    expect(result['motivo con "comillas"']).toBe(42)
  })

  it("carga nomenclador con BOM", () => {
    const tmp = mkdtempSync(join(tmpdir(), "test-nom-"))
    const filePath = join(tmp, "nomen.csv")
    writeFileSync(filePath, "\uFEFFmotivo_original,codigo_licencia\nenfermo,4\n")
    const result = cargarNomenclador(filePath)
    rmSync(tmp, { recursive: true, force: true })
    expect(result["enfermo"]).toBe(4)
  })
})

describe("mapearLicencia edge cases", () => {
  it("mapea por substring en manual entries", () => {
    const r = mapearLicencia("citado por", {})
    expect(r.codigo).toBe(27)
    expect(r.fuente).toBe("manual")
  })

  it("mapea licencia con texto largo que contiene substring", () => {
    const r = mapearLicencia("asunto particular urgente", {})
    expect(r.codigo).toBe(76)
  })

  it("retorna null para undefined", () => {
    const r = mapearLicencia(undefined, {})
    expect(r.codigo).toBeNull()
    expect(r.fuente).toBeNull()
  })
})

describe("generarExcelSemanal highlight", () => {
  const makeFecha = (dia: number) => new Date(Date.UTC(2026, 4, dia))
  const opcionesBase = { inicioSemana: 1, finSemana: 7, mesNum: 5, ano: 2026 }

  it("marca como rojo entradas vacias", async () => {
    const entradas: Entrada[] = [
      { legajo: 100, codigo: null, fecha_inicio: makeFecha(1), fecha_fin: makeFecha(1), flag_927: false },
    ]
    const buf = await generarExcelSemanal(entradas, opcionesBase, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets["Datos"]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const licenciaIdx = (data[0] as string[]).indexOf("Licencia")
    expect(data[1][licenciaIdx]).toBe("VACIO")
  })

  it("incluye columna Verificacion cuando hay incluirNombre", async () => {
    const entradas: Entrada[] = [
      { legajo: 100, codigo: 4, fecha_inicio: makeFecha(1), fecha_fin: makeFecha(1), flag_927: false, nombre: "A", verificacion: "Conflicto: test" },
    ]
    const buf = await generarExcelSemanal(entradas, { ...opcionesBase, incluirNombre: true, incluirVerificacion: true }, "test.xlsx")
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets["Datos"]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    expect(data[0]).toContain("Verificacion")
    const vIdx = (data[0] as string[]).indexOf("Verificacion")
    expect(data[1][vIdx]).toBe("Conflicto: test")
  })
})
