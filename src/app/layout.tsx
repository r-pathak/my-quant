import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { VerticalSidebar } from "@/components/ui/vertical-sidebar";
import AuthWrapper from "@/components/auth/AuthWrapper";
import UserMenu from "@/components/auth/UserMenu";
import {
  IconChartBar,
  IconMicroscope,
  IconSettings,
} from "@tabler/icons-react";
import Image from "next/image";
import { Toaster } from "@/components/ui/sonner";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "myquant. | ai trading assistant",
  description: "your ai assistant for trading and investing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarItems = [
    {
      title: "portfolio",
      href: "/",
      icon: <IconChartBar className="h-7 w-7" />,
    },
    {
      title: "research",
      href: "/research",
      icon: <IconMicroscope className="h-7 w-7" />,
    },
    // {
    //   title: "settings",
    //   href: "/settings",
    //   icon: <IconSettings className="h-7 w-7" />,
    // },
  ];

  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <AuthWrapper>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/15 to-slate-900 relative flex">
              {/* Enhanced Gradient Orbs - Left-focused */}
              <div className="absolute top-20 left-20 w-80 h-80 bg-gradient-to-tr from-purple-500/12 to-pink-500/8 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute top-1/3 left-10 w-56 h-56 bg-gradient-to-br from-blue-500/8 to-purple-500/12 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-1/4 left-32 w-72 h-72 bg-gradient-to-tr from-purple-600/10 to-cyan-500/6 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-gradient-to-br from-pink-500/8 to-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-l from-purple-600/6 to-purple-500/8 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-gradient-to-tl from-purple-500/7 to-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Subtle left edge gradient */}
              <div className="absolute left-0 top-0 h-full w-96 bg-gradient-to-r from-purple-500/5 via-purple-500/2 to-transparent pointer-events-none"></div>
              <div className="fixed left-5 top-2  z-50">
                {/* <IconBrain className="h-12 w-12 text-pink-500/90 ml-2 mb-4" /> */}
                <Image src="/logo-white.png" alt="myquant" width={80} height={80} />
              </div>
              <div className="absolute right-6 top-6 z-50">
                <UserMenu />
              </div>
              <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-50">
                <VerticalSidebar items={sidebarItems} />
              </div>
              <main className="flex-1 px-4 pt-24 pb-8 ml-24 flex items-center justify-center min-h-screen relative z-10">
                <div className="w-full">
                  <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-6 relative z-0">
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </AuthWrapper>
        </ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
