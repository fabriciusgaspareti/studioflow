import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { Toaster } from "@/components/ui/toaster";
// REMOVER: import { ClerkClientProvider } from "@/lib/clerk-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudioFlow",
  description: "Seu player de música pessoal para estudo e prática",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ConvexClientProvider>
          {/* REMOVER: <ClerkClientProvider> */}
          {children}
          {/* REMOVER: </ClerkClientProvider> */}
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
