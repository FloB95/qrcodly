import "@/styles/globals.css";
import Footer from "@/components/Footer";
import NoNavHeader from "@/components/NoNavHeader";
import { buttonVariants } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { env } from "@/env";
import { Inter } from "next/font/google";
import Link from "next/link";
import React from "react";

const openSans = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export default async function NotFoundPage() {
	return (
		<html lang="en" className="light">
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
					src="umami.js"
					data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE}
				></script>
			</head>
			<body className={`font-sans ${openSans.variable}`}>
				<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
					<NoNavHeader />

					<Container className="flex flex-col justify-center text-center">
						<div>
							<h1 className="mb-4 text-center text-6xl font-bold">404</h1>
							<p className="mb-6 text-center text-xl">
								Oops! The page you&apos;re looking for doesn&apos;t exist.
							</p>
							<Link href="/" className={buttonVariants()}>
								Go Back Home
							</Link>
						</div>
					</Container>

					<Footer />
				</main>
			</body>
		</html>
	);
}
