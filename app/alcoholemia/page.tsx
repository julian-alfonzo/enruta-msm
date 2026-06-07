import { AppShell } from "@/components/app-shell"
import { AlcoholemiaView } from "@/components/alcoholemia-view"
import { getAgentesConControl, getAlcoholemiaStats } from "@/app/actions/alcoholemia"

export const dynamic = "force-dynamic"

export default async function AlcoholemiaPage() {
  const agentes = (await getAgentesConControl()) as any[]
  const stats = await getAlcoholemiaStats()
  return (
    <AppShell>
      <AlcoholemiaView initialAgentes={agentes} stats={stats} />
    </AppShell>
  )
}
