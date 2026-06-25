/**
 * Contract test: verifica que los endpoints REST de agentes acepten
 * el formato exacto que Flutter envía y retornen el formato que Flutter espera.
 *
 * Estas fixtures son el espejo de test/contract/api_contract_test.dart en Flutter.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (hoisted by vitest) ──

const mockSql = vi.fn()
const mockRawQuery = vi.fn()

vi.mock("@/lib/db", () => ({
  sql: (...args: any[]) => mockSql(...args),
  rawQuery: (...args: any[]) => mockRawQuery(...args),
}))

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

// ── Helpers ──

function makeRequest(method: string, url: string, body?: any) {
  const headers = new Headers()
  headers.set("authorization", "Bearer test-token")
  headers.set("content-type", "application/json")
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function parseJson(res: Response) {
  return res.json()
}

// ── Shared contract fixtures (matching Flutter test/contract/api_contract_test.dart) ──

const FLUTTER_CREATE_PAYLOAD = {
  legajo: "TEST001",
  apellidoNombre: "Perez, Juan Carlos",
  fechaIngreso: "2024-03-15",
  dependencia: "Tránsito y Transporte",
  cargo: "Inspector",
  turno: "ROTATIVO",
}

const FLUTTER_UPDATE_PAYLOAD = {
  legajo: "ORIG001",
  apellidoNombre: "Nombre Modificado",
  fechaIngreso: "2023-01-01",
  dependencia: "Nueva Depto",
  cargo: "Nuevo Cargo",
  turno: "MAÑANA",
}

const DB_AGENTE_ROW = {
  id: 1,
  legajo: "63722",
  apellido_nombre: "Castillo, Juan Pablo",
  fecha_ingreso: "2010-05-12",
  dependencia: "Tránsito",
  cargo: "Supervisor",
  turno: "ROTATIVO",
  created_at: new Date("2025-01-15T10:30:00Z"),
  updated_at: new Date("2025-06-20T14:00:00Z"),
  deleted_at: null,
}

// ────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────

describe("Agentes API Contract (Backend ↔ Flutter)", () => {
  beforeEach(() => {
    mockSql.mockReset()
    mockRawQuery.mockReset()
  })

  describe("GET /api/v1/agentes", () => {
    it("retorna { data, meta } con paginación y atributos camelCase", async () => {
      mockSql.mockResolvedValueOnce([DB_AGENTE_ROW]) // SELECT data
      mockSql.mockResolvedValueOnce([{ n: 1 }]) // COUNT

      const { GET } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes?page=1&limit=20")
      const res = await GET(req)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toBeDefined()
      expect(body.meta.total).toBe(1)

      const agente = body.data[0]
      // Flutter fromApiJson espera exactamente camelCase
      expect(agente).toHaveProperty("apellidoNombre")
      expect(agente).toHaveProperty("fechaIngreso")
      expect(agente).toHaveProperty("createdAt")
      expect(agente).toHaveProperty("updatedAt")
      expect(agente).not.toHaveProperty("apellido_nombre")
      expect(agente).not.toHaveProperty("fecha_ingreso")
    })
  })

  describe("POST /api/v1/agentes", () => {
    it("acepta el payload exacto que Flutter envía (camelCase)", async () => {
      mockSql.mockResolvedValueOnce([]) // dup check: no existe
      const inserted = {
        id: 99, legajo: "TEST001", apellido_nombre: "Perez, Juan Carlos",
        fecha_ingreso: "2024-03-15", dependencia: "Tránsito y Transporte",
        cargo: "Inspector", turno: "ROTATIVO",
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      }
      mockSql.mockResolvedValueOnce([inserted]) // INSERT RETURNING

      const { POST } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes", FLUTTER_CREATE_PAYLOAD)
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(201)
      expect(body.data.id).toBe(99)
      expect(body.data.legajo).toBe("TEST001")
      expect(body.data.apellidoNombre).toBe("Perez, Juan Carlos")
      expect(body.data.turno).toBe("ROTATIVO")
    })

    it("valida legajo obligatorio", async () => {
      const { POST } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes", { apellidoNombre: "Sin Legajo" })
      const res = await POST(req)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
      expect(body.error.details).toBeDefined()
    })

    it("valida apellidoNombre obligatorio", async () => {
      const { POST } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes", { legajo: "NO_NAME" })
      const res = await POST(req)
      const body = await parseJson(res)
      expect(res.status).toBe(400)
    })

    it("valida turno contra enum", async () => {
      const { POST } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes", {
        legajo: "BAD", apellidoNombre: "X", turno: "INVALIDO",
      })
      const res = await POST(req)
      const body = await parseJson(res)
      expect(res.status).toBe(400)
    })

    it("rechaza legajo duplicado con 409 DUPLICATE_LEGAJO", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1 }]) // dup check

      const { POST } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("POST", "http://localhost/api/v1/agentes", {
        legajo: "EXISTE", apellidoNombre: "Test",
      })
      const res = await POST(req)
      const body = await parseJson(res)
      expect(res.status).toBe(409)
      expect(body.error.code).toBe("DUPLICATE_LEGAJO")
    })
  })

  describe("GET /api/v1/agentes/:id", () => {
    it("retorna agente en camelCase que Flutter parsea con fromApiJson", async () => {
      mockSql.mockResolvedValueOnce([DB_AGENTE_ROW])

      const { GET } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/1")
      const res = await GET(req, { params: Promise.resolve({ id: "1" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.apellidoNombre).toBe("Castillo, Juan Pablo")
    })

    it("retorna 404 NOT_FOUND si no existe", async () => {
      mockSql.mockResolvedValueOnce([])

      const { GET } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/99999")
      const res = await GET(req, { params: Promise.resolve({ id: "99999" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("PUT /api/v1/agentes/:id", () => {
    it("acepta el payload exacto que Flutter envía en update", async () => {
      mockSql.mockResolvedValueOnce([{ id: 42, legajo: "ORIG001" }]) // existing check
      const updated = { ...DB_AGENTE_ROW, id: 42, legajo: "ORIG001", apellido_nombre: "Nombre Modificado", turno: "MAÑANA", dependencia: "Nueva Depto", cargo: "Nuevo Cargo" }
      mockSql.mockResolvedValueOnce([updated])

      const { PUT } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/42", FLUTTER_UPDATE_PAYLOAD)
      const res = await PUT(req, { params: Promise.resolve({ id: "42" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.apellidoNombre).toBe("Nombre Modificado")
      expect(body.data.turno).toBe("MAÑANA")
    })

    it("valida turno en PUT igual que en POST", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1, legajo: "BAD" }])

      const { PUT } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/1", {
        legajo: "BAD", apellidoNombre: "Test", turno: "INVALIDO",
      })
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("rechaza cambio de legajo con 400 IMMUTABLE_LEGAJO", async () => {
      mockSql.mockResolvedValueOnce([{ id: 42, legajo: "ORIG001" }])

      const { PUT } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/42", {
        legajo: "DIFERENTE", apellidoNombre: "Test",
      })
      const res = await PUT(req, { params: Promise.resolve({ id: "42" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("IMMUTABLE_LEGAJO")
    })
  })

  describe("DELETE /api/v1/agentes/:id", () => {
    it("soft-deletea si no tiene dependencias, retorna 204", async () => {
      mockSql.mockResolvedValueOnce([{ id: 50 }]) // existing
      mockSql.mockResolvedValueOnce([{ n: 0 }]) // controls count
      mockSql.mockResolvedValueOnce([{ n: 0 }]) // obs count
      mockSql.mockResolvedValueOnce(undefined) // UPDATE SET deleted_at

      const { DELETE } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/50")
      const res = await DELETE(req, { params: Promise.resolve({ id: "50" }) } as any)

      expect(res.status).toBe(204)
    })

    it("rechaza con 409 AGENTE_HAS_DEPENDENCIES si tiene controles u observaciones", async () => {
      mockSql.mockResolvedValueOnce([{ id: 51 }]) // existing
      mockSql.mockResolvedValueOnce([{ n: 3 }]) // controls
      mockSql.mockResolvedValueOnce([{ n: 0 }]) // obs

      const { DELETE } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/51")
      const res = await DELETE(req, { params: Promise.resolve({ id: "51" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("AGENTE_HAS_DEPENDENCIES")
      expect(body.error.message).toContain("control(es)")
    })

    it("rechaza con 409 si tiene observaciones", async () => {
      mockSql.mockResolvedValueOnce([{ id: 52 }]) // existing
      mockSql.mockResolvedValueOnce([{ n: 0 }]) // controls
      mockSql.mockResolvedValueOnce([{ n: 2 }]) // obs

      const { DELETE } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("DELETE", "http://localhost/api/v1/agentes/52")
      const res = await DELETE(req, { params: Promise.resolve({ id: "52" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(409)
      expect(body.error.code).toBe("AGENTE_HAS_DEPENDENCIES")
      expect(body.error.message).toContain("observación(es)")
    })
  })

  describe("GET /api/v1/agentes/legajo/:legajo", () => {
    it("retorna agente por legajo en formato camelCase", async () => {
      mockSql.mockResolvedValueOnce([DB_AGENTE_ROW])

      const { GET } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/legajo/63722")
      const res = await GET(req, { params: Promise.resolve({ legajo: "63722" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(200)
      expect(body.data.legajo).toBe("63722")
      expect(body.data).toHaveProperty("apellidoNombre")
      expect(body.data).not.toHaveProperty("apellido_nombre")
    })
  })

  describe("Error response format", () => {
    it("siempre retorna { error: { code, message } }", async () => {
      mockSql.mockResolvedValueOnce([])

      const { GET } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes/0")
      const res = await GET(req, { params: Promise.resolve({ id: "0" }) } as any)
      const body = await parseJson(res)

      expect(body).toHaveProperty("error")
      expect(body.error).toHaveProperty("code")
      expect(body.error).toHaveProperty("message")
    })

    it("error UNAUTHORIZED cuando no hay token", async () => {
      const auth = await import("@/lib/auth")
      vi.mocked(auth.requireAuth).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token required" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }) as any,
      )

      const { GET } = await import("@/app/api/v1/agentes/route")
      const req = makeRequest("GET", "http://localhost/api/v1/agentes")
      const res = await GET(req)
      const body = await parseJson(res)

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })

    it("error 400 IMMUTABLE_LEGAJO mantiene estructura de error", async () => {
      mockSql.mockResolvedValueOnce([{ id: 1, legajo: "ORIG" }])

      const { PUT } = await import("@/app/api/v1/agentes/[id]/route")
      const req = makeRequest("PUT", "http://localhost/api/v1/agentes/1", {
        legajo: "CHANGED", apellidoNombre: "X",
      })
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) } as any)
      const body = await parseJson(res)

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("IMMUTABLE_LEGAJO")
      expect(body.error).toHaveProperty("message")
    })
  })
})
