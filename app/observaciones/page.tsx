import { AppShell } from "@/components/app-shell"
import { ObservacionesView } from "@/components/observaciones-view"
import { getObservaciones, getObservacionesStats } from "@/app/actions/observaciones"

export const dynamic = "force-dynamic"

export default async function ObservacionesPage() {
  const observaciones = (await getObservaciones()) as any[]
  const stats = await getObservacionesStats()
  return (
    <AppShell>
      <ObservacionesView initialObservaciones={observaciones} stats={stats} />
    </AppShell>
  )
}