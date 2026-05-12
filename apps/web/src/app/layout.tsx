import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { ThemeBootstrap } from "@/components/theme/theme-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "KuberTube",
  description: "Учебный workspace для целенаправленного изучения тем без отвлечений.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
