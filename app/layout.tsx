import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { GoogleCalendarConnectionObserver } from "@/components/auth/google-calendar-connection-observer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "SEMEAR Territórios",
  description: "Escuta, memória e cartografia popular"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <GoogleCalendarConnectionObserver />
        {children}
      </body>
    </html>
  );
}
