import { sql } from "../lib/db"

interface ControlData {
  agente_id: number
  resultado: "POSITIVO" | "NEGATIVO"
  graduacion?: number
  servicio_extra?: string
  observacion?: string
  fecha: string
}

async function getAgenteIdByLegajo(legajo: string): Promise<number | null> {
  const result = await sql`
    SELECT id FROM agentes WHERE legajo = ${legajo} LIMIT 1
  `
  return result.length > 0 ? result[0].id : null
}

async function importControls(controls: ControlData[]) {
  const results = { imported: 0, errors: 0, details: [] as string[] }

  for (const control of controls) {
    try {
      await sql`
        INSERT INTO controles_alcoholemia (agente_id, resultado, graduacion, servicio_extra, observacion, fecha)
        VALUES (${control.agente_id}, ${control.resultado}, ${control.graduacion ?? null}, ${control.servicio_extra ?? null}, ${control.observacion ?? null}, ${control.fecha})
      `
      results.imported++
      results.details.push(`✓ Agente ${control.agente_id}: ${control.resultado}`)
    } catch (error) {
      results.errors++
      results.details.push(`✗ Error agente ${control.agente_id}: ${error}`)
    }
  }

  return results
}

async function main() {
  const fs = require("fs")
  const csvData = fs.readFileSync("alcoholemia_import.csv", "utf8")
  const lines = csvData.split("\n").filter((l: string) => l.trim())

  const controls: { legajo: string; resultado: string; fecha: string; servicio_extra: string }[] = lines
    .slice(1)
    .map((line: string) => {
      const parts = line.split(",").map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"'))
      return {
        legajo: parts[0],
        resultado: parts[7],
        fecha: parts[5],
        servicio_extra: parts[6],
      }
    })

  console.log(`Procesando ${controls.length} controles...`)

  const controlsWithIds: ControlData[] = []
  for (const control of controls) {
    const agenteId = await getAgenteIdByLegajo(control.legajo)
    if (agenteId) {
      controlsWithIds.push({
        agente_id: agenteId,
        resultado: control.resultado === "POSITIVO" ? "POSITIVO" : "NEGATIVO",
        fecha: control.fecha,
        servicio_extra: control.servicio_extra,
      })
    } else {
      console.log(`⚠ Legajo ${control.legajo} no encontrado`)
    }
  }

  console.log(`Agentes encontrados: ${controlsWithIds.length}`)

  const results = await importControls(controlsWithIds)

  console.log(`\nImportados: ${results.imported}, Errores: ${results.errors}`)
  results.details.forEach((d) => console.log(d))
}

main().catch(console.error)
