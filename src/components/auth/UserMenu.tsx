"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { IconLogout } from "@tabler/icons-react";

export default function UserMenu() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex border border-white/30 p-2 rounded-lg items-center gap-3">
      <span className="text-sm font-mono text-white">
        {user?.email}
      </span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 0 hover:bg-red-500/20 rounded-lg transition-colors font-mono text-white hover:text-red-300"
      >
        <IconLogout className="h-4 w-4" />
      </button>
    </div>
  );
}
