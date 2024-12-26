import { ClerkProvider } from "@clerk/nextjs";

import "~/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/lib/trpc/react";
import { Toaster } from "~/components/ui/toaster";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Metadata } from "next";

const openSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "QRcodly - Free & Open Source QR Code Generator",
  description:
    "Create fully customizable and stylish QR codes with QRcodly, a free and open-source QR code generator. Generate QR codes for URLs, text, Wi-Fi, vCards, and more. Easy-to-use, secure, and perfect for personal or business use. Start now!",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
  openGraph: {
    images: [
      {
        url: "https://www.qrcodly.de/og-image.webp"
      }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html lang="en">
        <head>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <script
            defer
            src="https://umami.fb-development.de/script.js"
            data-website-id="b1deaa39-901b-400d-9cb5-e76b880b3520"
          ></script>
        </head>
        <body className={`font-sans ${openSans.variable}`}>
          <TRPCReactProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </TRPCReactProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
