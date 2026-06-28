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

const DB_CONTROL_ROW = {
  id: 10, agente_id: 1, fecha: "2025-06-21", resultado: "Negativo",
  graduacion: null, servicio_extra: "Cumpliendo servicio", observacion: null,
  created_at: new Date("2025-06-21T10:00:00Z"),
}

describe("Legajo-based alcoholemias routes", () => {
  let mockSql: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const db = await import("@/lib/db")
    mockSql = (db as any)._mockSql
    mockSql.mockReset()
  })

  describe("GET /api/v1/agentes/legajo/:legajo/alcoholemias", () => {
    it("retorna controles en camelCase por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockSql.mockResolvedValueOnce([DB_CONTROL_ROW])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias")
      const res = await GET(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data[0].resultado).toBe("Negativo")
      expect(body.data[0].fecha).toBe("2025-06-21")
    })

    it("retorna 404 si legajo no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/NOEXISTE/alcoholemias")
      const res = await GET(req, { params: Promise.resolve({ legajo: "NOEXISTE" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("POST /api/v1/agentes/legajo/:legajo/alcoholemias", () => {
    const createPayload = {
      fecha: "2025-06-21",
      resultado: "Negativo",
      servicioExtra: "Cumpliendo servicio",
    }

    it("crea control por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      const inserted = { ...DB_CONTROL_ROW, id: 11, resultado: "Negativo", graduacion: null }
      mockSql.mockResolvedValueOnce([inserted])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias", createPayload)
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(201)
      expect(body.data.resultado).toBe("Negativo")
      expect(body.data.agenteId).toBe(1)
    })

    it("retorna 404 si legajo no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/NOEXISTE/alcoholemias", createPayload)
      const res = await POST(req, { params: Promise.resolve({ legajo: "NOEXISTE" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })

    it("valida resultado requerido", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias", { fecha: "2025-06-21" })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("valida resultado Positivo requiere graduacion", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias", {
        fecha: "2025-06-21", resultado: "Positivo",
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("crea control positivo con graduacion", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      const inserted = { ...DB_CONTROL_ROW, id: 12, resultado: "Positivo", graduacion: 0.85 }
      mockSql.mockResolvedValueOnce([inserted])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias", {
        fecha: "2025-06-21", resultado: "Positivo", graduacion: 0.85,
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(201)
      expect(body.data.resultado).toBe("Positivo")
      expect(body.data.graduacion).toBe(0.85)
    })

    it("rechaza Negativo con graduacion", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { POST } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes/legajo/63722/alcoholemias", {
        fecha: "2025-06-21", resultado: "Negativo", graduacion: 0.5,
      })
      const res = await POST(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })
})
