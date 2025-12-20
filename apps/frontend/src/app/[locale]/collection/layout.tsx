import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-h-screen flex-col justify-between bg-linear-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<Header />
			{children}
			<Footer />
		</main>
	);
}
