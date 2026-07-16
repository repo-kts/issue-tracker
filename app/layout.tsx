import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IssueTracker — Client change-request control",
  description:
    "Track every client revision in one place. Five free iterations per project. After that, they pay.",
};

// Runs before first paint to apply a saved manual theme, preventing a
// flash of the wrong theme. If nothing is saved, the CSS media query
// (prefers-color-scheme) governs — i.e. "System".
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script below mutates data-theme on <html> before hydration,
    // so the server markup intentionally differs from the client. Suppress the
    // hydration warning for this one element (it only covers <html>'s own attrs).
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
