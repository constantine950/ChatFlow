import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatFlow",
  description: "Real-time team chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
