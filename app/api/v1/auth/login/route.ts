import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { signAccess, signRefresh, jsonOk, jsonError, withCors } from "@/lib/auth"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

const ADMIN_USERS: Record<string, { password: string; nombre: string; rol: string }> = {
  admin: { password: "admin123", nombre: "Administrador", rol: "admin" },
  supervisor: { password: "super123", nombre: "Supervisor", rol: "supervisor" },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { usuario, password } = body as { usuario?: string; password?: string }

    if (!usuario || !password) {
      return withCors(jsonError(400, "VALIDATION_ERROR", "usuario y password son requeridos"))
    }

    const adminUser = ADMIN_USERS[usuario.toLowerCase()]
    if (!adminUser || adminUser.password !== password) {
      return withCors(jsonError(401, "INVALID_CREDENTIALS", "Credenciales inválidas"))
    }

    const sub = usuario
    const [accessToken, refreshToken] = await Promise.all([
      signAccess({ sub, legajo: "ADMIN", rol: adminUser.rol }),
      signRefresh({ sub, legajo: "ADMIN", rol: adminUser.rol }),
    ])

    return withCors(
      jsonOk({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        usuario: {
          usuario,
          nombre: adminUser.nombre,
          rol: adminUser.rol,
        },
      }),
    )
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
