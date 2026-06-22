"use client"

import { useState, useTransition } from "react"
import { FileText, FileSpreadsheet, Camera, Users, Loader2 } from "lucide-react"
import { fetchReporteControles, fetchReporteAgentes } from "@/app/actions/reportes"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ReporteTipo = "alcoholemia" | "agentes"

function fmt(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReportesView() {
  const today = new Date().toISOString().slice(0, 10)
  const [tipo, setTipo] = useState<ReporteTipo>("alcoholemia")
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [pending, start] = useTransition()
  const [working, setWorking] = useState<string | null>(null)

  function generarPDF() {
    setWorking("pdf")
    start(async () => {
      const { default: jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default
      const doc = new jsPDF()

      doc.setFillColor(79, 195, 247)
      doc.rect(0, 0, 210, 28, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.text("Municipalidad de San Miguel — EnRuta", 14, 12)
      doc.setFontSize(11)
      doc.text(tipo === "alcoholemia" ? "Reporte de Controles de Alcoholemia" : "Reporte de Agentes", 14, 21)
      doc.setTextColor(20, 20, 20)
      doc.setFontSize(9)
      doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 14, 36)

      if (tipo === "alcoholemia") {
        const data = (await fetchReporteControles(desde || undefined, hasta || undefined)) as any[]
        autoTable(doc, {
          startY: 42,
          head: [["Agente", "Legajo", "Resultado", "Graduación", "Servicio", "Fecha"]],
          body: data.map((c) => [
            c.apellido_nombre,
            c.legajo,
            c.resultado,
            c.graduacion != null ? `${Number(c.graduacion).toFixed(2)} g/L` : "-",
            c.servicio_extra ?? "-",
            fmt(c.fecha),
          ]),
          headStyles: { fillColor: [79, 195, 247] },
          styles: { fontSize: 8 },
        })
      } else {
        const data = (await fetchReporteAgentes()) as any[]
        autoTable(doc, {
          startY: 42,
          head: [["Apellido y nombre", "Legajo", "Dependencia", "Cargo", "Turno", "F. Ingreso"]],
          body: data.map((a) => [
            a.apellido_nombre,
            a.legajo,
            a.dependencia ?? "-",
            a.cargo ?? "-",
            a.turno ?? "-",
            a.fecha_ingreso ?? "-",
          ]),
          headStyles: { fillColor: [79, 195, 247] },
          styles: { fontSize: 8 },
        })
      }

      doc.save(`reporte-${tipo}-${Date.now()}.pdf`)
      setWorking(null)
    })
  }

  function generarExcel() {
    setWorking("excel")
    start(async () => {
      const XLSX = await import("xlsx")
      let rows: any[]
      let sheetName: string

      if (tipo === "alcoholemia") {
        const data = (await fetchReporteControles(desde || undefined, hasta || undefined)) as any[]
        rows = data.map((c) => ({
          Agente: c.apellido_nombre,
          Legajo: c.legajo,
          Dependencia: c.dependencia ?? "",
          Resultado: c.resultado,
          "Graduación (g/L)": c.graduacion != null ? Number(c.graduacion) : "",
          "Servicio extra": c.servicio_extra ?? "",
          Fecha: fmt(c.fecha),
          Observación: c.observacion ?? "",
        }))
        sheetName = "Alcoholemia"
      } else {
        const data = (await fetchReporteAgentes()) as any[]
        rows = data.map((a) => ({
          "Apellido y nombre": a.apellido_nombre,
          Legajo: a.legajo,
          "F. Ingreso": a.fecha_ingreso ?? "",
          Dependencia: a.dependencia ?? "",
          Cargo: a.cargo ?? "",
          Turno: a.turno ?? "",
        }))
        sheetName = "Agentes"
      }

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `reporte-${tipo}-${Date.now()}.xlsx`)
      setWorking(null)
    })
  }

  const tipos = [
    { id: "alcoholemia" as const, label: "Controles de Alcoholemia", icon: Camera },
    { id: "agentes" as const, label: "Listado de Agentes", icon: Users },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <h2 className="mb-1 text-2xl font-bold text-foreground lg:text-3xl">Reportes</h2>
      <p className="mb-6 text-sm text-muted-foreground">Generá reportes en PDF o Excel</p>

      <Label className="mb-2 block text-sm font-semibold">Tipo de reporte</Label>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {tipos.map((t) => {
          const Icon = t.icon
          const active = tipo === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-colors",
                active ? "border-primary bg-accent" : "border-border bg-card",
              )}
            >
              <Icon className={cn("h-7 w-7", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {tipo === "alcoholemia" && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-xl" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={generarPDF}
          disabled={pending}
          className="h-14 justify-start gap-3 rounded-2xl bg-destructive text-base hover:bg-destructive/90"
        >
          {working === "pdf" ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          Generar PDF
        </Button>
        <Button
          onClick={generarExcel}
          disabled={pending}
          className="h-14 justify-start gap-3 rounded-2xl bg-chart-2 text-base hover:bg-chart-2/90"
        >
          {working === "excel" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-5 w-5" />
          )}
          Generar Excel
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        El archivo se descargará automáticamente al generarse.
      </p>
    </div>
  )
}
