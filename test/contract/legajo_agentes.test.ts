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
        status,
        headers: { "content-type": "application/json" },
      }),
    jsonError: (status: number, code: string, message: string, details?: unknown) =>
      new Response(JSON.stringify({ error: { code, message, details } }), {
        status,
        headers: { "content-type": "application/json" },
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

const DB_AGENTE_ROW_2 = {
  id: 2, legajo: "99999", apellido_nombre: "Otro Agente",
  fecha_ingreso: "2020-01-01", dependencia: "Patrullas", cargo: "Conductor", turno: "MAÑANA",
  created_at: new Date("2025-01-15T10:30:00Z"), updated_at: new Date("2025-06-20T14:00:00Z"), deleted_at: null,
}

describe("Legajo-based agent routes", () => {
  let mockSql: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const db = await import("@/lib/db")
    mockSql = (db as any)._mockSql
    mockSql.mockReset()
  })

  describe("PUT /api/v1/agentes/legajo/:legajo", () => {
    it("actualiza agente por legajo", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])
      mockSql.mockResolvedValueOnce([{ ...DB_AGENTE_ROW, apellido_nombre: "Nombre Actualizado", turno: "TARDE" }])

      const { PUT } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/legajo/63722", {
        apellidoNombre: "Nombre Actualizado", turno: "TARDE",
      })
      const res = await PUT(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.apellidoNombre).toBe("Nombre Actualizado")
      expect(body.data.turno).toBe("TARDE")
    })

    it("retorna 404 si agente no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const { PUT } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/legajo/NOEXISTE", {
        apellidoNombre: "X",
      })
      const res = await PUT(req, { params: Promise.resolve({ legajo: "NOEXISTE" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })

    it("valida apellidoNombre obligatorio", async () => {
      const { PUT } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/legajo/63722", {})
      const res = await PUT(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("valida turno contra enum", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }])

      const { PUT } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/legajo/63722", {
        apellidoNombre: "Test", turno: "INVALIDO",
      })
      const res = await PUT(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("DELETE /api/v1/agentes/legajo/:legajo", () => {
    it("soft-deletea por legajo si no tiene dependencias", async () => {
      mockSql.mockResolvedValueOnce([{ id: 50 }])
      mockSql.mockResolvedValueOnce([{ n: 0 }])
      mockSql.mockResolvedValueOnce([{ n: 0 }])
      mockSql.mockResolvedValueOnce(undefined)

      const del = (await import("@/app/api/v1/agentes/legajo/[legajo]/route")).DELETE
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/legajo/63722")
      const res = await del(req, { params: Promise.resolve({ legajo: "63722" }) } as any)

      expect(res.status).toBe(204)
    })

    it("retorna 404 si legajo no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const del = (await import("@/app/api/v1/agentes/legajo/[legajo]/route")).DELETE
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/legajo/NOEXISTE")
      const res = await del(req, { params: Promise.resolve({ legajo: "NOEXISTE" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })

    it("rechaza con 409 si tiene controles", async () => {
      mockSql.mockResolvedValueOnce([{ id: 51 }])
      mockSql.mockResolvedValueOnce([{ n: 3 }])
      mockSql.mockResolvedValueOnce([{ n: 0 }])

      const del = (await import("@/app/api/v1/agentes/legajo/[legajo]/route")).DELETE
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/legajo/63722")
      const res = await del(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("AGENTE_HAS_DEPENDENCIES")
    })

    it("rechaza con 409 si tiene observaciones", async () => {
      mockSql.mockResolvedValueOnce([{ id: 52 }])
      mockSql.mockResolvedValueOnce([{ n: 0 }])
      mockSql.mockResolvedValueOnce([{ n: 2 }])

      const del = (await import("@/app/api/v1/agentes/legajo/[legajo]/route")).DELETE
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/legajo/63722")
      const res = await del(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("AGENTE_HAS_DEPENDENCIES")
    })
  })
})
