import Footer from '@/components/Footer';
import NoNavHeader from '@/components/NoNavHeader';
import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import Link from 'next/link';

export default function NotFoundPage() {
	return (
		<>
			<NoNavHeader />

			<Container className="flex flex-col justify-center text-center">
				<div>
					<h1 className="mb-4 text-center text-6xl font-semibold">404</h1>
					<p className="mb-6 text-center text-xl">
						Oopsss! The page you&apos;re looking for doesn&apos;t exist.
					</p>
					<Link href="/" className={buttonVariants()}>
						Go Back Home
					</Link>
				</div>
			</Container>

			<Footer />
		</>
	);
}
