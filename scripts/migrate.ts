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

async function columnInfo(
  table: string,
  column: string,
): Promise<{ data_type: string; is_nullable: string; column_default: string | null } | null> {
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

async function fkConstraint(table: string, column: string): Promise<string | null> {
  const db = getDb()
  const rows = (await db.query(
    `SELECT constraint_name FROM information_schema.key_column_usage
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column],
  )) as Array<{ constraint_name: string }>
  return rows[0]?.constraint_name ?? null
}

async function exec(sqlText: string) {
  const db = getDb()
  await db.query(sqlText, [])
}

function isTargetType(current: string, target: string): boolean {
  const norm = (s: string) => s.replace(/\s*with time zone$/, "").replace(/^character varying$/, "text")
  return norm(current) === norm(target)
}

async function alignAgentes() {
  console.log("\n→ agentes: alineando con API.md")

  // legajo text → varchar(20)
  let info = await columnInfo("agentes", "legajo")
  if (info && !isTargetType(info.data_type, "varchar(20)")) {
    await exec(`ALTER TABLE agentes ALTER COLUMN legajo TYPE VARCHAR(20) USING legajo::VARCHAR(20)`)
    console.log("  · legajo: text → varchar(20)")
  }

  // apellido_nombre text → varchar(200)
  info = await columnInfo("agentes", "apellido_nombre")
  if (info && !isTargetType(info.data_type, "varchar(200)")) {
    await exec(`ALTER TABLE agentes ALTER COLUMN apellido_nombre TYPE VARCHAR(200) USING apellido_nombre::VARCHAR(200)`)
    console.log("  · apellido_nombre: text → varchar(200)")
  }

  // fecha_ingreso text → varchar(10)
  info = await columnInfo("agentes", "fecha_ingreso")
  if (info && !isTargetType(info.data_type, "varchar(10)")) {
    await exec(`ALTER TABLE agentes ALTER COLUMN fecha_ingreso TYPE VARCHAR(10) USING fecha_ingreso::VARCHAR(10)`)
    console.log("  · fecha_ingreso: text → varchar(10)")
  }

  // dependencia text → varchar(200)
  info = await columnInfo("agentes", "dependencia")
  if (info && !isTargetType(info.data_type, "varchar(200)")) {
    await exec(`ALTER TABLE agentes ALTER COLUMN dependencia TYPE VARCHAR(200) USING dependencia::VARCHAR(200)`)
    console.log("  · dependencia: text → varchar(200)")
  }

  // cargo text → varchar(200)
  info = await columnInfo("agentes", "cargo")
  if (info && !isTargetType(info.data_type, "varchar(200)")) {
    await exec(`ALTER TABLE agentes ALTER COLUMN cargo TYPE VARCHAR(200) USING cargo::VARCHAR(200)`)
    console.log("  · cargo: text → varchar(200)")
  }

  // turno varchar(100) → varchar(50)
  info = await columnInfo("agentes", "turno")
  if (info && info.data_type === "character varying" && !info.column_default) {
    await exec(`ALTER TABLE agentes ALTER COLUMN turno TYPE VARCHAR(50)`)
    console.log("  · turno: varchar(100) → varchar(50)")
  }

  // created_at text → timestamptz NOT NULL DEFAULT NOW()
  info = await columnInfo("agentes", "created_at")
  if (info) {
    const isTarget = isTargetType(info.data_type, "timestamp with time zone")
    if (!isTarget) {
      await exec(
        `ALTER TABLE agentes ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ`,
      )
      console.log("  · created_at: text → timestamptz")
    }
    if (info.column_default === null) {
      await exec(`ALTER TABLE agentes ALTER COLUMN created_at SET DEFAULT NOW()`)
      console.log("  · created_at: set default NOW()")
    }
    if (info.is_nullable === "YES") {
      await exec(
        `UPDATE agentes SET created_at = NOW() WHERE created_at IS NULL`,
      )
      await exec(`ALTER TABLE agentes ALTER COLUMN created_at SET NOT NULL`)
      console.log("  · created_at: set NOT NULL")
    }
  }

  // updated_at text → timestamptz NOT NULL DEFAULT NOW()
  info = await columnInfo("agentes", "updated_at")
  if (info) {
    const isTarget = isTargetType(info.data_type, "timestamp with time zone")
    if (!isTarget) {
      await exec(
        `ALTER TABLE agentes ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::TIMESTAMPTZ`,
      )
      console.log("  · updated_at: text → timestamptz")
    }
    if (info.column_default === null) {
      await exec(`ALTER TABLE agentes ALTER COLUMN updated_at SET DEFAULT NOW()`)
      console.log("  · updated_at: set default NOW()")
    }
    if (info.is_nullable === "YES") {
      await exec(
        `UPDATE agentes SET updated_at = NOW() WHERE updated_at IS NULL`,
      )
      await exec(`ALTER TABLE agentes ALTER COLUMN updated_at SET NOT NULL`)
      console.log("  · updated_at: set NOT NULL")
    }
  }

  // ADD deleted_at TIMESTAMPTZ NULL
  if (!(await columnExists("agentes", "deleted_at"))) {
    await exec(`ALTER TABLE agentes ADD COLUMN deleted_at TIMESTAMPTZ NULL`)
    console.log("  + deleted_at: timestamptz NULL")
  }

  // índices
  if (!(await indexExists("idx_agentes_apellido_nombre"))) {
    await exec(`CREATE INDEX idx_agentes_apellido_nombre ON agentes(apellido_nombre)`)
    console.log("  + idx_agentes_apellido_nombre")
  }
  if (!(await indexExists("idx_agentes_dependencia"))) {
    await exec(`CREATE INDEX idx_agentes_dependencia ON agentes(dependencia)`)
    console.log("  + idx_agentes_dependencia")
  }
  if (!(await indexExists("idx_agentes_deleted_at"))) {
    await exec(`CREATE INDEX idx_agentes_deleted_at ON agentes(deleted_at) WHERE deleted_at IS NULL`)
    console.log("  + idx_agentes_deleted_at (parcial)")
  }
}

async function alignControles() {
  console.log("\n→ controles_alcoholemia: alineando con API.md")

  // fecha text → date NOT NULL
  let info = await columnInfo("controles_alcoholemia", "fecha")
  if (info && info.data_type !== "date") {
    await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN fecha TYPE DATE USING fecha::DATE`)
    console.log("  · fecha: text → date")
  }

  // graduacion double precision → numeric(4,2)
  info = await columnInfo("controles_alcoholemia", "graduacion")
  if (info && info.data_type === "double precision") {
    await exec(
      `ALTER TABLE controles_alcoholemia ALTER COLUMN graduacion TYPE NUMERIC(4,2) USING graduacion::NUMERIC(4,2)`,
    )
    console.log("  · graduacion: double precision → numeric(4,2)")
  }

  // servicio_extra text → varchar(50)
  info = await columnInfo("controles_alcoholemia", "servicio_extra")
  if (info && info.data_type === "text") {
    await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN servicio_extra TYPE VARCHAR(50)`)
    console.log("  · servicio_extra: text → varchar(50)")
  }

  // created_at text → timestamptz NOT NULL DEFAULT NOW()
  info = await columnInfo("controles_alcoholemia", "created_at")
  if (info) {
    const isTarget = isTargetType(info.data_type, "timestamp with time zone")
    if (!isTarget) {
      await exec(
        `ALTER TABLE controles_alcoholemia ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ`,
      )
      console.log("  · created_at: text → timestamptz")
    }
    if (info.column_default === null) {
      await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN created_at SET DEFAULT NOW()`)
      console.log("  · created_at: set default NOW()")
    }
    if (info.is_nullable === "YES") {
      await exec(
        `UPDATE controles_alcoholemia SET created_at = NOW() WHERE created_at IS NULL`,
      )
      await exec(`ALTER TABLE controles_alcoholemia ALTER COLUMN created_at SET NOT NULL`)
      console.log("  · created_at: set NOT NULL")
    }
  }

  // Convertir valores de resultado a formato API.md
  await exec(
    `UPDATE controles_alcoholemia SET resultado = 'Positivo' WHERE resultado = 'POSITIVO'`,
  )
  await exec(
    `UPDATE controles_alcoholemia SET resultado = 'Negativo' WHERE resultado = 'NEGATIVO'`,
  )

  // FK: CASCADE → RESTRICT
  const fk = await fkConstraint("controles_alcoholemia", "agente_id")
  if (fk) {
    await exec(`ALTER TABLE controles_alcoholemia DROP CONSTRAINT ${fk}`)
    console.log(`  · FK ${fk}: dropped`)
  }
  await exec(
    `ALTER TABLE controles_alcoholemia ADD CONSTRAINT controles_alcoholemia_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE RESTRICT`,
  )
  console.log("  · FK: ON DELETE RESTRICT")

  if (!(await indexExists("idx_controles_fecha"))) {
    await exec(`CREATE INDEX idx_controles_fecha ON controles_alcoholemia(fecha)`)
    console.log("  + idx_controles_fecha")
  }
}

async function alignObservaciones() {
  console.log("\n→ observaciones_reclamos: alineando con API.md")

  // fecha text → date NOT NULL
  let info = await columnInfo("observaciones_reclamos", "fecha")
  if (info && info.data_type !== "date") {
    await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN fecha TYPE DATE USING fecha::DATE`)
    console.log("  · fecha: text → date")
  }

  // tipo varchar(20) → varchar(50)
  info = await columnInfo("observaciones_reclamos", "tipo")
  if (info && info.data_type === "character varying") {
    await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN tipo TYPE VARCHAR(50)`)
    console.log("  · tipo: varchar(20) → varchar(50)")
  }

  // created_at text → timestamptz NOT NULL DEFAULT NOW()
  info = await columnInfo("observaciones_reclamos", "created_at")
  if (info) {
    const isTarget = isTargetType(info.data_type, "timestamp with time zone")
    if (!isTarget) {
      await exec(
        `ALTER TABLE observaciones_reclamos ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ`,
      )
      console.log("  · created_at: text → timestamptz")
    }
    if (info.column_default === null) {
      await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN created_at SET DEFAULT NOW()`)
      console.log("  · created_at: set default NOW()")
    }
    if (info.is_nullable === "YES") {
      await exec(
        `UPDATE observaciones_reclamos SET created_at = NOW() WHERE created_at IS NULL`,
      )
      await exec(`ALTER TABLE observaciones_reclamos ALTER COLUMN created_at SET NOT NULL`)
      console.log("  · created_at: set NOT NULL")
    }
  }

  // Convertir valores de tipo a formato API.md
  await exec(`UPDATE observaciones_reclamos SET tipo = 'Observación' WHERE tipo = 'FALTA'`)
  await exec(`UPDATE observaciones_reclamos SET tipo = 'Reclamo' WHERE tipo = 'RECLAMO'`)
  await exec(`UPDATE observaciones_reclamos SET tipo = 'Observación' WHERE tipo = 'NOVEDAD'`)

  // FK: CASCADE → RESTRICT
  const fk = await fkConstraint("observaciones_reclamos", "agente_id")
  if (fk) {
    await exec(`ALTER TABLE observaciones_reclamos DROP CONSTRAINT ${fk}`)
    console.log(`  · FK ${fk}: dropped`)
  }
  await exec(
    `ALTER TABLE observaciones_reclamos ADD CONSTRAINT observaciones_reclamos_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE RESTRICT`,
  )
  console.log("  · FK: ON DELETE RESTRICT")
}

async function main() {
  console.log("=== Migración al esquema API.md (Postgres) ===\n")
  if (!(await tableExists("agentes"))) {
    console.log("✗ No existe la tabla 'agentes'. Corré primero la migración inicial.")
    process.exit(1)
  }
  await alignAgentes()
  await alignControles()
  await alignObservaciones()
  console.log("\n✓ Migración completada")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e)
    process.exit(1)
  })
