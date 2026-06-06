import { AppShell } from "@/components/app-shell"
import { AgentesView } from "@/components/agentes-view"
import { getAgentes } from "@/app/actions/agentes"
import type { Agente } from "@/lib/db"

export default async function AgentesPage() {
  const agentes = (await getAgentes()) as Agente[]
  return (
    <AppShell>
      <AgentesView initialAgentes={agentes} />
    </AppShell>
  )
}
