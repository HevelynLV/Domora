import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import "./globals.css";

// As fontes do protótipo. O next/font baixa os arquivos no build e serve
// pelo próprio app, sem chamar o Google a cada visita.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "PAUTA", template: "%s · PAUTA" },
  description: "Imóveis exclusivos de Florianópolis, num só catálogo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
