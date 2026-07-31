import Footer from '@/components/Footer';
import NoNavHeader from '@/components/NoNavHeader';

export default async function LinkBlockedLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NoNavHeader />
			{/*
			 * flex-1 lets this section absorb whatever height is left between header and footer so the
			 * message sits optically centred; the padding guarantees breathing room on short viewports
			 * where there is no leftover height to distribute.
			 */}
			<section className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
				{children}
			</section>
			<Footer />
		</>
	);
}
