// components/app-sidebar.tsx
"use client";

import {
  ChevronDown,
  Home,
  Scan,
  History,
  Settings,
  HelpCircle,
  User2,
  Plus,
  Barcode,
  FileText,
   List
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Données de navigation
const navItems = [
  { title: "Accueil", url: "/dashboard", icon: Home },
  { title: "Inventaires", url: "/", icon:  List },
  { title: "Historique", url: "/all-scans", icon: History },
];

const moreItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Aide", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {


    
  return (
    <Sidebar collapsible="icon">
      {/* Header compact avec le sélecteur de mode (dropdown) */}
      <SidebarHeader className="border-b pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="w-full justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <Scan className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      Projet Scanner
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-70 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
{/* 
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem className="gap-2">
                  <Scan className="h-4 w-4" />
                  <span>QR Code</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Barcode className="h-4 w-4" />
                  <span>Code-barres</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Document</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-primary">
                  <Plus className="h-4 w-4" />
                  <span>Nouveau mode</span>
                </DropdownMenuItem>
              </DropdownMenuContent> */}
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Contenu principal */}
      <SidebarContent>
        {/* Navigation principale */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section "Plus" repliable */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5">
                Plus
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {moreItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <a href={item.url}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* Footer profil */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profil">
              <User2 className="h-5 w-5" />
              <span>Parfait Eric</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}