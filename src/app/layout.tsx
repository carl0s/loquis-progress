import type { Metadata } from "next";
import { Hanken_Grotesk, Josefin_Sans } from "next/font/google";
import "./globals.css";

const grotesk = Hanken_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

// Titling face (brand requirement).
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Registro Loquis",
  description: "Avanzamento consegne, attese esterne e agenda del contratto Loquis.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${grotesk.variable} ${josefin.variable} h-full`}>
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
