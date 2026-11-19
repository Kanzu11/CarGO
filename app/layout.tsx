import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NetworkBanner } from "@/components/system/NetworkBanner";
import { Toaster } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090B",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "CarGo — Fleet & Landmark Dispatch",
    template: "%s · CarGo",
  },
  description:
    "Landmark-first ride-hailing, Bajaj and local fleet dispatch for Ethiopia. Upfront locked ETB fares, live 3D fleet tracking and an ops command center.",
  applicationName: "CarGo",
  keywords: ["Ethiopia", "ride-hailing", "Bajaj", "dispatch", "fleet", "Adama", "Addis Ababa", "PWA"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CarGo",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "CarGo — Fleet & Landmark Dispatch",
    description: "Ride-hailing, Bajaj and fleet dispatch engineered for Ethiopia.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NetworkBanner />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
