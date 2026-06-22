import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/features/assessment/client-providers";

export const metadata: Metadata = {
  title: "Reflective Maturity Profile",
  description:
    "A privacy-first, reflective self-assessment of maturity-related behaviors. Not a diagnosis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
