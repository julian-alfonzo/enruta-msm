import * as XLSX from "xlsx"
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs"
import { resolve, dirname, basename } from "path"
import { rawQuery } from "../lib/db"

// ─── Configuración ───
const FLUTTER_PROJECT =
  "/Users/julianalfonzo/Documents/General/Proyectos/EnRuta/EnRuta-Flutter/enruta"
const FLUTTER_CSV = resolve(FLUTTER_PROJECT, "assets/data/agentes.csv")
const FLUTTER_SCRIPTS = resolve(FLUTTER_PROJECT, "base-datos/scripts/agentes")
const FLUTTER_SCRIPTS_CSV = resolve(FLUTTER_SCRIPTS, "agentes.csv")
const FLUTTER_EXCEL_DIR = resolve(FLUTTER_PROJECT, "base-datos/scripts")

const BATCH_SIZE = 200

// ─── Helpers ───

function parseExcelDate(value: unknown): string | null {
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split("T")[0]
  }
  if (typeof value === "string" && value.includes("/")) {
    const [day, month, year] = value.split("/")
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  if (typeof value === "string") return value || null
  return null
}

function toFlutterDate(value: unknown): string {
  const iso = parseExcelDate(value)
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

interface Row {
  legajo: string
  apellidoNombre: string
  fechaIngreso: string | null
  dependencia: string
  cargo: string
  turno: string
}

// ─── Lectura del Excel ───

function readExcel(path: string): Row[] {
  console.log(`Leyendo Excel: ${path}`)
  if (!existsSync(path)) {
    console.error(`El archivo no existe: ${path}`)
    process.exit(1)
  }

  const workbook = XLSX.readFile(path)
  const sheet = workbook.Sheets["ACTIVOS"]
  if (!sheet) {
    console.error('La hoja "ACTIVOS" no existe en el archivo')
    process.exit(1)
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
  console.log(`Filas totales (incluyendo header): ${data.length}`)

  const rows: Row[] = []
  const seenLegajos = new Set<string>()
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const legajo = row[1] != null ? String(row[1]).trim() : ""
    if (!legajo) continue
    if (seenLegajos.has(legajo)) continue
    seenLegajos.add(legajo)
    rows.push({
      legajo,
      apellidoNombre: row[2] != null ? String(row[2]).trim() : "",
      fechaIngreso: parseExcelDate(row[3]),
      dependencia: row[4] != null ? String(row[4]).trim() : "",
      cargo: row[5] != null ? String(row[5]).trim() : "",
      turno: row[6] != null ? String(row[6]).trim() : "",
    })
  }

  return rows
}

// ─── Actualización DB Neon ───

async function updateDatabase(rows: Row[]) {
  console.log(`\n── Actualizando base de datos Neon ──`)
  console.log(`Agentes a procesar: ${rows.length}`)

  let total = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const values: string[] = []
    const params: any[] = []
    let idx = 1

    for (const r of batch) {
      const base = idx
      values.push(
        `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      )
      params.push(
        r.legajo,
        truncate(r.apellidoNombre, 200) || null,
        r.fechaIngreso || null,
        truncate(r.dependencia, 200) || null,
        truncate(r.cargo, 200) || null,
        truncate(r.turno, 50) || null,
      )
      idx += 6
    }

    const query = `
      INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
      VALUES ${values.join(", ")}
      ON CONFLICT (legajo) DO UPDATE SET
        apellido_nombre = EXCLUDED.apellido_nombre,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        dependencia = EXCLUDED.dependencia,
        cargo = EXCLUDED.cargo,
        turno = EXCLUDED.turno,
        updated_at = CURRENT_TIMESTAMP
    `

    try {
      await rawQuery(query, params)
      total += batch.length
      console.log(`  Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} procesados (${total}/${rows.length})`)
    } catch (e: any) {
      console.log(`  ✗ Error en lote: ${e.message}`)
    }
  }

  console.log(`  DB: ${total} agentes insertados/actualizados`)
}

// ─── Exportación CSV para Flutter ───

function exportFlutterCSV(rows: Row[], excelData: unknown[][]) {
  console.log(`\n── Exportando CSV para Flutter ──`)

  const header = "LEGAJO,APELLIDO Y NOMBRES,F. INGRESO,DEPENDENCIA,CARGO,TURNO"
  const csvRows = rows.map((r) => {
    const ingreso = toFlutterDate(
      excelData.find((row) => row[1] != null && String(row[1]).trim() === r.legajo)?.[3],
    )
    return [
      r.legajo,
      csvEscape(r.apellidoNombre),
      ingreso,
      csvEscape(r.dependencia),
      csvEscape(r.cargo),
      csvEscape(r.turno),
    ].join(",")
  })

  const csv = [header, ...csvRows].join("\n") + "\n"

  mkdirSync(dirname(FLUTTER_CSV), { recursive: true })
  writeFileSync(FLUTTER_CSV, csv, "utf8")
  console.log(`  ${FLUTTER_CSV}`)

  mkdirSync(FLUTTER_SCRIPTS, { recursive: true })
  writeFileSync(FLUTTER_SCRIPTS_CSV, csv, "utf8")
  console.log(`  ${FLUTTER_SCRIPTS_CSV}`)

  console.log(`  Flutter CSV: ${rows.length} agentes exportados`)
}

// ─── Copia del Excel al proyecto Flutter ───

function copyExcelToFlutter(excelPath: string) {
  console.log(`\n── Copiando Excel al proyecto Flutter ──`)
  const dest = resolve(FLUTTER_EXCEL_DIR, basename(excelPath))
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(excelPath, dest)
  console.log(`  ${dest}`)
}

// ─── Main ───

async function main() {
  const excelPath =
    process.argv[2] ||
    "/Users/julianalfonzo/Downloads/1 - PERSONAL ACTIVO - MAYO.xlsx"

  const data = XLSX.readFile(excelPath)
  const sheet = data.Sheets["ACTIVOS"]
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

  const rows = readExcel(excelPath)

  // 1. Base de datos
  await updateDatabase(rows)

  // 2. CSV Flutter
  exportFlutterCSV(rows, rawData)

  // 3. Copiar Excel al proyecto Flutter
  copyExcelToFlutter(excelPath)

  console.log(`\n=== Actualización completa: ${rows.length} agentes ===`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
