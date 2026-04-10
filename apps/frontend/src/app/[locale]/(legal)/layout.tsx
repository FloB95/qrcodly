import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Container from '@/components/ui/container';
import PrintButton from '@/components/legal/PrintButton';
import PrintHeader from '@/components/legal/PrintHeader';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<Header />
			<Container className="mt-22 px-6 sm:px-20 lg:px-40 mb-20 print:mt-0 print:px-0 print:mb-0">
				<PrintHeader />
				<div className="print:hidden mb-8">
					<PrintButton />
				</div>
				{children}
			</Container>
			<Footer />
		</>
	);
}
