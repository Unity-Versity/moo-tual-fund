import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Nav } from "@/components/nav";
import { getSession } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://moo-tual.fund"
  ),
  title: {
    default: "Moo-tual Fund",
    template: "%s · Moo-tual Fund",
  },
  description:
    "Community bulk buying — whole animals, split between mates. No shop, no middlemen.",
  openGraph: {
    title: "Moo-tual Fund 🐄",
    description:
      "Community bulk buying — whole animals, split between mates. Claim your share, pick your cuts, fill your freezer.",
    siteName: "Moo-tual Fund",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Moo-tual Fund — Community bulk buying",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moo-tual Fund 🐄",
    description:
      "Community bulk buying — whole animals, split between mates. Claim your share, pick your cuts, fill your freezer.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Nav session={session} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          {children}
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          Moo-tual Fund &bull; No cows were harmed in the making of this website. Well, one was. 🐄
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
