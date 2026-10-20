import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import SyncManager from "@/components/SyncManager";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "Outdoor Reflections — A journal for time outside",
  description: "A quiet, offline-first journal for capturing time outdoors in words and sketches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full font-sans antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#F9F7F3]">
      <Analytics />
      <SpeedInsights />
        <Providers>
          <SyncManager />
          <TopBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
