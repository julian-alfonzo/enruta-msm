import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(process.env.DATABASE_URL)
}

async function exec(text: string) {
  await getDb().query(text, [])
}

const AGENTES_CSV = "/Users/julianalfonzo/Documents/General/Proyectos/EnRuta/EnRuta-Flutter/enruta/assets/data/agentes.csv"

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cell += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") { row.push(cell); cell = "" }
      else if (c === "\n" || c === "\r") {
        if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = "" }
        if (c === "\r" && content[i + 1] === "\n") i++
      } else cell += c
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

async function dropAndCreate() {
  console.log("→ DROP + CREATE schema")

  // API.md whitelist: solo estas 3 tablas pueden existir
  const ALLOWED = new Set(["agentes", "controles_alcoholemia", "observaciones_reclamos"])
  const existing = (await getDb().query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  )) as Array<{ table_name: string }>
  for (const { table_name } of existing) {
    if (!ALLOWED.has(table_name)) {
      await exec(`DROP TABLE IF EXISTS "${table_name}" CASCADE`)
      console.log(`  - drop: ${table_name} (no está en API.md)`)
    }
  }

  // Drop our 3 tables too (will be recreated)
  for (const t of ALLOWED) {
    await exec(`DROP TABLE IF EXISTS "${t}" CASCADE`)
  }
  console.log("  ✓ tablas dropeadas")

  await exec(`
    CREATE TABLE agentes (
      id SERIAL PRIMARY KEY,
      legajo VARCHAR(20) UNIQUE NOT NULL,
      apellido_nombre VARCHAR(200) NOT NULL,
      fecha_ingreso VARCHAR(10),
      dependencia VARCHAR(200),
      cargo VARCHAR(200),
      turno VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ NULL
    )
  `)
  await exec(`
    CREATE TABLE controles_alcoholemia (
      id SERIAL PRIMARY KEY,
      agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE RESTRICT,
      fecha DATE NOT NULL,
      resultado VARCHAR(20) NOT NULL,
      graduacion NUMERIC(4,2),
      servicio_extra VARCHAR(50),
      observacion TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await exec(`
    CREATE TABLE observaciones_reclamos (
      id SERIAL PRIMARY KEY,
      agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE RESTRICT,
      tipo VARCHAR(50) NOT NULL,
      descripcion TEXT NOT NULL,
      fecha DATE NOT NULL,
      resuelto BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log("  ✓ tablas creadas con schema API.md")

  await exec(`CREATE INDEX idx_agentes_apellido_nombre ON agentes(apellido_nombre)`)
  await exec(`CREATE INDEX idx_agentes_dependencia ON agentes(dependencia)`)
  await exec(`CREATE INDEX idx_agentes_deleted_at ON agentes(deleted_at) WHERE deleted_at IS NULL`)
  await exec(`CREATE INDEX idx_controles_agente_fecha ON controles_alcoholemia(agente_id, fecha)`)
  await exec(`CREATE INDEX idx_controles_fecha ON controles_alcoholemia(fecha)`)
  await exec(`CREATE INDEX idx_observaciones_agente ON observaciones_reclamos(agente_id)`)
  console.log("  ✓ índices creados")
}

async function importAgentes() {
  console.log("\n→ Importando agentes desde Flutter CSV")
  const raw = readFileSync(AGENTES_CSV, "utf8")
  const rows = parseCsv(raw)
  const [, header, ...data] = rows
  console.log(`  Columnas: ${header.join(", ")}`)

  const db = getDb()
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

    if (!legajo || !apellidoNombre) { skipped++; continue }
    if (seen.has(legajo)) { skipped++; continue }
    seen.add(legajo)

    try {
      await db.query(
        `INSERT INTO agentes (legajo, apellido_nombre, fecha_ingreso, dependencia, cargo, turno)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (legajo) DO UPDATE SET
           apellido_nombre = EXCLUDED.apellido_nombre,
           fecha_ingreso = EXCLUDED.fecha_ingreso,
           dependencia = EXCLUDED.dependencia,
           cargo = EXCLUDED.cargo,
           turno = EXCLUDED.turno,
           updated_at = NOW()`,
        [legajo, apellidoNombre, fechaIngreso || null, dependencia || null, cargo || null, turno || null],
      )
      inserted++
    } catch (e: any) {
      console.log(`  ✗ ${legajo}: ${e.message}`)
      skipped++
    }
  }

  console.log(`  ✓ Insertados/actualizados: ${inserted}, omitidos: ${skipped}`)
}

async function main() {
  console.log("=== RESET: drop + recreate + import ===\n")
  await dropAndCreate()
  await importAgentes()
  console.log("\n✓ Listo")
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("✗ Error:", e); process.exit(1) })
