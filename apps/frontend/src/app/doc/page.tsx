'use server';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Container from '@/components/ui/container';

export default async function Documentation() {
	return (
		<main className="flex px-4 sm:px-0 min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
			<div className="min-h-screen bg-gradient-to-br from-zinc-50 to-orange-100">
				<Header />
				<Container>
					<div className="text-center py-32 md:py-60">
						<h1 className="text-4xl font-bold ">Documentation Under Update</h1>
						<p className="mt-4 text-lg text-gray-600">
							We&apos;re currently working on updating this section to serve you better. Please
							check back soon!
						</p>
					</div>
				</Container>
				<Footer />
			</div>
		</main>
	);
}
