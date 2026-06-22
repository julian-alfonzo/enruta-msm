import { sql } from "../lib/db.ts"
import { readFileSync } from "fs"

const AGENTES_CSV = "/Users/julianalfonzo/Documents/General/Proyectos/EnRuta/EnRuta-Flutter/enruta/assets/data/agentes.csv"

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        row.push(cell)
        cell = ""
      } else if (c === "\n" || c === "\r") {
        if (cell !== "" || row.length > 0) {
          row.push(cell)
          rows.push(row)
          row = []
          cell = ""
        }
        if (c === "\r" && content[i + 1] === "\n") i++
      } else {
        cell += c
      }
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

async function importAgentes() {
  console.log("=== Importando agentes desde Flutter CSV ===")
  const raw = readFileSync(AGENTES_CSV, "utf8")
  const rows = parseCsv(raw)
  const [, header, ...data] = rows
  console.log(`Columnas: ${header.join(", ")}`)

  const seen = new Set<string>()
  let inserted = 0
  let skipped = 0

  for (const r of data) {
    const legajo = (r[0] ?? "").trim()
    const apellidoNombre = (r[1] ?? "").trim()
    const fechaIngreso = (r[2] ?? "").trim()
    const dependencia = (r[3] ?? "").trim()
    const cargo = (r[4] ?? "").trim()
    const turno = (r[5] ?? "").trim()

    if (!legajo || !apellidoNombre) {
      skipped++
      continue
    }
    if (seen.has(legajo)) {
      skipped++
      continue
    }
    seen.add(legajo)

    try {
      await sql`
        INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
        VALUES (${legajo}, ${apellidoNombre}, ${fechaIngreso || null}, ${dependencia || null}, ${cargo || null}, ${turno || null})
        ON CONFLICT (legajo) DO UPDATE SET
          apellido_nombre = EXCLUDED.apellido_nombre,
          fecha_ingreso = EXCLUDED.fecha_ingreso,
          dependencia = EXCLUDED.dependencia,
          cargo = EXCLUDED.cargo,
          turno = EXCLUDED.turno,
          updated_at = CURRENT_TIMESTAMP
      `
      inserted++
    } catch (e: any) {
      console.log(`  ✗ ${legajo}: ${e.message}`)
      skipped++
    }
  }

  console.log(`✓ Insertados/actualizados: ${inserted}, omitidos: ${skipped}`)
}

async function main() {
  await importAgentes()
  console.log("\n=== Listo ===")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
