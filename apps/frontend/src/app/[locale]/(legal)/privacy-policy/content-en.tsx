export default function PrivacyPolicyContentEn() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>
			<p className="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

			{/* ========== 1. Data Controller ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">1. Data Controller and Contact</h2>
			<p className="text-base leading-relaxed">
				The controller responsible for data processing on this website within the meaning of the
				General Data Protection Regulation (GDPR):
			</p>
			<address className="not-italic text-base leading-relaxed">
				Florian Breuer
				<br />
				FB-Development
				<br />
				33378 Rheda-Wiedenbr&uuml;ck
				<br />
				Germany
				<br />
				Email:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</address>

			{/* ========== 2. Overview ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">2. Overview of Data Processing</h2>

			<h3 className="text-xl font-semibold mt-6 mb-2">What data do we collect?</h3>
			<p className="text-base leading-relaxed">
				We only process personal data to the extent necessary for the provision of the QRcodly
				platform and its associated services. Specifically:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Account data:</strong> Email address, name, and user ID upon registration (via our
					authentication service Clerk)
				</li>
				<li>
					<strong>Usage data:</strong> Technical information such as browser type, operating system,
					device type, screen resolution, IP address, and access times
				</li>
				<li>
					<strong>Content data:</strong> Content created by you (QR codes, short URLs, templates,
					tags)
				</li>
				<li>
					<strong>Scan data:</strong> When scanning QR codes or accessing short URLs: IP address,
					browser, operating system, device type, language, referrer, country of origin
				</li>
				<li>
					<strong>Payment data:</strong> Billing information when subscribing to a paid plan
					(processed by Stripe)
				</li>
			</ul>

			<h3 className="text-xl font-semibold mt-6 mb-2">Legal Basis</h3>
			<p className="text-base leading-relaxed">
				The processing of your data is based on the following legal grounds:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Art. 6(1)(b) GDPR</strong> &mdash; Performance of a contract: Processing necessary
					for the performance of the user agreement (account management, QR code creation, scan
					analytics, payment processing)
				</li>
				<li>
					<strong>Art. 6(1)(f) GDPR</strong> &mdash; Legitimate interest: Ensuring the security and
					availability of the service (error monitoring, logging, abuse prevention)
				</li>
				<li>
					<strong>Art. 6(1)(a) GDPR</strong> &mdash; Consent: Where we obtain your consent for
					specific processing activities
				</li>
				<li>
					<strong>Art. 6(1)(c) GDPR</strong> &mdash; Legal obligation: Where statutory retention
					obligations apply (e.g. tax law requirements)
				</li>
			</ul>

			{/* ========== 3. Hosting ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">3. Hosting</h2>
			<p className="text-base leading-relaxed">
				This website is hosted by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen,
				Germany. Hetzner operates ISO 27001-certified data centres in Germany.
			</p>
			<p className="text-base leading-relaxed">
				When you visit our website, the server automatically collects technical data in so-called
				server log files: IP address, date and time of the request, requested URL, referrer URL,
				browser type and version, operating system.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest in the secure and
				stable provision of the website).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Data processing agreement:</strong> A data processing agreement (DPA) is in place
				with Hetzner.
			</p>

			{/* ========== 4. Authentication ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">4. Authentication (Clerk)</h2>
			<p className="text-base leading-relaxed">
				For registration and login, we use the service Clerk (Clerk, Inc., San Francisco, CA, USA).
				Clerk processes your email address, name, profile information, and authentication data.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract &mdash;
				authentication is a prerequisite for using the platform).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Third-country transfer:</strong> Clerk is based in the USA. Data transfers are
				carried out on the basis of EU Standard Contractual Clauses (SCCs) pursuant to Art. 46(2)(c)
				GDPR.
			</p>

			{/* ========== 5. Payment Processing ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">5. Payment Processing (Stripe)</h2>
			<p className="text-base leading-relaxed">
				For payment processing on the Pro plan, we use Stripe (Stripe, Inc. / Stripe Payments
				Europe, Ltd., Dublin, Ireland). Stripe processes your payment information (credit card data,
				bank details), email address, and transaction data. Payment data such as credit card numbers
				are processed exclusively by Stripe and are not stored on our servers.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract).
			</p>
			<p className="text-base leading-relaxed">
				Stripe has an EU establishment in Ireland and is PCI DSS Level 1 certified. Further
				information:{' '}
				<a
					href="https://stripe.com/de/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline"
				>
					Stripe Privacy Policy
				</a>
				.
			</p>

			{/* ========== 6. Scan Analytics ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">6. Scan Analytics (Umami)</h2>
			<p className="text-base leading-relaxed">
				To capture and analyse QR code scans and short URL visits, we use Umami, a privacy-friendly
				analytics software. Umami is self-hosted by us on our own Hetzner infrastructure in Germany
				and is not an external third-party service.
			</p>
			<p className="text-base leading-relaxed">The following data is collected during a scan:</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>IP address (not stored permanently)</li>
				<li>Browser type and version</li>
				<li>Operating system</li>
				<li>Device type (desktop, mobile, tablet)</li>
				<li>Language</li>
				<li>Referrer URL</li>
				<li>Country of origin (derived from IP address)</li>
				<li>Timestamp of the scan</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract &mdash; scan
				analytics is a core component of the service).
			</p>
			<p className="text-base leading-relaxed">
				Umami does not use cookies and does not create cross-device profiles. Data is stored in
				aggregated form.
			</p>

			{/* ========== 7. Error Monitoring ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">7. Error Monitoring (Sentry)</h2>
			<p className="text-base leading-relaxed">
				We use Sentry (Functional Software, Inc., San Francisco, CA, USA) to monitor errors and
				ensure the stability of our platform. In the event of an error, the following data may be
				transmitted to Sentry:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Error details and stack traces</li>
				<li>Browser and device information</li>
				<li>URL of the visited page</li>
				<li>IP address (anonymised)</li>
				<li>Time of the error</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest in error resolution and
				service stability).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Third-country transfer:</strong> SCCs pursuant to Art. 46(2)(c) GDPR. Error logs are
				automatically deleted after 90 days.
			</p>

			{/* ========== 8. Product Analytics ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">8. Product Analytics (PostHog)</h2>
			<p className="text-base leading-relaxed">
				To improve our platform, we use PostHog (PostHog, Inc., USA) for anonymised product
				analytics. PostHog collects:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Anonymised usage events (e.g. QR code created, button clicked)</li>
				<li>Page views</li>
				<li>Technical device and browser information</li>
			</ul>
			<p className="text-base leading-relaxed">
				No personal data such as email addresses or names is transmitted to PostHog.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest in improving the
				service).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Third-country transfer:</strong> SCCs pursuant to Art. 46(2)(c) GDPR.
			</p>

			{/* ========== 9. CDN and SSL ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">9. CDN and Custom Domains (Cloudflare)</h2>
			<p className="text-base leading-relaxed">
				For the provision of SSL certificates for custom domains and DNS management, we use
				Cloudflare (Cloudflare, Inc., San Francisco, CA, USA). Cloudflare may process technical
				connection data (IP address, requested domain) in this context.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract &mdash; custom
				domains are a contractual service) and Art. 6(1)(f) GDPR (legitimate interest in security).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Third-country transfer:</strong> SCCs, DPA, ISO 27001.
			</p>

			{/* ========== 10. Logging ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">10. Application Logging (Axiom)</h2>
			<p className="text-base leading-relaxed">
				For structured logging of application events, we use Axiom (Axiom, Inc., USA). Axiom stores
				technical application logs which, in exceptional cases, may also contain IP addresses or
				request metadata.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest in error detection and
				secure operation).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Third-country transfer:</strong> SCCs pursuant to Art. 46(2)(c) GDPR.
			</p>

			{/* ========== 11. Google Maps ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">11. Google Maps API</h2>
			<p className="text-base leading-relaxed">
				For location input when creating location QR codes, we use the Google Maps API (Google
				Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland). When using the location
				search, search queries and, where applicable, your IP address are transmitted to Google.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(b) GDPR (performance of a contract &mdash; the
				location search is part of the QR code creation feature).
			</p>
			<p className="text-base leading-relaxed">
				Further information:{' '}
				<a
					href="https://policies.google.com/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline"
				>
					Google Privacy Policy
				</a>
				.
			</p>

			{/* ========== 12. Cookies ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">12. Cookies</h2>
			<p className="text-base leading-relaxed">
				Our website uses cookies. Cookies are small text files stored on your device. The following
				types of cookies are used:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Strictly necessary cookies:</strong> Session cookies for authentication (Clerk)
					&mdash; these are essential for the operation of the platform
				</li>
				<li>
					<strong>Functional cookies:</strong> Storage of user interface preferences (e.g. QR code
					generator state in local storage)
				</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Legal basis:</strong> Art. 6(1)(f) GDPR (legitimate interest) for strictly necessary
				cookies. Umami and PostHog operate without cookies and do not set any cookies.
			</p>

			{/* ========== 13. Data Processing Agreement ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">13. Data Processing Agreement</h2>
			<p className="text-base leading-relaxed">
				Where you use the platform to process personal data of third parties (e.g. contact data in
				vCard QR codes, scan data of end users), we act as a data processor within the meaning of
				Art. 28 GDPR. The details are set out in our Data Processing Agreement (DPA) .
			</p>

			{/* ========== 14. Your Rights ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">14. Your Rights as a Data Subject</h2>
			<p className="text-base leading-relaxed">
				Under the GDPR, you are entitled to the following rights:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Right of access (Art. 15 GDPR):</strong> You may request information about the
					personal data we process concerning you.
				</li>
				<li>
					<strong>Right to rectification (Art. 16 GDPR):</strong> You may request the correction of
					inaccurate data.
				</li>
				<li>
					<strong>Right to erasure (Art. 17 GDPR):</strong> You may request the deletion of your
					data, provided no statutory retention obligations apply.
				</li>
				<li>
					<strong>Right to restriction of processing (Art. 18 GDPR):</strong> You may request the
					restriction of the processing of your data.
				</li>
				<li>
					<strong>Right to data portability (Art. 20 GDPR):</strong> You may request to receive your
					data in a machine-readable format.
				</li>
				<li>
					<strong>Right to object (Art. 21 GDPR):</strong> You may object at any time to processing
					based on a legitimate interest.
				</li>
				<li>
					<strong>Right to withdraw consent (Art. 7(3) GDPR):</strong> You may withdraw any consent
					you have given at any time with effect for the future.
				</li>
			</ul>
			<p className="text-base leading-relaxed">
				To exercise your rights, please contact{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
				.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Right to lodge a complaint:</strong> You have the right to lodge a complaint with a
				data protection supervisory authority. The supervisory authority responsible for us is the
				State Commissioner for Data Protection and Freedom of Information North Rhine-Westphalia
				(LDI NRW).
			</p>

			{/* ========== 15. Retention and Deletion ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">15. Retention Period and Deletion</h2>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Account data:</strong> Deleted upon deletion of your user account
				</li>
				<li>
					<strong>QR codes and short URLs:</strong> Removed upon account deletion
				</li>
				<li>
					<strong>Scan data:</strong> Stored in aggregated form; IP addresses are not stored
					permanently
				</li>
				<li>
					<strong>Payment data:</strong> In accordance with commercial and tax law retention
					obligations (up to 10 years, &sect;&thinsp;147 AO, &sect;&thinsp;257 HGB)
				</li>
				<li>
					<strong>Error logs (Sentry):</strong> Automatically deleted after 90 days
				</li>
				<li>
					<strong>Server logs:</strong> Deleted after 30 days
				</li>
			</ul>

			{/* ========== 16. Third-Country Transfers ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">16. Data Transfers to Third Countries</h2>
			<p className="text-base leading-relaxed">
				Some of the service providers we use are based in the USA (Clerk, Stripe, Cloudflare,
				Sentry, Axiom, PostHog). Data transfers to the USA are carried out on the basis of EU
				Standard Contractual Clauses (SCCs) pursuant to Art. 46(2)(c) GDPR. A complete overview of
				the service providers we use can be found in our DPA (Annex 2: Sub-processors) .
			</p>

			{/* ========== 17. Changes ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">17. Changes to This Privacy Policy</h2>
			<p className="text-base leading-relaxed">
				We reserve the right to update this privacy policy as necessary to reflect changes in the
				legal framework or changes to our service. The current version is always available on this
				page.
			</p>
		</div>
	);
}
