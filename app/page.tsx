import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard-view"
import { getDashboardStats, getAgentes } from "@/app/actions/agentes"

export const dynamic = "force-dynamic"

export default async function Page() {
  const stats = await getDashboardStats()
  const agentes = await getAgentes()
  const disponibles = (agentes as any[]).filter((a) => a.activo && a.en_servicio)

  return (
    <AppShell>
      <DashboardView stats={stats} disponibles={disponibles} />
    </AppShell>
  )
}
