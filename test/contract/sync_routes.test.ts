import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const mockSqlFn = vi.fn()
  const mockRawQueryFn = vi.fn()
  return {
    sql: (...args: any[]) => mockSqlFn(...args),
    rawQuery: (...args: any[]) => mockRawQueryFn(...args),
    _mockSql: mockSqlFn,
    _mockRawQuery: mockRawQueryFn,
  }
})

vi.mock("@/lib/auth", async () => {
  return {
    requireAuth: vi.fn().mockResolvedValue({ sub: "1", legajo: "admin", rol: "admin", type: "access" }),
    jsonOk: (data: any, meta?: any, status = 200) =>
      new Response(JSON.stringify({ data, ...(meta ? { meta } : {}) }), {
        status, headers: { "content-type": "application/json" },
      }),
    jsonError: (status: number, code: string, message: string, details?: unknown) =>
      new Response(JSON.stringify({ error: { code, message, details } }), {
        status, headers: { "content-type": "application/json" },
      }),
    jsonNoContent: () => new Response(null, { status: 204 }),
    withCors: (res: Response) => res,
  }
})

function makeRequest(method: string, url: string, body?: any) {
  const headers = new Headers()
  headers.set("authorization", "Bearer test-token")
  headers.set("content-type", "application/json")
  const init: RequestInit = { method, headers, body: body ? JSON.stringify(body) : undefined }
  return new Request(url, init) as any
}

async function parseJson(res: Response) { return res.json() }

const DB_AGENTE_ROW = {
  id: 1, legajo: "63722", apellido_nombre: "Castillo, Juan Pablo",
  fecha_ingreso: "2010-05-12", dependencia: "Tránsito", cargo: "Supervisor", turno: "ROTATIVO",
  created_at: new Date("2025-01-15T10:30:00Z"), updated_at: new Date("2025-06-20T14:00:00Z"), deleted_at: null,
}

const DB_CONTROL_ROW = {
  id: 10, agente_id: 1, fecha: "2025-06-21", resultado: "Negativo",
  graduacion: null, servicio_extra: "Cumpliendo servicio", observacion: null,
  created_at: new Date("2025-06-21T10:00:00Z"),
}

const DB_OBS_ROW = {
  id: 10, agente_id: 1, tipo: "Observación", descripcion: "Test",
  fecha: "2025-06-21", resuelto: false, created_at: new Date("2025-06-21T10:00:00Z"),
}

describe("Sync routes", () => {
  let mockSql: ReturnType<typeof vi.fn>
  let mockRawQuery: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const db = await import("@/lib/db")
    mockSql = (db as any)._mockSql
    mockRawQuery = (db as any)._mockRawQuery
    mockSql.mockReset()
    mockRawQuery.mockReset()
  })

  describe("POST /api/v1/sync/pull", () => {
    it("retorna agentes, controles y observaciones con agenteLegajo", async () => {
      mockRawQuery.mockResolvedValueOnce([DB_AGENTE_ROW])
      mockRawQuery.mockResolvedValueOnce([])
      mockRawQuery.mockResolvedValueOnce([{ ...DB_CONTROL_ROW, agente_legajo: "63722" }])
      mockRawQuery.mockResolvedValueOnce([{ ...DB_OBS_ROW, agente_legajo: "63722" }])

      const { POST } = await import("@/app/api/v1/sync/pull/route")
      const req = makeRequest("POST", "http://localhost/api/v1/sync/pull", { lastSync: "2025-01-01T00:00:00Z" })
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.agentes).toBeDefined()
      expect(body.data.alcoholemias).toBeDefined()
      expect(body.data.observaciones).toBeDefined()
      expect(body.data.serverTime).toBeDefined()
      expect(body.data.alcoholemias[0].agenteLegajo).toBe("63722")
      expect(body.data.observaciones[0].agenteLegajo).toBe("63722")
    })

    it("retorna deleted agents con legajo", async () => {
      mockRawQuery.mockResolvedValueOnce([])
      mockRawQuery.mockResolvedValueOnce([{ id: 99, legajo: "DELETED01", deleted_at: new Date("2025-06-21T10:00:00Z") }])
      mockRawQuery.mockResolvedValueOnce([])
      mockRawQuery.mockResolvedValueOnce([])

      const { POST } = await import("@/app/api/v1/sync/pull/route")
      const req = makeRequest("POST", "http://localhost/api/v1/sync/pull", {})
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.deleted.agentes[0]).toHaveProperty("legajo")
      expect(body.data.deleted.agentes[0].legajo).toBe("DELETED01")
    })

    it("retorna todos los registros sin lastSync (full sync)", async () => {
      mockRawQuery.mockResolvedValueOnce([DB_AGENTE_ROW])
      mockRawQuery.mockResolvedValueOnce([])
      mockRawQuery.mockResolvedValueOnce([{ ...DB_CONTROL_ROW, agente_legajo: "63722" }])
      mockRawQuery.mockResolvedValueOnce([])

      const { POST } = await import("@/app/api/v1/sync/pull/route")
      const req = makeRequest("POST", "http://localhost/api/v1/sync/pull", {})
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.agentes.length).toBe(1)
    })
  })

  describe("POST /api/v1/sync/push", () => {
    it("crea agentes por legajo", async () => {
      mockSql.mockResolvedValueOnce([])
      mockSql.mockResolvedValueOnce([{ id: 100 }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        agentes: {
          created: [{ localId: 1, legajo: "NEW001", apellidoNombre: "Nuevo Agente" }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.serverIds.agentes["1"]).toBe(100)
    })

    it("resuelve agenteLegajo para crear controles", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockSql.mockResolvedValueOnce([{ id: 200 }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        alcoholemias: {
          created: [{
            localId: 1, agenteLegajo: "63722", fecha: "2025-06-21",
            resultado: "Negativo",
          }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.serverIds.alcoholemias["1"]).toBe(200)
    })

    it("resuelve agenteLegajo para crear observaciones", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockSql.mockResolvedValueOnce([{ id: 300 }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        observaciones: {
          created: [{
            localId: 1, agenteLegajo: "63722", tipo: "Observación",
            descripcion: "Test", fecha: "2025-06-21",
          }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.serverIds.observaciones["1"]).toBe(300)
    })

    it("usa agenteId si no hay agenteLegajo (backward compat)", async () => {
      mockSql.mockResolvedValueOnce([{ id: 400 }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        alcoholemias: {
          created: [{
            localId: 1, agenteId: 50, fecha: "2025-06-21",
            resultado: "Positivo", graduacion: 0.5,
          }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.serverIds.alcoholemias["1"]).toBe(400)
    })

    it("actualiza agentes existentes", async () => {
      const db = await import("@/lib/db")
      const mockRawQuery = (db as any)._mockRawQuery
      mockRawQuery.mockResolvedValueOnce([{ id: 100, updated_at: new Date("2025-01-01") }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        agentes: {
          updated: [{ id: 100, legajo: "63722", apellidoNombre: "Actualizado", updatedAt: "2025-06-21T00:00:00Z" }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.conflicts).toEqual([])
    })

    it("detecta conflictos stale", async () => {
      const db = await import("@/lib/db")
      const mockRawQuery = (db as any)._mockRawQuery
      mockRawQuery.mockResolvedValueOnce([{ id: 200, updated_at: new Date("2025-06-21T10:00:00Z") }])

      const { POST } = await import("@/app/api/v1/sync/push/route")
      const payload = {
        agentes: {
          updated: [{ id: 200, legajo: "63722", apellidoNombre: "Stale", updatedAt: "2025-01-01T00:00:00Z" }],
        },
      }
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", payload)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.conflicts).toHaveLength(1)
      expect(body.data.conflicts[0].reason).toBe("stale")
    })

    it("retorna conflicts sin datos", async () => {
      const { POST } = await import("@/app/api/v1/sync/push/route")
      const req = makeRequest("POST", "http://localhost/api/v1/sync/push", {})
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.conflicts).toEqual([])
    })
  })
})
