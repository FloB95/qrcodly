import Footer from '@/components/Footer';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import { Cta } from '@/components/Cta';

export default async function Home() {
	// const { data, error } = useQuery({
		// 	queryKey: ['qr-codes'],
		// 	queryFn: getMyQrCodes,
		// });


	return (
		<main className="flex px-4 sm:px-0 min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100">
			<Header />

			<div>
				<Container>
					<h1 className="mb-10 mt-8 text-center text-4xl font-bold">
						<span className="text-2xl">Free & Open Source</span> <br /> QR Code Generator
					</h1>
					<div className="mb-2">
						<QRcodeGenerator />
					</div>

					<Cta />
				</Container>
			</div>

			<Footer />
		</main>
	);
}
