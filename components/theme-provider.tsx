/* eslint-disable @typescript-eslint/no-explicit-any */
// components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// ← Supprime ou commente cette ligne
// import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: any) {  // ← utilise "any" temporairement
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}