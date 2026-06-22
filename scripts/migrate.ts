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

async function columnExists(table: string, column: string): Promise<boolean> {
  const db = getDb()
  const rows = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  )
  return rows.length > 0
}

async function exec(sqlText: string) {
  const db = getDb()
  await db.query(sqlText, [])
}

async function migrateAgentes() {
  const exists = await tableExists("agentes")
  if (!exists) {
    console.log("✓ agentes: no existe, se crea desde cero")
    await exec(`
      CREATE TABLE agentes (
        id SERIAL PRIMARY KEY,
        legajo VARCHAR(50) UNIQUE NOT NULL,
        apellido_nombre VARCHAR(255) NOT NULL,
        fecha_ingreso TEXT,
        dependencia VARCHAR(255),
        cargo VARCHAR(255),
        turno VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    return
  }

  if (!(await columnExists("agentes", "turno"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN turno VARCHAR(100)`)
    console.log("  + turno")
  }
  if (!(await columnExists("agentes", "updated_at"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
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
  if (!(await columnExists("agentes", "turno"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN turno VARCHAR(100)`)
    console.log("  + turno")
  }
  if (!(await columnExists("agentes", "updated_at"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
    console.log("  + updated_at")
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
        fecha TIMESTAMP NOT NULL,
        resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('POSITIVO', 'NEGATIVO')),
        graduacion DECIMAL(4,2),
        servicio_extra VARCHAR(255),
        observacion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FALTA', 'RECLAMO', 'NOVEDAD')),
        descripcion TEXT NOT NULL,
        fecha TIMESTAMP NOT NULL,
        resuelto BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
}

async function ensureAgentesBase() {
  if (!(await tableExists("agentes"))) {
    await exec(`
      CREATE TABLE agentes (
        id SERIAL PRIMARY KEY,
        legajo VARCHAR(50) UNIQUE NOT NULL,
        apellido_nombre VARCHAR(255) NOT NULL,
        fecha_ingreso TEXT,
        dependencia VARCHAR(255),
        cargo VARCHAR(255),
        turno VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

async function main() {
  console.log("=== Migración al modelo Flutter EnRuta ===\n")
  await ensureAgentesBase()
  await migrateAgentes()
  await migrateControlesAlcoholemia()
  await migrateObservacionesReclamos()
  await createIndexes()
  console.log("\n✓ Migración completada")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
