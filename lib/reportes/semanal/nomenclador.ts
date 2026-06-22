import { readFileSync, existsSync } from "fs"
import { join } from "path"

export const MAPPING_MANUAL: Record<string, number> = {
  "ausente sin aviso": 6,
  "ausente": 6,
  "ausente con aviso": 50,
  "ausente c/aviso": 50,
  "art": 27,
  "articulo": 27,
  "citado por art": 27,
  "accidente de trabajo": 27,
  "enferma": 4,
  "enfermo": 4,
  "asunto particular": 76,
  "indole particular": 76,
  "dia x estudio": 11,
  "dia x examen": 12,
  "se retiro": 4,
  "fallecimiento": 15,
  "citacion judicial": 16,
  "familiar enfermo": 3,
  "llegada tarde hasta media hora": 21,
  "llegada tarde menos de 30 hora": 21,
  "llegada tarde mas de media hora": 63,
  "llegada tarde mas de 30 hora": 63,
}

export const EXCLUIR_SUBSTR = [
  "horas extras",
  "hora extras",
  "licencia anual",
  "maternidad",
  "paternidad",
  "suspend",
  "suspens",
  "cambio de guardia",
  "camnbio de guardia",
]

export const CODIGOS_REVISAR = new Set([4, 27])

export const CODIGO_IGNORADO = 999
export const CODIGO_FLAG_927 = 927

const DEFAULT_NOMENCLADOR_PATH = join(process.cwd(), "data", "nomenclador_licencias.csv")

export function cargarNomenclador(ruta: string = DEFAULT_NOMENCLADOR_PATH): Record<string, number> {
  if (!existsSync(ruta)) return {}
  const raw = readFileSync(ruta, "utf8")
  const text = raw.replace(/^\uFEFF/, "")

  const lineas = text.split(/\r?\n/).filter((l) => l.trim())
  if (lineas.length < 2) return {}

  const header = lineas[0].split(",").map((h) => h.trim().toLowerCase())
  const idxMotivo = header.indexOf("motivo_original")
  const idxCodigo = header.indexOf("codigo_licencia")
  if (idxMotivo < 0 || idxCodigo < 0) return {}

  const mapa: Record<string, number> = {}
  for (let i = 1; i < lineas.length; i++) {
    const cols = parseCsvLine(lineas[i])
    const motivo = (cols[idxMotivo] ?? "").trim().toLowerCase()
    const codigoStr = (cols[idxCodigo] ?? "").trim()
    if (!motivo || !codigoStr) continue
    const codigo = Number(codigoStr)
    if (Number.isFinite(codigo)) mapa[motivo] = codigo
  }
  return mapa
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        cell += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") {
        out.push(cell)
        cell = ""
      } else cell += c
    }
  }
  out.push(cell)
  return out
}

export function debeExcluir(motivo: string | null | undefined): boolean {
  if (!motivo) return false
  const texto = String(motivo).trim().toLowerCase()
  return EXCLUIR_SUBSTR.some((sub) => texto.includes(sub))
}
