"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import Image from "next/image";
import { FlickeringGrid } from "../ui/flickering-grid";
import { EvervaultCard } from "../ui/evervault-card";

export default function LoginForm() {
  const { signIn } = useAuthActions();

  const handleGoogleLogin = async () => {
    try {
      console.log("Attempting Google login...");
      
      await signIn("google");
      
      console.log("Login initiated successfully");
    } catch (error) {
      console.error("Login failed:", error);
      alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <FlickeringGrid
        className="fixed inset-0 z-0 w-full h-full"
        squareSize={4}
        gridGap={6}
        color="#ab47bc"
        maxOpacity={0.5}
        flickerChance={0.5}
        height={2000}
        width={2000}
      />
      <div className="relative z-10 w-full max-w-md">
        <EvervaultCard className="h-[500px] w-full">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 flex flex-col justify-center items-center">
            <div className="text-center flex flex-col items-center mb-8">
              <Image src="/logo-white.png" alt="myquant" className="-mt-12" width={200} height={200} />
              <p className="font-mono font-semibold -mt-12 text-white">
                meet your personalized trading assistant.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex cursor-pointer items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500/30 via-slate-900/95 to-black hover:from-purple-500/40 hover:via-slate-800/95 hover:to-slate-900 backdrop-blur-xl text-white rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300 font-medium relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <IconBrandGoogleFilled className="h-5 w-5 font-mono text-white relative z-10" />
              <span className="relative z-10">continue with google</span>
            </button>
          </div>
        </EvervaultCard>
      </div>
    </div>
  );
}
