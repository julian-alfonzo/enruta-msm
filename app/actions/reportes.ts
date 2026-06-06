"use server"

import { getControlesParaReporte } from "@/app/actions/alcoholemia"
import { getAgentes } from "@/app/actions/agentes"

export async function fetchReporteControles(desde?: string, hasta?: string) {
  return getControlesParaReporte(
    desde ? new Date(desde).toISOString() : undefined,
    hasta ? new Date(hasta + "T23:59:59").toISOString() : undefined,
  )
}

export async function fetchReporteAgentes() {
  return getAgentes()
}
