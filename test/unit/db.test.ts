import { describe, it, expect, vi } from "vitest"

const mockNeonQuery = vi.fn().mockResolvedValue([{ id: 1 }])
const mockNeonTagged = vi.fn((...args: any[]) => mockNeonQuery(...args))
;(mockNeonTagged as any).query = mockNeonQuery

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => mockNeonTagged),
}))

describe("db module", () => {
  it("sql tagged template calls the neon client", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test"
    vi.resetModules()
    const { sql } = await import("@/lib/db")
    const result = await sql`SELECT * FROM agentes WHERE id = ${1}`
    expect(Array.isArray(result)).toBe(true)
  })

  it("rawQuery calls query with positional params", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test"
    vi.resetModules()
    const { rawQuery } = await import("@/lib/db")
    const result = await rawQuery("SELECT * FROM agentes WHERE id = $1", [1])
    expect(Array.isArray(result)).toBe(true)
  })
})
