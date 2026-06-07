import Footer from '@/components/Footer';
import NoNavHeader from '@/components/NoNavHeader';

export default async function BannedLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NoNavHeader />
			{children}
			<Footer />
		</>
	);
}
