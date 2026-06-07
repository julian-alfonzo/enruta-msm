import { sql } from "@/lib/db"

async function migrateAlcoholemiaTable() {
  console.log("Migrating alcoholemia_controles table...")

  try {
    await sql`
      ALTER TABLE alcoholemia_controles
      ADD COLUMN IF NOT EXISTS turno VARCHAR(20),
      ADD COLUMN IF NOT EXISTS quien_testea VARCHAR(100),
      ADD COLUMN IF NOT EXISTS legajo VARCHAR(20)
    `
    console.log("✓ Columns 'turno', 'quien_testea', 'legajo' added/verified")
    console.log("\n✓ Migration completed successfully!")
  } catch (error) {
    console.error("✗ Error migrating table:", error)
    throw error
  }
}

migrateAlcoholemiaTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
