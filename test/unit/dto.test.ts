import { describe, it, expect } from "vitest"
import {
  agenteToDTO, controlToDTO, observacionToDTO,
  type AgenteDTO, type ControlAlcoholemiaDTO, type ObservacionReclamoDTO,
} from "@/lib/dto"

const DB_AGENTE = {
  id: 1, legajo: "63722", apellido_nombre: "Castillo, Juan Pablo",
  fecha_ingreso: "2010-05-12", dependencia: "Tránsito", cargo: "Supervisor", turno: "ROTATIVO",
  created_at: new Date("2025-01-15T10:30:00Z"), updated_at: new Date("2025-06-20T14:00:00Z"), deleted_at: null,
}

const DB_CONTROL = {
  id: 10, agente_id: 1, fecha: "2025-06-21", resultado: "Positivo",
  graduacion: 0.85, servicio_extra: "Hora extra", observacion: "Control", created_at: new Date("2025-06-21T10:00:00Z"),
}

const DB_OBS = {
  id: 10, agente_id: 1, tipo: "Reclamo", descripcion: "Test",
  fecha: "2025-06-21", resuelto: true, created_at: new Date("2025-06-21T10:00:00Z"),
}

describe("DTO converters", () => {
  describe("agenteToDTO", () => {
    it("convierte snake_case a camelCase", () => {
      const dto = agenteToDTO(DB_AGENTE)
      expect(dto.id).toBe(1)
      expect(dto.legajo).toBe("63722")
      expect(dto.apellidoNombre).toBe("Castillo, Juan Pablo")
      expect(dto.fechaIngreso).toBe("2010-05-12")
      expect(dto.dependencia).toBe("Tránsito")
      expect(dto.cargo).toBe("Supervisor")
      expect(dto.turno).toBe("ROTATIVO")
      expect(dto.createdAt).toBeTruthy()
      expect(dto.updatedAt).toBeTruthy()
    })

    it("maneja campos nulos", () => {
      const dto = agenteToDTO({ id: 1, legajo: "X", apellido_nombre: "Y", created_at: null, updated_at: null })
      expect(dto.fechaIngreso).toBeUndefined()
      expect(dto.dependencia).toBeUndefined()
      expect(dto.createdAt).toBe("")
    })
  })

  describe("controlToDTO", () => {
    it("convierte snake_case a camelCase", () => {
      const dto = controlToDTO(DB_CONTROL)
      expect(dto.id).toBe(10)
      expect(dto.agenteId).toBe(1)
      expect(dto.fecha).toBe("2025-06-21")
      expect(dto.resultado).toBe("Positivo")
      expect(dto.graduacion).toBe(0.85)
      expect(dto.servicioExtra).toBe("Hora extra")
    })

    it("maneja graduacion null", () => {
      const dto = controlToDTO({ ...DB_CONTROL, graduacion: null })
      expect(dto.graduacion).toBeNull()
    })

    it("maneja fecha Date object", () => {
      const dto = controlToDTO({ ...DB_CONTROL, fecha: new Date("2025-06-21") })
      expect(dto.fecha).toBe("2025-06-21")
    })
  })

  describe("observacionToDTO", () => {
    it("convierte snake_case a camelCase", () => {
      const dto = observacionToDTO(DB_OBS)
      expect(dto.id).toBe(10)
      expect(dto.agenteId).toBe(1)
      expect(dto.tipo).toBe("Reclamo")
      expect(dto.descripcion).toBe("Test")
      expect(dto.fecha).toBe("2025-06-21")
      expect(dto.resuelto).toBe(true)
    })

    it("maneja resuelto false", () => {
      const dto = observacionToDTO({ ...DB_OBS, resuelto: false })
      expect(dto.resuelto).toBe(false)
    })

    it("maneja created_at null", () => {
      const dto = observacionToDTO({ ...DB_OBS, created_at: null })
      expect(dto.createdAt).toBe("")
    })

    it("maneja fecha como Date object en control", () => {
      const dto = controlToDTO({ ...DB_CONTROL, fecha: new Date("2025-06-21") })
      expect(dto.fecha).toBe("2025-06-21")
      expect(typeof dto.fecha).toBe("string")
    })

    it("maneja toIso con Date", () => {
      const dto = agenteToDTO({ ...DB_AGENTE, created_at: new Date("2025-01-15T10:30:00Z") })
      expect(dto.createdAt).toContain("2025-01-15")
    })
  })
})
