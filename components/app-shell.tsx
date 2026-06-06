"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Home, Users, FileBarChart, Camera, LogOut, Menu } from "lucide-react"
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
  { href: "/alcoholemia", label: "Alcoholemia", icon: Camera },
  { href: "/reportes", label: "Reportes", icon: FileBarChart },
]

const titles: Record<string, string> = {
  "/": "Panel de Administración",
  "/agentes": "Gestión de Agentes",
  "/alcoholemia": "Control de Alcoholemia",
  "/reportes": "Reportes",
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
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <img
            src="/logo-san-miguel.jpeg"
            alt="MSM"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="text-lg font-bold leading-none">EnRuta</p>
            <p className="text-xs text-sidebar-foreground/80">MSM</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 pb-6">
          <div className="mb-2 rounded-xl bg-sidebar-accent px-4 py-3 text-xs">
            <p className="font-semibold">Rol activo</p>
            <p className="text-sidebar-foreground/90">{rol}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Header */}
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
          <h1 className="text-lg font-semibold">Alcoholemia</h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-foreground/70">
            <Users className="h-5 w-5" />
          </div>
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

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card px-2 py-2 lg:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("rounded-full px-4 py-1", active && "bg-accent")}>
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
