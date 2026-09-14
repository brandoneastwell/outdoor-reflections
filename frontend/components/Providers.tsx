"use client"

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import type { ReactNode } from "react";
import {AuthProvider} from "@/lib/context/authContext";
import SavePopup from "@/components/SavePopup";

export default function Providers({ children }: { children: ReactNode }) {
  return (
      <AuthProvider>
          <QueryClientProvider client={queryClient}>
              {children}
              <SavePopup />
              <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
      </AuthProvider>
  );
}
