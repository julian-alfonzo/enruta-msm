import { AppShell } from "@/components/app-shell"
import Link from "next/link"
import { Calendar, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const reportes: Array<{
  href: string
  titulo: string
  descripcion: string
  estado: "disponible" | "proximamente"
}> = [
  {
    href: "/reportes-personal/semanal",
    titulo: "Reporte Semanal",
    descripcion: "Subí el Excel mensual de novedades y generá los partes semanales de licencias.",
    estado: "disponible",
  },
]

export default function ReportesPersonalPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Reportes de personal</h2>
          <p className="text-sm text-muted-foreground">Procesá Excels y generá otros Excels a partir de ellos.</p>
        </div>

        <div className="flex flex-col gap-3">
          {reportes.map((r) => {
            const inner = (
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{r.titulo}</CardTitle>
                      <CardDescription>{r.descripcion}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            )
            return (
              <Link key={r.href} href={r.estado === "disponible" ? r.href : "#"}>
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
