"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Home, LogOut, Menu, Users, FlaskConical, MessageSquare, BarChart3 } from "lucide-react"
import { useSession } from "@/components/session-provider"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/agentes", label: "Agentes", icon: Users },
  { href: "/alcoholemia", label: "Alcoholemia", icon: FlaskConical },
  { href: "/observaciones", label: "Observaciones", icon: MessageSquare },
  { href: "/reportes", label: "Estadísticas", icon: BarChart3 },
]

const titles: Record<string, string> = {
  "/": "Panel de Administración",
  "/agentes": "Gestión de Agentes",
  "/alcoholemia": "Control de Alcoholemia",
  "/observaciones": "Reclamos y Observaciones",
  "/reportes": "Estadísticas",
  "/reportes-personal": "Reportes de personal",
  "/reportes-personal/semanal": "Reporte Semanal",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { rol, ready, logout } = useSession()

  useEffect(() => {
    if (ready && !rol) router.replace("/login")
  }, [ready, rol, router])

  if (!ready || !rol) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const baseTitle = titles[pathname] ?? "EnRuta"

  function handleLogout() {
    logout()
    router.replace("/login")
  }

  return (
    <div className="min-h-dvh bg-background lg:flex">
      {/* Sidebar (web) */}
      <aside className="hidden w-20 flex-col items-center bg-sidebar py-6 text-sidebar-foreground lg:flex">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "mb-2 flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                pathname === item.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-6 w-6" />
            </Link>
          )
        })}
        <div className="flex flex-1" />
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="flex h-12 w-12 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between bg-primary px-4 py-4 text-primary-foreground lg:hidden">
          <Sheet>
            <SheetTrigger className="rounded-md p-1">
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground border-0">
              <SheetHeader>
                <SheetTitle className="text-sidebar-foreground">EnRuta — MSM</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent"
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar sesión
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">{baseTitle}</h1>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-foreground/70"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden items-center justify-between border-b border-border bg-card px-8 py-4 lg:flex">
          <h1 className="text-xl font-bold text-foreground">{baseTitle}</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
    </div>
  )
}
