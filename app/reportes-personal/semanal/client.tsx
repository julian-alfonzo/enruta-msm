"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Upload, Download, FileSpreadsheet, AlertCircle, ChevronLeft, ChevronDown, Loader2, ListTree } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VALIDACION } from "@/lib/reportes/semanal/validacion"

type Resultado = {
  registros: number
  motivosSinCoincidencia: string[]
  contadorFuentes: Record<string, number>
}

const VALIDACION_ORDENADA = [...VALIDACION].sort((a, b) => a[0] - b[0])

export function ReporteSemanalClient() {
  const [file, setFile] = useState<File | null>(null)
  const [inicio, setInicio] = useState(1)
  const [fin, setFin] = useState(7)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string | null>(null)

  function reset() {
    setResultado(null)
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setDownloadName(null)
  }

  function submit() {
    setError(null)
    if (!file) {
      setError("Subí un archivo Excel (.xlsx)")
      return
    }
    start(async () => {
      try {
        const fd = new FormData()
        fd.append("fuente", file)
        fd.append("inicioSemana", String(inicio))
        fd.append("finSemana", String(fin))

        const res = await fetch("/api/reportes/semanal", { method: "POST", body: fd })
        if (!res.ok) {
          const txt = await res.text()
          try {
            const j = JSON.parse(txt)
            setError(j.error ?? `Error ${res.status}`)
            if (j.motivosSinCoincidencia) {
              setResultado({
                registros: 0,
                motivosSinCoincidencia: j.motivosSinCoincidencia,
                contadorFuentes: j.contadorFuentes,
              })
            }
          } catch {
            setError(`Error ${res.status}: ${txt}`)
          }
          reset()
          return
        }

        const blob = await res.blob()
        const cd = res.headers.get("Content-Disposition") ?? ""
        const m = cd.match(/filename="?([^"]+)"?/)
        const name = m?.[1] ?? "parte_semanal.xlsx"

        const motivosHeader = res.headers.get("X-Motivos-Sin-Coincidencia")
        const contadorHeader = res.headers.get("X-Contador-Fuentes")
        const totalHeader = res.headers.get("X-Total-Registros")

        setResultado({
          registros: Number(totalHeader ?? 0),
          motivosSinCoincidencia: [],
          contadorFuentes: contadorHeader ? JSON.parse(contadorHeader) : {},
        })

        if (downloadUrl) URL.revokeObjectURL(downloadUrl)
        setDownloadUrl(URL.createObjectURL(blob))
        setDownloadName(name)

        if (motivosHeader && Number(motivosHeader) > 0) {
          setResultado((r) =>
            r
              ? { ...r, motivosSinCoincidencia: new Array(Number(motivosHeader)).fill("") }
              : r,
          )
        }
      } catch (e) {
        setError(String((e as Error).message ?? e))
        reset()
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <Link
        href="/reportes-personal"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Reportes de personal
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Reporte Semanal</h2>
        <p className="text-sm text-muted-foreground">
          Subí el Excel mensual de novedades (una hoja por día) y generá el parte semanal con las licencias mapeadas.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Código de colores del Excel de salida</CardTitle>
          <CardDescription>
            Las celdas de la columna <strong>Licencia</strong> se pintan según el estado del registro.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-border bg-destructive" />
            <div>
              <p className="font-semibold text-foreground">Rojo · VACIO</p>
              <p className="text-xs text-muted-foreground">
                Motivo no reconocido o excluido (no se pudo mapear a un código de licencia).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-border bg-yellow-300" />
            <div>
              <p className="font-semibold text-foreground">Amarillo · Revisar</p>
              <p className="text-xs text-muted-foreground">
                Código 4 o 27 con más de un registro del mismo legajo, o código 927 (citado por art).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <details className="mb-4 group rounded-2xl border-2 border-border bg-card shadow-sm">
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 select-none">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Códigos de licencia ({VALIDACION.length})
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Catálogo de códigos que se usan para mapear motivos y validar la columna Licencia.
          </p>
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {VALIDACION_ORDENADA.map(([codigo, desc]) => (
              <div key={codigo} className="flex items-baseline gap-3 border-b border-border/40 py-1">
                <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-primary">
                  {codigo}
                </span>
                <span className="text-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Datos de entrada
          </CardTitle>
          <CardDescription>
            Archivo .xlsx con hojas nombradas por día (1, 2, 3, …, 31). Cada hoja debe tener columnas FECHA, LEGAJO, APELLIDO Y NOMBRES, DEPENDENCIA, MOTIVO DE INASISTENCIA.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block text-sm">Archivo Excel fuente</Label>
            <Input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                reset()
                setError(null)
              }}
              className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Día inicio de la semana</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={inicio}
                onChange={(e) => {
                  setInicio(Number(e.target.value))
                  reset()
                }}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Día fin de la semana</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={fin}
                onChange={(e) => {
                  setFin(Number(e.target.value))
                  reset()
                }}
                className="rounded-xl"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={submit} disabled={pending || !file} className="h-12 rounded-xl">
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Procesar y generar parte
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
            <CardDescription>
              {resultado.registros} entrada(s) generada(s) en el parte semanal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Object.keys(resultado.contadorFuentes).length > 0 && (
              <div className="rounded-xl bg-accent p-3 text-xs">
                <p className="mb-1 font-semibold text-foreground">Mapeo de licencias</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {Object.entries(resultado.contadorFuentes).map(([src, n]) => (
                    <li key={src}>
                      {n} vía <span className="font-medium">{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {downloadUrl && downloadName && (
              <a
                href={downloadUrl}
                download={downloadName}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-chart-2 text-base font-semibold text-white transition-colors hover:bg-chart-2/90"
              >
                <Download className="h-5 w-5" />
                Descargar {downloadName}
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
