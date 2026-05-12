import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { ThemeBootstrap } from "@/components/theme/theme-bootstrap";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KuberTube",
  description: "Учебный workspace для целенаправленного изучения тем без отвлечений.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sourceSerif.variable} suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
