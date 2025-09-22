"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group font-mono"
      toastOptions={{
        style: {
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontFamily: 'var(--font-jetbrains-mono)',
        },
        classNames: {
          toast: "!bg-slate-800 !border-white/20 !shadow-xl !font-mono !text-white",
          description: "!text-slate-300 !font-mono",
          actionButton: "!bg-purple-600 !text-white !font-mono hover:!bg-purple-700",
          cancelButton: "!bg-slate-600 !text-white !font-mono hover:!bg-slate-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
