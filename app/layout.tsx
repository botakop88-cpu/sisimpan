import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SISIMPAN",
  description: "Sistem Penyimpanan Cloud Aggregator",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  appleWebApp: { capable: true, title: "SISIMPAN" },
  other: { "apple-touch-icon": "/app-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem("theme");
              if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                document.documentElement.classList.add("dark");
              }
            } catch (e) {}
          `
        }} />
      </head>
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
