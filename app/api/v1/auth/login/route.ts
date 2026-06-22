import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { signAccess, signRefresh, jsonOk, jsonError, withCors } from "@/lib/auth"

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { usuario, password } = body as { usuario?: string; password?: string }

    if (!usuario || !password) {
      return withCors(jsonError(400, "VALIDATION_ERROR", "usuario y password son requeridos"))
    }

    // Stub: cualquier password no vacío funciona. En producción, validar contra tabla `usuarios`.
    if (password.length < 4) {
      return withCors(jsonError(401, "INVALID_CREDENTIALS", "Credenciales inválidas"))
    }

    const rows = await sql`
      SELECT id, legajo, apellido_nombre FROM agentes
      WHERE legajo = ${usuario} OR apellido_nombre ILIKE ${"%" + usuario + "%"}
      LIMIT 1
    `

    if (rows.length === 0) {
      return withCors(jsonError(401, "INVALID_CREDENTIALS", "Credenciales inválidas"))
    }

    const user = rows[0]
    const sub = String(user.id)
    const legajo = user.legajo
    const rol = "agente"

    const [accessToken, refreshToken] = await Promise.all([
      signAccess({ sub, legajo, rol }),
      signRefresh({ sub, legajo, rol }),
    ])

    return withCors(
      jsonOk({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        usuario: {
          id: user.id,
          legajo: user.legajo,
          apellidoNombre: user.apellido_nombre,
          rol,
        },
      }),
    )
  } catch (e) {
    return withCors(jsonError(500, "INTERNAL_ERROR", String(e)))
  }
}
