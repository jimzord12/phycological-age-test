"use client";

import type { ReactNode } from "react";
import { AssessmentProvider } from "@/client/assessment-context";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <AssessmentProvider>{children}</AssessmentProvider>;
}
