import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Newsreader, Public_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { PortalShell } from "@/components/portal-shell";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Campus Portal • Student Management & Academic Hub",
  description: "Comprehensive University Student Management System and Campus Services HelpDesk.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AuthProvider>
          <PortalShell>{children}</PortalShell>
        </AuthProvider>
      </body>
    </html>
  );
}
