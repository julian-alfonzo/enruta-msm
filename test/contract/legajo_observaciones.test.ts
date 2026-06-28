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

const DB_OBS_ROW = {
  id: 10, agente_id: 1, tipo: "Observación", descripcion: "Llegada tarde",
  fecha: "2025-06-21", resuelto: false, created_at: new Date("2025-06-21T10:00:00Z"),
  legajo: "63722", apellido_nombre: "Castillo, Juan Pablo",
  dependencia: "Tránsito", cargo: "Supervisor",
}

describe("Legajo-based observaciones routes", () => {
  let mockSql: ReturnType<typeof vi.fn>
  let mockRawQuery: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const db = await import("@/lib/db")
    mockSql = (db as any)._mockSql
    mockRawQuery = (db as any)._mockRawQuery
    mockSql.mockReset()
    mockRawQuery.mockReset()
  })

  describe("GET /api/v1/agentes/legajo/:legajo/observaciones", () => {
    it("retorna observaciones con datos del agente por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockRawQuery.mockResolvedValueOnce([DB_OBS_ROW])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/63722/observaciones")
      const res = await GET(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data[0].tipo).toBe("Observación")
      expect(body.data[0].agente).toBeDefined()
      expect(body.data[0].agente.legajo).toBe("63722")
    })

    it("retorna 404 si legajo no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/NOEXISTE/observaciones")
      const res = await GET(req, { params: Promise.resolve({ legajo: "NOEXISTE" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("POST /api/v1/agentes/legajo/:legajo/observaciones", () => {
    const createPayload = {
      tipo: "Reclamo",
      descripcion: "Reclamo por trato",
      fecha: "2025-06-21",
      resuelto: false,
    }

    it("crea observacion por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockSql.mockResolvedValueOnce([{ ...DB_OBS_ROW, id: 11, tipo: "Reclamo", descripcion: "Reclamo por trato" }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/observaciones", createPayload)
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(201)
      expect(body.data.tipo).toBe("Reclamo")
      expect(body.data.agenteLegajo || body.data.agente?.legajo).toBe("63722")
    })

    it("valida tipo obligatorio", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/observaciones", {
        descripcion: "Sin tipo", fecha: "2025-06-21",
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("valida tipo contra enum", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/observaciones", {
        tipo: "INVALIDO", descripcion: "X", fecha: "2025-06-21",
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("valida descripcion obligatoria", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/observaciones", {
        tipo: "Observación", fecha: "2025-06-21",
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("valida fecha obligatoria", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/observaciones", {
        tipo: "Observación", descripcion: "X",
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("GET /api/v1/agentes/legajo/:legajo/observaciones/reporte", () => {
    it("retorna reporte de observaciones por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockRawQuery.mockResolvedValueOnce([DB_OBS_ROW])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/reporte/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/63722/observaciones/reporte")
      const res = await GET(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data[0]).toHaveProperty("tipo")
      expect(body.data[0].agente).toBeDefined()
    })
  })
})
