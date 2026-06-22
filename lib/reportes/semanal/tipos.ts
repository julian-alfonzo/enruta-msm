export type MapeoFuente = "nomenclador" | "manual" | "validacion"

export type Registro = {
  legajo: number
  fecha: Date
  motivo: string | null
  es_vacio: boolean
  codigo?: number | null
  fuente_mapeo?: MapeoFuente | null
  flag_927?: boolean
}

export type Entrada = {
  legajo: number
  codigo: number | null
  fecha_inicio: Date
  fecha_fin: Date
  flag_927: boolean
}

export type OpcionesProceso = {
  inicioSemana: number
  finSemana: number
  mesNum: number
  ano: number
  nomencladorPath?: string
}

export type ResultadoProceso = {
  entradas: Entrada[]
  nombreSalida: string
  motivosSinCoincidencia: string[]
  contadorFuentes: Record<string, number>
  nomencladorActualizado: boolean
  nuevosEnNomenclador: number
}
