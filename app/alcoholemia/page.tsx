import { AppShell } from "@/components/app-shell"
import { AlcoholemiaView } from "@/components/alcoholemia-view"
import { getAgentesConControl, getAlcoholemiaStats } from "@/app/actions/alcoholemia"

export const dynamic = "force-dynamic"

type UltimoControl = {
  id: number
  fecha: string
  resultado: "Positivo" | "Negativo"
  graduacion: number | null
  servicio_extra: string | null
  observacion: string | null
  created_at: string
}

export default async function AlcoholemiaPage() {
  const agentes = (await getAgentesConControl()) as Array<{
    id: number
    legajo: string
    apellido_nombre: string
    dependencia: string | null
    cargo: string | null
    turno: string | null
    fecha_ingreso: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    ultimo_control: UltimoControl | null
  }>
  const stats = (await getAlcoholemiaStats()) as {
    total: number
    con_control: number
    positivos: number
    negativos: number
  }
  return (
    <AppShell>
      <AlcoholemiaView initialAgentes={agentes} stats={stats} />
    </AppShell>
  )
}
