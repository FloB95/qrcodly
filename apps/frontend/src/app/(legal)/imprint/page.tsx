export default async function Page() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Imprint</h1>

			<p className="text-base leading-relaxed">
				Florian Breuer
				<br />
				FB-Development
				<br />
				33378 Rheda-Wiedenbrück
				<br />
				Germany
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">Contact</h2>
			<p className="text-base leading-relaxed">
				Email:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">
				Consumer Dispute Resolution / Universal Arbitration Body
			</h2>
			<p className="text-base leading-relaxed">
				We are not willing or obligated to participate in dispute resolution proceedings before a
				consumer arbitration board.
			</p>

			<p className="mt-10 text-sm text-muted-foreground">
				Source:{' '}
				<a
					href="https://www.e-recht24.de"
					target="_blank"
					rel="noopener noreferrer"
					className="underline"
				>
					eRecht24
				</a>
			</p>
		</div>
	);
}
