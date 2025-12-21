import Footer from '@/components/Footer';
import NoNavHeader from '@/components/NoNavHeader';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<NoNavHeader />
			{children}
			<Footer />
		</>
	);
}
