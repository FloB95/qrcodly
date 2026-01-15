export default async function Page() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>

			<h2 className="text-2xl font-semibold mt-10 mb-4">1. Data Protection at a Glance</h2>

			<h3 className="text-xl font-semibold mt-6 mb-2">General Information</h3>
			<p className="text-base leading-relaxed">
				The following information provides a simple overview of what happens to your personal data
				when you visit this website. Personal data is any data that can be used to personally
				identify you.
			</p>

			<h3 className="text-xl font-semibold mt-6 mb-2">Data Collection on This Website</h3>

			<h4 className="text-lg font-semibold mt-4 mb-1">
				Who is responsible for data collection on this website?
			</h4>
			<p className="text-base leading-relaxed">
				Data processing on this website is carried out by the website operator. The operator’s
				contact details can be found in the section “Information on the Responsible Party” in this
				privacy policy.
			</p>

			<h4 className="text-lg font-semibold mt-4 mb-1">How do we collect your data?</h4>
			<p className="text-base leading-relaxed">
				Some data is collected when you provide it to us, for example by entering data into a
				contact form.
			</p>
			<p className="text-base leading-relaxed">
				Other data is collected automatically or after your consent when you visit the website by
				our IT systems. This mainly includes technical data (e.g. browser type, operating system, or
				time of page access).
			</p>

			<h4 className="text-lg font-semibold mt-4 mb-1">What do we use your data for?</h4>
			<p className="text-base leading-relaxed">
				Some of the data is collected to ensure error-free provision of the website. Other data may
				be used to analyze your user behavior.
			</p>

			<h4 className="text-lg font-semibold mt-4 mb-1">Your rights regarding your data</h4>
			<p className="text-base leading-relaxed">
				You have the right to receive information about the origin, recipient, and purpose of your
				stored personal data at any time, free of charge. You also have the right to request
				correction or deletion of this data.
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">2. Hosting</h2>

			<h3 className="text-xl font-semibold mt-6 mb-2">Hetzner</h3>
			<p className="text-base leading-relaxed">
				This website is hosted by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen,
				Germany.
			</p>
			<p className="text-base leading-relaxed">
				Processing is based on Art. 6(1)(f) GDPR. We have a legitimate interest in the most reliable
				presentation of our website possible.
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">3. Information on the Responsible Party</h2>
			<address className="not-italic text-base leading-relaxed">
				Florian Breuer
				<br />
				33378 Rheda-Wiedenbrück
				<br />
				Germany
				<br />
				Email:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</address>

			<h2 className="text-2xl font-semibold mt-10 mb-4">4. Cookies</h2>
			<p className="text-base leading-relaxed">
				Our website uses cookies. Cookies are small data packets that do not damage your device.
				They are either stored temporarily for the duration of a session or permanently on your
				device.
			</p>

			<h2 className="text-2xl font-semibold mt-10 mb-4">5. Newsletter</h2>
			<p className="text-base leading-relaxed">
				If you would like to subscribe to our newsletter, we require your email address and
				information that allows us to verify that you are the owner of the email address provided
				and that you consent to receiving the newsletter.
			</p>

			<p className="mt-10 text-sm text-muted-foreground">Source: eRecht24</p>
		</div>
	);
}
