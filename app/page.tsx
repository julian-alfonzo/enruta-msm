import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard-view"
import { getDashboardStats, getAgentes } from "@/app/actions/agentes"

export const dynamic = "force-dynamic"

export default async function Page() {
  const stats = (await getDashboardStats()) as {
    total: number
    total_controles: number
    positivos: number
    observaciones_abiertas: number
  }
  const agentes = (await getAgentes()) as any[]
  const disponibles = agentes.slice(0, 8)

  return (
    <AppShell>
      <DashboardView stats={stats} disponibles={disponibles} />
    </AppShell>
  )
}
