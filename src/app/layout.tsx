import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cyber-Gym | Premium Fitness Experience",
  description: "Train smarter. Live stronger. AI nutrition coaching, live gym occupancy, and personal training at the gym or your home.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#000000] text-[#e5e5e5] antialiased">
        {children}
      </body>
    </html>
  );
}
