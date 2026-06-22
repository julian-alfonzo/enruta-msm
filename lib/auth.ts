import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "enruta-dev-secret-do-not-use-in-prod",
)

const ACCESS_EXP = "1h"
const REFRESH_EXP = "24h"

export type JwtPayload = {
  sub: string
  legajo: string
  rol: string
  type: "access" | "refresh"
}

export async function signAccess(payload: { sub: string; legajo: string; rol: string }): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXP)
    .setSubject(payload.sub)
    .sign(SECRET)
}

export async function signRefresh(payload: { sub: string; legajo: string; rol: string }): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXP)
    .setSubject(payload.sub)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (!payload.sub || !payload.legajo || !payload.rol || !payload.type) return null
    return {
      sub: payload.sub,
      legajo: payload.legajo as string,
      rol: payload.rol as string,
      type: payload.type as "access" | "refresh",
    }
  } catch {
    return null
  }
}

export function getAuthFromRequest(req: Request): JwtPayload | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization")
  if (!header?.toLowerCase().startsWith("bearer ")) return null
  return null
}

export async function requireAuth(req: Request): Promise<JwtPayload | Response> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization")
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return jsonError(401, "UNAUTHORIZED", "Token de autenticación requerido")
  }
  const token = header.slice(7).trim()
  const payload = await verifyToken(token)
  if (!payload) {
    return jsonError(401, "UNAUTHORIZED", "Token inválido o expirado")
  }
  if (payload.type !== "access") {
    return jsonError(401, "UNAUTHORIZED", "Se requiere un access token")
  }
  return payload
}

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { status, headers: { "content-type": "application/json" } },
  )
}

export function jsonOk<T>(data: T, meta?: { total?: number; page?: number; limit?: number }, status = 200) {
  const body: { data: T; meta?: typeof meta } = { data }
  if (meta) body.meta = meta
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

export function jsonNoContent() {
  return new Response(null, { status: 204 })
}

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
}

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
