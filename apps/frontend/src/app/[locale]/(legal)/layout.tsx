import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<Header />
			<Container className="mt-22 px-6 sm:px-20 lg:px-40 mb-20">{children}</Container>
			<Footer />
		</>
	);
}
