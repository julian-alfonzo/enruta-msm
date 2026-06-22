import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard-view"
import { getDashboardStats, getAgentes } from "@/app/actions/agentes"

export const dynamic = "force-dynamic"

export default async function Page() {
  const stats = await getDashboardStats()
  const agentes = (await getAgentes()) as any[]
  const disponibles = agentes.slice(0, 8)

  return (
    <AppShell>
      <DashboardView stats={stats as any} disponibles={disponibles} />
    </AppShell>
  )
}
