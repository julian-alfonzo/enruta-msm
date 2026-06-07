import { sql } from "@/lib/db"

async function createObservacionesTable() {
  console.log("Creating observaciones table...")

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS observaciones (
        id SERIAL PRIMARY KEY,
        agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('FALTA', 'RECLAMO', 'NOVEDAD')),
        descripcion TEXT NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO')),
        fecha TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log("✓ Table 'observaciones' created successfully")

    await sql`CREATE INDEX IF NOT EXISTS idx_observaciones_agente_id ON observaciones(agente_id)`
    console.log("✓ Index 'idx_observaciones_agente_id' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_observaciones_tipo ON observaciones(tipo)`
    console.log("✓ Index 'idx_observaciones_tipo' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_observaciones_estado ON observaciones(estado)`
    console.log("✓ Index 'idx_observaciones_estado' created")

    await sql`CREATE INDEX IF NOT EXISTS idx_observaciones_fecha ON observaciones(fecha)`
    console.log("✓ Index 'idx_observaciones_fecha' created")

    console.log("\n✓ Migration completed successfully!")
  } catch (error) {
    console.error("✗ Error creating table:", error)
    throw error
  }
}

createObservacionesTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))