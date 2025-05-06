import Footer from '@/components/Footer';
import NoNavHeader from '@/components/NoNavHeader';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import Link from 'next/link';
import React from 'react';

export default function NotFoundPage({ params }: DefaultPageParams) {
	return (
		<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<NoNavHeader />

			<Container className="flex flex-col justify-center text-center">
				<div>
					<h1 className="mb-4 text-center text-6xl font-bold">404</h1>
					<p className="mb-6 text-center text-xl">
						Oopsss! The page you&apos;re looking for doesn&apos;t exist.
					</p>
					<Link href="/" className={buttonVariants()}>
						Go Back Home
					</Link>
				</div>
			</Container>

			<Footer />
		</main>
	);
}
