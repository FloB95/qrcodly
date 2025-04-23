import Footer from "@/components/Footer";
import { QRcodeGenerator } from "@/components/qr-generator/QRcodeGenerator";
import Header from "@/components/Header";
import Container from "@/components/ui/container";
import { Cta } from "@/components/Cta";
import type { DefaultPageParams } from "@/types/page";

export default function Page({ params }: DefaultPageParams) {
	return (
		<main className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-zinc-50 to-orange-100 px-4 sm:px-0">
			<Header />

			<div>
				<Container>
					<h1 className="mt-8 mb-10 text-center text-4xl font-bold">
						<span className="text-2xl">Free & Open Source</span> <br /> QR Code
						Generator
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
