import { AppShell } from "@/components/app-shell"
import { ObservacionesView } from "@/components/observaciones-view"
import { getObservaciones, getObservacionesStats } from "@/app/actions/observaciones"

export const dynamic = "force-dynamic"

type ObservacionRow = {
  id: number
  agente_id: number
  tipo: "Observación" | "Reclamo"
  descripcion: string
  resuelto: boolean
  fecha: string
  created_at: string
  agente_apellido_nombre: string
  agente_legajo: string
}

export default async function ObservacionesPage() {
  const observaciones = (await getObservaciones()) as ObservacionRow[]
  const stats = (await getObservacionesStats()) as {
    total: number
    abiertas: number
    resueltas: number
    observaciones: number
    reclamos: number
  }
  return (
    <AppShell>
      <ObservacionesView initialObservaciones={observaciones} stats={stats} />
    </AppShell>
  )
}
