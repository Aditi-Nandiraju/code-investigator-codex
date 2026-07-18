import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Investigator | Evidence-first issue investigations",
  description: "Understand GitHub issues before you change code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-[#07090f] antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
