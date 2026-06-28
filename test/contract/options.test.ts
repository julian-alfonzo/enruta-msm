import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  withCors: (res: Response) => res,
}))

describe("OPTIONS CORS preflight", () => {
  it("alcoholemias/legajo route returns 204", async () => {
    const { OPTIONS } = await import("@/app/api/v1/agentes/legajo/[legajo]/alcoholemias/route")
    const res = await OPTIONS()
    expect(res.status).toBe(204)
  })

  it("observaciones/legajo route returns 204", async () => {
    const { OPTIONS } = await import("@/app/api/v1/agentes/legajo/[legajo]/observaciones/route")
    const res = await OPTIONS()
    expect(res.status).toBe(204)
  })

  it("agent by legajo route returns 204", async () => {
    const { OPTIONS } = await import("@/app/api/v1/agentes/legajo/[legajo]/route")
    const res = await OPTIONS()
    expect(res.status).toBe(204)
  })
})
