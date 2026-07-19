import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tomasulo Simulator — Out-of-Order Processor Architecture Visualizer",
  description: "An interactive, cycle-accurate simulation showing standard In-Order pipeline versus Tomasulo Out-of-Order execution. Designed with Apple Dark Theme design tokens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-text-pri">{children}</body>
    </html>
  );
}
