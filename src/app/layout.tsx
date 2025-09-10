// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Onest } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostHogAnalyticsProvider from './posthog-provider';
import { Analytics } from '@vercel/analytics/react';

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Global.Church Index",
  description: "Find churches near you with our comprehensive directory",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${onest.variable} antialiased bg-white flex flex-col min-h-screen`}>
        <PostHogAnalyticsProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </PostHogAnalyticsProvider>
        {/* Vercel Web Analytics (production only) */}
        <Analytics mode="production" />
      </body>
    </html>
  );
}
