// components/top-navbar.tsx
"use client";

import { Bell, Moon, Sun, User, Scan, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes"; // si tu utilises next-themes, sinon retire cette partie
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function TopNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme(); // optionnel : pour le toggle dark/light

  // Exemple de titre dynamique basé sur la route
  const pageTitle = (() => {
    if (pathname === "/") return "Accueil";
    if (pathname.includes("/scan")) return "Scanner";
    if (pathname.includes("/history")) return "Historique";
    return "Dashboard";
  })();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        "transition-all duration-200"
      )}
    >
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Trigger sidebar (mobile ou collapsé) */}
        {/* <SidebarTrigger className="-ml-2 md:hidden" /> */}

        

        {/* Titre de la page (ou breadcrumbs) */}
        <div className="flex-1">
          <h1 className="text-lg font-medium truncate">{pageTitle}</h1>
        </div>

        {/* Actions à droite */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Toggle thème (optionnel) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden md:flex"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          {/* <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button> */}

          {/* Avatar + Dropdown utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-muted flex items-center justify-center text-xs font-medium">
                  RE
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Revvo</span>
                  <span className="text-xs text-muted-foreground">
                    @revvo.africa
                  </span>
                </div>
              </DropdownMenuLabel>
              {/* <DropdownMenuSeparator />
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Paramètres</DropdownMenuItem>
              <DropdownMenuItem>Historique des scans</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Se déconnecter
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}