import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { VerticalSidebar } from "@/components/ui/vertical-sidebar";
import {
  IconBrain,
  IconChartBar,
  IconMicroscope,
  IconSettings,
} from "@tabler/icons-react";


const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyQuant - AI Trading Assistant",
  description: "Your AI assistant for trading and investing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarItems = [
    {
      title: "Portfolio",
      href: "/",
      icon: <IconChartBar className="h-7 w-7" />,
    },
    {
      title: "Research",
      href: "/research",
      icon: <IconMicroscope className="h-7 w-7" />,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <IconSettings className="h-7 w-7" />,
    },
  ];

  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 relative flex">
            {/* Static Gradient Orbs - Behind Content */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-tr from-purple-500/8 to-pink-500/6 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-l from-purple-600/6 to-purple-500/8 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-gradient-to-br from-pink-500/6 to-purple-500/8 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-gradient-to-tl from-purple-500/7 to-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col items-center h-screen justify-center pl-6">
              <div className="absolute z-10 top-8">
                <IconBrain className="h-10 w-10 text-pink-500" />
              </div>
              <VerticalSidebar items={sidebarItems} />
            </div>
            <main className="flex-1 px-4 pt-4">
              <div className="w-full h-[calc(100vh-2rem)]">
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-6 h-full">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
