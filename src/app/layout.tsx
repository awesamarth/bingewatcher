import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-editorial", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "BingeWatcher — Build the night, together", template: "%s — BingeWatcher" },
  description: "Explore movies and shows, track what you watch, and build collaborative lineups with your agent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geist.variable} ${instrumentSerif.variable} [scrollbar-gutter:stable]`}>
      <body>{children}</body>
    </html>
  );
}
