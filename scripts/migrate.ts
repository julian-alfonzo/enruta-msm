import { neon } from "@neondatabase/serverless"

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(process.env.DATABASE_URL)
}

async function tableExists(name: string): Promise<boolean> {
  const db = getDb()
  const rows = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [name],
  )
  return rows.length > 0
}

async function columnInfo(table: string, column: string): Promise<{ data_type: string; is_nullable: string; column_default: string | null } | null> {
  const db = getDb()
  const rows = (await db.query(
    `SELECT data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  )) as Array<{ data_type: string; is_nullable: string; column_default: string | null }>
  return rows[0] ?? null
}

async function columnExists(table: string, column: string): Promise<boolean> {
  return (await columnInfo(table, column)) !== null
}

async function indexExists(name: string): Promise<boolean> {
  const db = getDb()
  const rows = await db.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1 LIMIT 1`,
    [name],
  )
  return rows.length > 0
}

async function exec(sqlText: string) {
  const db = getDb()
  await db.query(sqlText, [])
}

function fmtTsTz(): string {
  return `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`
}

function fmtTs(): string {
  return `'YYYY-MM-DD"T"HH24:MI:SS'`
}

async function migrateAgentes() {
  const exists = await tableExists("agentes")
  if (!exists) {
    console.log("✓ agentes: no existe, se crea desde cero")
    await exec(`
      CREATE TABLE agentes (
        id SERIAL PRIMARY KEY,
        legajo TEXT UNIQUE NOT NULL,
        apellido_nombre TEXT NOT NULL,
        fecha_ingreso TEXT,
        dependencia TEXT,
        cargo TEXT,
        turno TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `)
    return
  }

  if (!(await columnExists("agentes", "turno"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN turno TEXT`)
    console.log("  + turno")
  }
  if (!(await columnExists("agentes", "updated_at"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN updated_at TEXT`)
    console.log("  + updated_at")
  }

  if (await columnExists("agentes", "apellido_nombre")) {
    console.log("= agentes: ya migrada")
    return
  }

  console.log("→ agentes: migrando columnas legacy → modelo Flutter")

  if (await columnExists("agentes", "nombre")) {
    await exec(`ALTER TABLE agentes RENAME COLUMN nombre TO apellido_nombre`)
    console.log("  · nombre → apellido_nombre")
  }
  if (!(await columnExists("agentes", "fecha_ingreso"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN fecha_ingreso TEXT`)
    console.log("  + fecha_ingreso")
  }

  for (const col of ["dni", "telefono", "tipo", "activo", "en_servicio", "horas_mensuales", "horas_extra"]) {
    if (await columnExists("agentes", col)) {
      await exec(`ALTER TABLE agentes DROP COLUMN ${col}`)
      console.log(`  - ${col}`)
    }
  }
}

async function migrateControlesAlcoholemia() {
  if (await tableExists("controles_alcoholemia")) {
    console.log("= controles_alcoholemia: ya existe")
    return
  }

  if (await tableExists("alcoholemia_controles")) {
    console.log("→ controles_alcoholemia: renombrando desde alcoholemia_controles")
    await exec(`ALTER TABLE alcoholemia_controles RENAME TO controles_alcoholemia`)
  } else {
    console.log("✓ controles_alcoholemia: no existe, se crea desde cero")
    await exec(`
      CREATE TABLE controles_alcoholemia (
        id SERIAL PRIMARY KEY,
        agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
        fecha TEXT NOT NULL,
        resultado TEXT NOT NULL,
        graduacion REAL,
        servicio_extra TEXT,
        observacion TEXT,
        created_at TEXT
      )
    `)
    return
  }

  if (await columnExists("controles_alcoholemia", "valor")) {
    await exec(`ALTER TABLE controles_alcoholemia RENAME COLUMN valor TO graduacion`)
    console.log("  · valor → graduacion")
  }
  if (await columnExists("controles_alcoholemia", "tipo_servicio")) {
    await exec(`ALTER TABLE controles_alcoholemia RENAME COLUMN tipo_servicio TO servicio_extra`)
    console.log("  · tipo_servicio → servicio_extra")
  }
  if (await columnExists("controles_alcoholemia", "observaciones")) {
    await exec(`ALTER TABLE controles_alcoholemia RENAME COLUMN observaciones TO observacion`)
    console.log("  · observaciones → observacion")
  }
  if (await columnExists("controles_alcoholemia", "fecha_control")) {
    await exec(`ALTER TABLE controles_alcoholemia RENAME COLUMN fecha_control TO fecha`)
    console.log("  · fecha_control → fecha")
  }

  for (const col of ["turno", "quien_testea", "legajo"]) {
    if (await columnExists("controles_alcoholemia", col)) {
      await exec(`ALTER TABLE controles_alcoholemia DROP COLUMN ${col}`)
      console.log(`  - ${col}`)
    }
  }
}

async function migrateObservacionesReclamos() {
  if (await tableExists("observaciones_reclamos")) {
    console.log("= observaciones_reclamos: ya existe")
    return
  }

  if (await tableExists("observaciones")) {
    console.log("→ observaciones_reclamos: transformando desde observaciones")

    if (await columnExists("observaciones", "estado")) {
      await exec(`ALTER TABLE observaciones ADD COLUMN resuelto BOOLEAN`)
      await exec(`UPDATE observaciones SET resuelto = (estado = 'CERRADO')`)
      await exec(`ALTER TABLE observaciones ALTER COLUMN resuelto SET DEFAULT FALSE`)
      await exec(`ALTER TABLE observaciones ALTER COLUMN resuelto SET NOT NULL`)
      await exec(`ALTER TABLE observaciones DROP COLUMN estado`)
      console.log("  · estado (ABIERTO/CERRADO) → resuelto (BOOLEAN)")
    }

    await exec(`ALTER TABLE observaciones RENAME TO observaciones_reclamos`)
    console.log("  · observaciones → observaciones_reclamos")
  } else {
    console.log("✓ observaciones_reclamos: no existe, se crea desde cero")
    await exec(`
      CREATE TABLE observaciones_reclamos (
        id SERIAL PRIMARY KEY,
        agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        fecha TEXT NOT NULL,
        resuelto BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT
      )
    `)
  }
}

async function ensureAgentesBase() {
  if (!(await tableExists("agentes"))) {
    await exec(`
      CREATE TABLE agentes (
        id SERIAL PRIMARY KEY,
        legajo TEXT UNIQUE NOT NULL,
        apellido_nombre TEXT NOT NULL,
        fecha_ingreso TEXT,
        dependencia TEXT,
        cargo TEXT,
        turno TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `)
  }
}

async function createIndexes() {
  await exec(`CREATE INDEX IF NOT EXISTS idx_controles_agente_fecha ON controles_alcoholemia(agente_id, fecha)`)
  console.log("✓ index idx_controles_agente_fecha")
  await exec(`CREATE INDEX IF NOT EXISTS idx_observaciones_agente ON observaciones_reclamos(agente_id)`)
  console.log("✓ index idx_observaciones_agente")
}

// --- Alineación estricta con modelo Flutter ---

async function alignAgentes() {
  console.log("\n→ agentes: alineando con modelo Flutter")
  const cols = [
    { name: "created_at", fmt: fmtTsTz() },
    { name: "updated_at", fmt: fmtTs() },
  ]
  for (const c of cols) {
    const info = await columnInfo("agentes", c.name)
    if (!info) continue
    if (info.data_type === "text" && info.column_default === null) continue

    if (info.column_default !== null) {
      await exec(`ALTER TABLE agentes ALTER COLUMN ${c.name} DROP DEFAULT`)
      console.log(`  · ${c.name}: drop default`)
    }
    if (info.data_type !== "text") {
      const colExpr = info.data_type.includes("time zone")
        ? `to_char(${c.name} AT TIME ZONE 'UTC', ${c.fmt})`
        : `to_char(${c.name}, ${c.fmt})`
      await exec(`ALTER TABLE agentes ALTER COLUMN ${c.name} TYPE TEXT USING (${colExpr})`)
      console.log(`  · ${c.name}: ${info.data_type} → text`)
    }
  }
}

async function alignControles() {
  console.log("\n→ controles_alcoholemia: alineando con modelo Flutter")

  for (const c of [
    { name: "created_at", fmt: fmtTsTz() },
    { name: "fecha", fmt: fmtTsTz() },
  ]) {
    const info = await columnInfo("controles_alcoholemia", c.name)
    if (!info) continue
    if (info.data_type === "text" && info.column_default === null && (c.name !== "fecha" || info.is_nullable === "NO")) {
      continue
    }
    if (info.column_default !== null) {
      await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN ${c.name} DROP DEFAULT`)
      console.log(`  · ${c.name}: drop default`)
    }
    if (info.data_type !== "text") {
      const colExpr = info.data_type.includes("time zone")
        ? `to_char(${c.name} AT TIME ZONE 'UTC', ${c.fmt})`
        : `to_char(${c.name}, ${c.fmt})`
      await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN ${c.name} TYPE TEXT USING (${colExpr})`)
      console.log(`  · ${c.name}: ${info.data_type} → text`)
    }
  }

  const fechaInfo = await columnInfo("controles_alcoholemia", "fecha")
  if (fechaInfo && fechaInfo.is_nullable === "YES") {
    const nullCount = await getDb().query(`SELECT COUNT(*)::int AS n FROM controles_alcoholemia WHERE fecha IS NULL`)
    if (nullCount[0].n > 0) {
      await exec(`UPDATE controles_alcoholemia SET fecha = to_char(now() AT TIME ZONE 'UTC', ${fmtTsTz()}) WHERE fecha IS NULL`)
      console.log(`  · fecha: rellenó ${nullCount[0].n} filas NULL`)
    }
    await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN fecha SET NOT NULL`)
    console.log("  · fecha: SET NOT NULL")
  }

  const graduacion = await columnInfo("controles_alcoholemia", "graduacion")
  if (graduacion && graduacion.data_type === "numeric") {
    await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN graduacion TYPE DOUBLE PRECISION USING graduacion::DOUBLE PRECISION`)
    console.log("  · graduacion: numeric → double precision")
  }

  const servicioExtra = await columnInfo("controles_alcoholemia", "servicio_extra")
  if (servicioExtra && servicioExtra.column_default !== null) {
    await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN servicio_extra DROP DEFAULT`)
    console.log("  · servicio_extra: drop default")
  }
}

async function alignObservaciones() {
  console.log("\n→ observaciones_reclamos: alineando con modelo Flutter")
  for (const c of [
    { name: "fecha", fmt: fmtTs() },
    { name: "created_at", fmt: fmtTs() },
  ]) {
    const info = await columnInfo("observaciones_reclamos", c.name)
    if (!info) continue
    if (info.data_type === "text" && info.column_default === null) continue
    if (info.column_default !== null) {
      await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN ${c.name} DROP DEFAULT`)
      console.log(`  · ${c.name}: drop default`)
    }
    if (info.data_type !== "text") {
      const colExpr = info.data_type.includes("time zone")
        ? `to_char(${c.name} AT TIME ZONE 'UTC', ${c.fmt})`
        : `to_char(${c.name}, ${c.fmt})`
      await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN ${c.name} TYPE TEXT USING (${colExpr})`)
      console.log(`  · ${c.name}: ${info.data_type} → text`)
    }
  }
}

async function dropLegacyIndexes() {
  console.log("\n→ Eliminando índices legacy")
  const legacy = [
    "idx_alco_agente",
    "idx_observaciones_agente_id",
    "idx_observaciones_tipo",
    "idx_observaciones_fecha",
  ]
  for (const ix of legacy) {
    if (await indexExists(ix)) {
      await exec(`DROP INDEX ${ix}`)
      console.log(`  - ${ix}`)
    }
  }
}

async function main() {
  console.log("=== Migración al modelo Flutter EnRuta ===\n")
  await ensureAgentesBase()
  await migrateAgentes()
  await migrateControlesAlcoholemia()
  await migrateObservacionesReclamos()
  await createIndexes()

  console.log("\n=== Alineación con modelo Flutter ===")
  await alignAgentes()
  await alignControles()
  await alignObservaciones()
  await dropLegacyIndexes()

  console.log("\n✓ Migración completada")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
