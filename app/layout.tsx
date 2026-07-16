import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IssueTracker — Client change-request control",
  description:
    "Track every client revision in one place. Five free iterations per project. After that, they pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
