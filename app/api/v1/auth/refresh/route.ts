import { NextRequest, NextResponse } from "next/server"
import { signAccess, verifyToken, jsonOk, jsonError, withCors } from "@/lib/auth"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = body as { refreshToken?: string }

    if (!refreshToken) {
      return withCors(jsonError(400, "VALIDATION_ERROR", "refreshToken es requerido"))
    }

    const payload = await verifyToken(refreshToken)
    if (!payload) {
      return withCors(jsonError(401, "INVALID_REFRESH_TOKEN", "Refresh token inválido o expirado"))
    }
    if (payload.type !== "refresh") {
      return withCors(jsonError(401, "INVALID_REFRESH_TOKEN", "Se requiere un refresh token"))
    }

    const accessToken = await signAccess({
      sub: payload.sub,
      legajo: payload.legajo,
      rol: payload.rol,
    })

    return withCors(jsonOk({ accessToken, expiresIn: 3600 }))
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
