import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AegisPay: Autonomous Milestone Escrow",
  description: "Autonomous milestone escrow powered by PayPal and AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
