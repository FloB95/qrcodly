import '@/styles/globals.css';
import NoNavHeader from '@/components/NoNavHeader';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const openSans = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
});

export default async function NotFoundPage() {
	return (
		<html lang="en" className="light">
			<head>
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="manifest" href="/site.webmanifest" />
			</head>
			<body className={`font-sans ${openSans.variable}`}>
				<main className="flex min-h-screen flex-col justify-between bg-white">
					<NoNavHeader />

					<Container className="flex flex-col justify-center text-center">
						<div>
							<h1 className="mb-4 text-center text-6xl font-semibold">404</h1>
							<p className="mb-6 text-center text-xl">
								Oops! The page you&apos;re looking for doesn&apos;t exist.
							</p>
							<Link href="/" className={buttonVariants()}>
								Go Back Home
							</Link>
						</div>
					</Container>

					<footer className="bg-[#1d1d1f] text-gray-300 py-8">
						<div className="mx-auto max-w-7xl px-6 text-center">
							<p className="text-xs text-gray-500">
								&copy; FB Dev {new Date().getFullYear()} &mdash; QR code is a registered trademark
								of DENSO WAVE INCORPORATED
							</p>
						</div>
					</footer>
				</main>
			</body>
		</html>
	);
}
