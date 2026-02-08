import type { Metadata } from "next";
import { RoleProvider } from "@/components/role-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payroll Chap UI",
  description: "MVP interface for Payroll Chap Tanzania",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
