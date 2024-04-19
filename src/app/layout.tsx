import "~/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

const openSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "QRcodly",
  description: "The modern free and open-source QR code generator.",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`font-sans ${openSans.variable}`}>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
