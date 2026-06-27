import * as XLSX from "xlsx"
import { rawQuery } from "../lib/db"

const EXCEL_PATH =
  "/Users/julianalfonzo/Downloads/1 - PERSONAL ACTIVO - MAYO.xlsx"

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

const BATCH_SIZE = 200

async function importActivos() {
  console.log("Leyendo Excel:", EXCEL_PATH)
  const workbook = XLSX.readFile(EXCEL_PATH)
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

  console.log(`\n=== Listo: ${total} agentes procesados ===`)
}

importActivos()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
