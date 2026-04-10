export default function ImprintContentDe() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Impressum</h1>

			<p className="text-base leading-relaxed">
				Florian Breuer
				<br />
				FB-Development
				<br />
				33378 Rheda-Wiedenbrück
				<br />
				Deutschland
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">Kontakt</h2>
			<p className="text-base leading-relaxed">
				E-Mail:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">
				Verbraucherstreitbeilegung / Universalschlichtungsstelle
			</h2>
			<p className="text-base leading-relaxed">
				Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
				Verbraucherschlichtungsstelle teilzunehmen.
			</p>

			<p className="mt-10 text-sm text-muted-foreground">
				Quelle:{' '}
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
