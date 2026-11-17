import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GoogleCalendarConnectionObserver } from "@/components/auth/google-calendar-connection-observer";
import "./globals.css";

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
      <body className="font-sans">
        <GoogleCalendarConnectionObserver />
        {children}
      </body>
    </html>
  );
}
