export const VALIDACION: Array<[number, string]> = [
  [15, "Fallecimiento"],
  [16, "Citación Judicial"],
  [17, "Donacion de organos"],
  [21, "llegada tarde hasta media hr"],
  [22, "examen de ingreso"],
  [23, "comision"],
  [24, "tramite jubilatorio"],
  [27, "Accidente de trabajo"],
  [28, "Art. 46 dia femenino"],
  [3, "familiar enfermo"],
  [30, "practicas"],
  [31, "junta medica municipal"],
  [34, "accidente in itinere"],
  [36, "Art. 46 bis. Permiso por colegio"],
  [37, "Jornada"],
  [4, "ENFERMO"],
  [42, "donacion de sangre"],
  [44, "seminario"],
  [50, "ausente con aviso"],
  [57, "festividad judia"],
  [6, "ausente sin aviso"],
  [63, "llegada tarde mas de media hr"],
  [65, "Art. 45 b) Tramites Prematrimoniales"],
  [70, "junta medica previsional"],
  [75, "examen medico prematrimonial"],
  [76, "indole particular"],
  [77, "Aislamiento preventivo por contacto"],
  [78, "Aislamiento preventivo por covid+"],
  [79, "Donacion de plasma"],
  [84, "union convivencial"],
  [11, "Estudio"],
  [12, "Examen"],
]

export const VALIDACION_BY_DESC: Record<string, number> = (() => {
  const m: Record<string, number> = {}
  for (const [codigo, desc] of VALIDACION) {
    m[desc.trim().toLowerCase()] = codigo
  }
  return m
})()
