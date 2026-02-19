// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider"; 
import { TopNavbar } from "@/components/top-navbar";        
import { Toaster } from "@/components/ui/sonner"


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scan Code",
  description: "Application de scan QR, codes-barres et documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            {/* Sidebar fixe à gauche */}
            <AppSidebar />

            {/* Contenu principal (prend le reste de l'espace) */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Header sticky avec le bouton toggle + TopNavbar */}
              <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center gap-4 px-4 md:px-6">
                  {/* Bouton toggle sidebar – TOUJOURS VISIBLE */}
                  <SidebarTrigger className="hover:bg-accent rounded-md p-2" />

                  {/* La barre horizontale complète */}
                  <TopNavbar />
                </div>
              </header>

              {/* Zone de contenu scrollable */}
              <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
                {children}
              </main>
              <Toaster richColors/>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}