"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import LoginForm from "./LoginForm";
import { FlickeringGrid } from "../ui/flickering-grid";
import { ReactNode } from "react";

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
          <FlickeringGrid
            className="fixed inset-0 z-0 w-full h-full"
            squareSize={4}
            gridGap={6}
            color="#a855f7"
            maxOpacity={0.3}
            flickerChance={0.8}
            height={2000}
            width={2000}
          />
          <div className="relative z-10 text-center">
            <div className="animate-spin text-white h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white font-mono">loading...</p>
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
      <Authenticated>
        {children}
      </Authenticated>
    </>
  );
}

