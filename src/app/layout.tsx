import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EvidenceProvider } from "@/components/Evidence";
import { IS_DEMO } from "@/lib/data";
import Chatbot from "@/components/Chatbot";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mtb Explorer",
  description: "Explore the path from tuberculosis biology to drugs and clinical evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {IS_DEMO && (
          <div className="border-b border-line bg-accent-soft px-6 py-1.5 text-center text-xs text-accent">
            Prototype — all data shown is illustrative placeholder content, not real scientific data.
          </div>
        )}
        <EvidenceProvider>{children}</EvidenceProvider>
        <Chatbot />
      </body>
    </html>
  );
}
