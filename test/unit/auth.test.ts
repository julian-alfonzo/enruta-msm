import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("Auth module", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("jsonOk", () => {
    it("wraps data with status 200 by default", async () => {
      const { jsonOk } = await import("@/lib/auth")
      const res = jsonOk({ test: true })
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body.data).toEqual({ test: true })
    })

    it("accepts custom status", async () => {
      const { jsonOk } = await import("@/lib/auth")
      const res = jsonOk({ id: 1 }, undefined, 201)
      const body = await res.json()
      expect(res.status).toBe(201)
      expect(body.data.id).toBe(1)
    })

    it("includes meta when provided", async () => {
      const { jsonOk } = await import("@/lib/auth")
      const res = jsonOk({ items: [] }, { total: 0 }, 200)
      const body = await res.json()
      expect(body.meta.total).toBe(0)
    })
  })

  describe("jsonError", () => {
    it("returns error object with code and message", async () => {
      const { jsonError } = await import("@/lib/auth")
      const res = jsonError(404, "NOT_FOUND", "Agente no encontrado")
      const body = await res.json()
      expect(res.status).toBe(404)
      expect(body.error.code).toBe("NOT_FOUND")
      expect(body.error.message).toBe("Agente no encontrado")
    })

    it("includes details when provided", async () => {
      const { jsonError } = await import("@/lib/auth")
      const res = jsonError(400, "VALIDATION_ERROR", "Invalid", [{ field: "legajo", message: "required" }])
      const body = await res.json()
      expect(res.status).toBe(400)
      expect(body.error.details).toHaveLength(1)
      expect(body.error.details[0].field).toBe("legajo")
    })
  })

  describe("jsonNoContent", () => {
    it("returns 204 with null body", async () => {
      const { jsonNoContent } = await import("@/lib/auth")
      const res = jsonNoContent()
      expect(res.status).toBe(204)
      expect(res.body).toBeNull()
    })
  })

  describe("withCors", () => {
    it("adds CORS headers", async () => {
      const { withCors } = await import("@/lib/auth")
      const res = new Response("test")
      const corsRes = withCors(res)
      expect(corsRes.headers.get("access-control-allow-origin")).toBe("*")
      expect(corsRes.headers.get("access-control-allow-methods")).toBe("GET, POST, PUT, DELETE, OPTIONS")
      expect(corsRes.headers.get("access-control-allow-headers")).toBe("authorization, content-type")
    })
  })

  describe("JWT sign/verify", () => {
    it("signs and verifies access token", async () => {
      const { signAccess, verifyToken } = await import("@/lib/auth")
      const token = await signAccess({ sub: "1", legajo: "admin", rol: "admin" })
      const payload = await verifyToken(token)
      expect(payload.sub).toBe("1")
      expect(payload.type).toBe("access")
    })

    it("signs and verifies refresh token", async () => {
      const { signRefresh, verifyToken } = await import("@/lib/auth")
      const token = await signRefresh({ sub: "1", legajo: "admin", rol: "admin" })
      const payload = await verifyToken(token)
      expect(payload.sub).toBe("1")
      expect(payload.type).toBe("refresh")
    })

    it("returns null on invalid signature", async () => {
      const { verifyToken } = await import("@/lib/auth")
      const result = await verifyToken("invalid.token.here")
      expect(result).toBeNull()
    })
  })

  describe("requireAuth", () => {
    it("returns payload for valid token", async () => {
      const { signAccess, requireAuth } = await import("@/lib/auth")
      const token = await signAccess({ sub: "1", legajo: "admin", rol: "admin" })
      const req = new Request("http://localhost/test", {
        headers: { authorization: `Bearer ${token}` },
      }) as any
      const result = await requireAuth(req)
      expect(result).toHaveProperty("sub", "1")
      expect(result).toHaveProperty("rol", "admin")
    })

    it("rejects tokens that are not access type", async () => {
      const { signRefresh, requireAuth } = await import("@/lib/auth")
      const token = await signRefresh({ sub: "1", legajo: "admin", rol: "admin" })
      const req = new Request("http://localhost/test", {
        headers: { authorization: `Bearer ${token}` },
      }) as any
      const result = await requireAuth(req)
      expect(result).toBeInstanceOf(Response)
      const body = await (result as Response).json()
      expect((result as Response).status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })

    it("rejects invalid/expired tokens", async () => {
      const { requireAuth } = await import("@/lib/auth")
      const req = new Request("http://localhost/test", {
        headers: { authorization: "Bearer invalid.token.here" },
      }) as any
      const result = await requireAuth(req)
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(401)
    })

    it("returns 401 when no token provided", async () => {
      const { requireAuth } = await import("@/lib/auth")
      const req = new Request("http://localhost/test") as any
      const result = await requireAuth(req)
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(401)
    })

    it("returns 401 for non-Bearer authorization header", async () => {
      const { requireAuth } = await import("@/lib/auth")
      const req = new Request("http://localhost/test", {
        headers: { authorization: "Basic dGVzdDp0ZXN0" },
      }) as any
      const result = await requireAuth(req)
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(401)
    })
  })

  describe("getAuthFromRequest", () => {
    it("returns null for missing header", async () => {
      const { getAuthFromRequest } = await import("@/lib/auth")
      const req = new Request("http://localhost/test") as any
      expect(getAuthFromRequest(req)).toBeNull()
    })

    it("returns null for non-Bearer header", async () => {
      const { getAuthFromRequest } = await import("@/lib/auth")
      const req = new Request("http://localhost/test", {
        headers: { authorization: "Basic xyz" },
      }) as any
      expect(getAuthFromRequest(req)).toBeNull()
    })
  })
})
