import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import QueryProvider from "./providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MiniSocial - 迷你社交平台",
    template: "%s | MiniSocial",
  },
  description: "一个简洁优雅的迷你社交平台，分享你的想法，与朋友互动",
  keywords: ["社交平台", "动态分享", "MiniSocial", "社交网络"],
  authors: [{ name: "MiniSocial Team" }],
  creator: "MiniSocial",
  metadataBase: new URL("https://minisocial.app"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://minisocial.app",
    title: "MiniSocial - 迷你社交平台",
    description: "一个简洁优雅的迷你社交平台，分享你的想法，与朋友互动",
    siteName: "MiniSocial",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiniSocial - 迷你社交平台",
    description: "一个简洁优雅的迷你社交平台，分享你的想法，与朋友互动",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#60a5fa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <div className="page-transition">
              {children}
            </div>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
