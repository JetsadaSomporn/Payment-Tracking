"use client";

import { ToastProvider } from "@/providers/toast-provider";
import ToastContainer from "@/components/ui/toast-container";
import PolicyBanner from "@/components/policy-banner";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
      <PolicyBanner />
    </ToastProvider>
  );
}
