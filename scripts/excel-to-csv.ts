const XLSX = require("xlsx");

const EXCEL_PATH = "/Users/julianalfonzo/Documents/General/Proyectos/MSM/web/TEST ALCOHOLEMIA.xlsx";

interface ControlRow {
  legajo: string;
  resultado: string;
  fecha: string | null;
  servicio_extra: string;
}

interface AgenteRow {
  legajo: string;
  apellido_nombre: string;
  fecha_ingreso: string | null;
  dependencia: string;
  cargo: string;
  turno: string;
}

function parseExcelDate(value: unknown): string | null {
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  if (typeof value === "string" && value.includes("/")) {
    const [day, month, year] = value.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
}

function parseSheet1Controls(): ControlRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets["Hoja1"];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  const controls: ControlRow[] = [];

  const headerRow = data[0] as unknown[];
  const dateHeaders: string[] = headerRow.filter(
    (h: unknown): h is string => !!h && typeof h === "string" && /\d{2}\/\d{2}\/\d{4}/.test(h),
  );

  for (let rowIdx = 2; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx] as unknown[];
    let colOffset = 0;

    for (let blockIdx = 0; blockIdx < dateHeaders.length; blockIdx++) {
      const dateStr = dateHeaders[blockIdx];
      const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const fecha = match ? `${match[3]}-${match[2]}-${match[1]}` : null;

      const headerParts = dateStr.split(" ");
      const servicio_extra =
        headerParts.slice(1).join(" ").replace(/\s*\d{2}\/\d{2}\/\d{4}/, "").trim() || "PATRULLAS";

      const legajo = row[colOffset];
      const resultado = row[colOffset + 2];

      if (legajo && typeof legajo === "number" && resultado) {
        controls.push({
          legajo: String(legajo),
          resultado: String(resultado).trim(),
          fecha,
          servicio_extra,
        });
      }

      colOffset += 4;
    }
  }

  return controls;
}

function parseSheet2Agentes(): AgenteRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets["Hoja2"];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  const agentes: AgenteRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row[1]) continue;

    agentes.push({
      legajo: String(row[1]),
      apellido_nombre: String(row[2] || ""),
      fecha_ingreso: parseExcelDate(row[3]),
      dependencia: String(row[4] || ""),
      cargo: String(row[5] || ""),
      turno: String(row[6] || ""),
    });
  }

  return agentes;
}

function convertToCSV(controls: ControlRow[]): string {
  const headers = ["legajo", "fecha", "servicio_extra", "resultado"];

  const rows = controls.map((c: ControlRow) =>
    [c.legajo, c.fecha || "", c.servicio_extra || "", c.resultado || ""]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function convertAgentesToCSV(agentes: AgenteRow[]): string {
  const headers = ["legajo", "apellido_nombre", "fecha_ingreso", "dependencia", "cargo", "turno"];
  const rows = agentes.map((a: AgenteRow) =>
    [a.legajo, a.apellido_nombre, a.fecha_ingreso || "", a.dependencia, a.cargo, a.turno]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

const controls = parseSheet1Controls();
const agentes = parseSheet2Agentes();

console.log(`Controles: ${controls.length}, Agentes: ${agentes.length}`);

const fs = require("fs");
fs.writeFileSync("alcoholemia_import.csv", convertToCSV(controls), "utf8");
console.log(`✓ Escribió alcoholemia_import.csv (${controls.length} filas)`);
fs.writeFileSync("agentes_import.csv", convertAgentesToCSV(agentes), "utf8");
console.log(`✓ Escribió agentes_import.csv (${agentes.length} filas)`);
