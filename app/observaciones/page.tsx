import { AppShell } from "@/components/app-shell"
import { ObservacionesView } from "@/components/observaciones-view"
import { getObservaciones, getObservacionesStats } from "@/app/actions/observaciones"

export const dynamic = "force-dynamic"

export default async function ObservacionesPage() {
  const observaciones = (await getObservaciones()) as any[]
  const stats = (await getObservacionesStats()) as {
    total: number
    abiertas: number
    resueltas: number
    faltas: number
    reclamos: number
    novedades: number
  }
  return (
    <AppShell>
      <ObservacionesView initialObservaciones={observaciones} stats={stats} />
    </AppShell>
  )
}