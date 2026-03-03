import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="min-h-screen bg-[#000000] flex items-center justify-center text-accent-cyan">Loading...</div>}>{children}</Suspense>;
}
