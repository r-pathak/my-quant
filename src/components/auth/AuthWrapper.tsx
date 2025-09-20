"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import LoginForm from "./LoginForm";
import { FlickeringGrid } from "../ui/flickering-grid";
import { ReactNode, useState } from "react";
import { api } from "../../../convex/_generated/api";
import PhoneNumberForm from "../onboarding/PhoneNumberForm";

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [phoneNumberCompleted, setPhoneNumberCompleted] = useState(false);

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
        <AuthenticatedContent 
          phoneNumberCompleted={phoneNumberCompleted}
          setPhoneNumberCompleted={setPhoneNumberCompleted}
        >
          {children}
        </AuthenticatedContent>
      </Authenticated>
    </>
  );
}

function AuthenticatedContent({ 
  children, 
  phoneNumberCompleted, 
  setPhoneNumberCompleted 
}: { 
  children: ReactNode;
  phoneNumberCompleted: boolean;
  setPhoneNumberCompleted: (completed: boolean) => void;
}) {
  const phoneContact = useQuery(api.phoneContacts.getPhoneNumber);

  // Show loading while checking phone number status
  if (phoneContact === undefined) {
    return (
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
    );
  }

  // If user doesn't have a phone number and hasn't completed the form, show phone number form
  if (!phoneContact && !phoneNumberCompleted) {
    return (
      <PhoneNumberForm 
        onComplete={() => setPhoneNumberCompleted(true)} 
      />
    );
  }

  // User has phone number or just completed the form, show main app
  return <>{children}</>;
}
