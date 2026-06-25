import { AppShell } from "@/components/app-shell"
import { AgenteDetailView } from "@/components/agente-detail-view"
import { getAgenteById } from "@/app/actions/agentes"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AgenteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agente = await getAgenteById(Number(id))

  if (!agente) {
    notFound()
  }

  return (
    <AppShell>
      <AgenteDetailView
        agente={{
          id: agente.id,
          legajo: agente.legajo,
          apellido_nombre: agente.apellido_nombre,
          fecha_ingreso: agente.fecha_ingreso,
          dependencia: agente.dependencia,
          cargo: agente.cargo,
          turno: agente.turno,
        }}
      />
    </AppShell>
  )
}
