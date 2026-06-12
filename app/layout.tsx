import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Citadel — Institutional Zero-Trust Treasury",
  description:
    "Premium corporate treasury infrastructure with MetaMask Advanced Permissions, Venice AI compliance, and autonomous agent governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} dark h-full antialiased`}
    >
      <body className="noise-overlay min-h-full bg-[--canvas] text-[--text-primary]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
