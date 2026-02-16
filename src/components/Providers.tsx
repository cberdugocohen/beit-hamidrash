"use client";

import { AuthProvider } from "@/lib/supabase/auth-context";
import { useSupabaseSync } from "@/lib/supabase/use-sync";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import DarkModeSync from "@/components/DarkModeSync";
import { ReactNode } from "react";

function SyncManager({ children }: { children: ReactNode }) {
  useSupabaseSync();
  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <DarkModeSync />
          <SyncManager>{children}</SyncManager>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
