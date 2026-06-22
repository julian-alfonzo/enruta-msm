import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard-view"
import { getDashboardStats } from "@/app/actions/agentes"

export const dynamic = "force-dynamic"

export default async function Page() {
  const stats = (await getDashboardStats()) as {
    total: number
    total_controles: number
    positivos: number
    observaciones_abiertas: number
  }

  return (
    <AppShell>
      <DashboardView stats={stats} />
    </AppShell>
  )
}
