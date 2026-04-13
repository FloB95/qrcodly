import Link from 'next/link';

export default function AgbContentEn() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Terms of Service</h1>
			<p className="text-sm text-muted-foreground mb-8">As of: April 2026</p>

			{/* ========== §1 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 1 Scope</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					These Terms of Service (hereinafter &ldquo;Terms&rdquo;) apply to the use of the SaaS
					platform QRcodly operated by Florian Breuer, FB-Development, 33378 Rheda-Wiedenbr&uuml;ck,
					Germany (hereinafter &ldquo;Provider&rdquo;) under the domain qrcodly.de (hereinafter
					&ldquo;Platform&rdquo;) and all associated services.
				</li>
				<li>
					These Terms apply to consumers within the meaning of § 13 BGB (German Civil Code) and to
					entrepreneurs within the meaning of &sect; 14 BGB (hereinafter collectively
					&ldquo;Users&rdquo;).
				</li>
				<li>
					Deviating, conflicting or supplementary terms and conditions of the User shall only become
					part of the contract if the Provider has expressly agreed to their applicability in
					writing.
				</li>
			</ol>

			{/* ========== §2 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				§ 2 Subject Matter and Description of Services
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Provider makes available to the User an internet-based service (Software-as-a-Service)
					via the Platform, which includes the following core features:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>
							Creation, design and management of QR codes (URL, vCard, WiFi, email, calendar,
							location, text, EPC)
						</li>
						<li>URL shortening and management (URL Shortener)</li>
						<li>Collection and analysis of scan statistics (Analytics)</li>
						<li>Custom domain integration (Custom Domains, in the Pro plan)</li>
						<li>Management of templates and tags for organization</li>
						<li>Export of QR codes in various formats (PNG, JPEG, SVG)</li>
					</ul>
				</li>
				<li>
					The exact scope of services depends on the respective plan (Free or Pro) as set out in the
					current pricing overview on the Platform.
				</li>
				<li>
					The Provider reserves the right to further develop the Platform and to expand, modify or
					restrict its range of features, provided that the essential contractual services are not
					materially impaired.
				</li>
			</ol>

			{/* ========== §3 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 3 Registration and User Account</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Use of the Platform requires registration. Registration is free of charge and is carried
					out via the external authentication service Clerk.
				</li>
				<li>
					The User is obligated to provide truthful and complete information during registration and
					to keep such information up to date.
				</li>
				<li>
					Each User may only create one user account. Access credentials must be kept confidential
					and must not be disclosed to third parties.
				</li>
				<li>
					The User is liable for all activities carried out through their user account, unless the
					User is not responsible for the unauthorized use.
				</li>
				<li>
					The Provider is entitled to suspend or delete user accounts in the event of a violation of
					these Terms or misuse of the Platform.
				</li>
			</ol>

			{/* ========== §4 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 4 Scope of Services and Plans</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Free Plan:</strong> The Provider offers a free basic plan with limited
					functionality. The specifics are set out in the current plan overview.
				</li>
				<li>
					<strong>Pro Plan:</strong> The Pro plan offers extended features, including the use of
					custom domains, advanced analytics features and analytics integrations (Google Analytics,
					Matomo). The scope of features is set out in the current plan overview.
				</li>
				<li>
					The Provider reserves the right to adjust the scope of features of the individual plans.
					Material restrictions to existing features will be communicated to Users at least 30 days
					in advance by email.
				</li>
			</ol>

			{/* ========== §5 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 5 Prices and Payment Terms</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The current prices for the Pro plan are set out in the pricing overview on the Platform.
					All prices stated are final prices. Due to the application of the small business
					regulation pursuant to &sect;&thinsp;19 UStG (German VAT Act), no value-added tax is
					charged and therefore not shown.
				</li>
				<li>
					Payment processing is handled by the payment service provider Stripe. By subscribing to
					the Pro plan, the User accepts the terms of use of Stripe.
				</li>
				<li>
					Billing is carried out in advance on a monthly or annual basis, depending on the selected
					billing period.
				</li>
				<li>
					The Provider is entitled to adjust prices with a notice period of at least 30 days
					effective at the end of the current billing period. In such case, the User has a special
					right of termination effective at the time the price change takes effect.
				</li>
				<li>
					In the event of payment default, the Provider is entitled to suspend access to Pro
					features after a reasonable grace period.
				</li>
			</ol>

			{/* ========== §6 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 6 Contract Term and Termination</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Free Plan:</strong> Use of the Free plan is for an indefinite period and may be
					terminated at any time without notice by deleting the user account.
				</li>
				<li>
					<strong>Pro Plan:</strong> The subscription is concluded for the selected billing period
					(monthly or annually) and is automatically renewed for the respective period unless
					terminated before the end of the current period.
				</li>
				<li>
					Termination of the Pro plan may be effected at any time via the account settings on the
					Platform or by email to info@qrcodly.de. The termination takes effect at the end of the
					current billing period.
				</li>
				<li>
					The right to extraordinary termination for good cause remains unaffected. Good cause
					exists for the Provider in particular if the User violates material provisions of these
					Terms.
				</li>
				<li>
					Upon termination of the contractual relationship, the User&apos;s data will be deleted in
					accordance with the provisions of the Privacy Policy and the Data Processing Agreement,
					unless statutory retention obligations apply.
				</li>
			</ol>

			{/* ========== §7 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 7 Availability and Maintenance</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Provider endeavors to ensure the highest possible uninterrupted availability of the
					Platform. A 100% availability cannot be technically guaranteed.
				</li>
				<li>
					Maintenance work will be announced in advance where possible and carried out outside of
					regular business hours. Necessary maintenance work causing temporary unavailability does
					not constitute a defect.
				</li>
				<li>
					The Provider shall not be liable for outages or restrictions attributable to force
					majeure, disruptions at third-party providers (e.g.&thinsp;hosting providers, payment
					service providers) or circumstances for which the User is responsible.
				</li>
			</ol>

			{/* ========== §8 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 8 User Obligations</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The User undertakes to use the Platform only in accordance with applicable laws and these
					Terms. In particular, the following is prohibited:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>
							Creating or using QR codes or short URLs for unlawful, fraudulent or misleading
							purposes
						</li>
						<li>
							Distributing content that violates applicable law (in particular copyright law,
							trademark law, personality rights)
						</li>
						<li>
							Using the Platform in a manner that impairs or endangers its operation
							(e.g.&thinsp;automated mass queries, denial-of-service attempts)
						</li>
						<li>Circumventing or exploiting security mechanisms of the Platform</li>
						<li>Sending spam or unsolicited bulk messages via QR codes or short URLs</li>
					</ul>
				</li>
				<li>
					The User is solely responsible for all content created through their account (QR codes,
					short URLs, vCards, etc.) and shall indemnify the Provider against any third-party claims
					arising from unlawful use.
				</li>
				<li>
					When using the custom domain feature, the User is solely responsible for the correct DNS
					configuration and compliance with the domain registration terms.
				</li>
				<li>
					Insofar as the User stores personal data of third parties in QR codes (e.g.&thinsp;vCard
					contact data), the User is the data controller responsible for the lawfulness of such
					processing.
				</li>
			</ol>

			{/* ========== §9 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				§ 9 Intellectual Property and Usage Rights
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The QRcodly platform is open-source software, published under the MIT License. The use of
					the source code is governed by the terms of this license.
				</li>
				<li>
					Content created by the User through the Platform (QR codes, short URLs, etc.) remains the
					property of the User. The Provider does not acquire any usage rights to such content
					beyond what is necessary for the provision of the service.
				</li>
				<li>
					The brand &ldquo;QRcodly&rdquo;, the logo and the design of the Platform are the property
					of the Provider and may not be used without prior permission.
				</li>
			</ol>

			{/* ========== §10 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 10 Limitation of Liability</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Provider shall be liable without limitation for damages arising from injury to life,
					body or health based on an intentional or negligent breach of duty by the Provider or a
					legal representative or vicarious agent.
				</li>
				<li>
					The Provider shall be liable without limitation for other damages based on an intentional
					or grossly negligent breach of duty by the Provider or a legal representative or vicarious
					agent.
				</li>
				<li>
					In the event of a breach of material contractual obligations (cardinal obligations) due to
					slight negligence, liability is limited to the foreseeable, contract-typical damage.
					Material contractual obligations are obligations whose fulfillment is essential for the
					proper execution of the contract and on the observance of which the User may regularly
					rely.
				</li>
				<li>
					Liability for slight negligence in breach of material contractual obligations is limited
					in amount to the fees paid by the User to the Provider in the 12 months preceding the
					event giving rise to the damage, but no more than 500&thinsp;&euro;. For users of the free
					plan, liability for slight negligence is excluded to the extent permitted by law.
				</li>
				<li>
					In all other respects, the Provider&apos;s liability &mdash; regardless of the legal basis
					&mdash; is excluded. This applies in particular to:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>Indirect damages, consequential damages, lost profits and lost savings</li>
						<li>Data loss caused by a failure of the User to back up data</li>
						<li>
							Damages caused by content that the User has created or distributed via the Platform
						</li>
						<li>
							Outages or disruptions of third-party services (Clerk, Stripe, Cloudflare, etc.)
						</li>
						<li>
							Damages arising from the use of third-party content linked via QR codes or short URLs
						</li>
						<li>
							Damages caused by unauthorized access to the user account, unless the Provider is
							responsible for the unauthorized use
						</li>
					</ul>
				</li>
				<li>
					The Platform is provided under the free plan &ldquo;as&thinsp;is&rdquo; without any
					express or implied warranty of fitness for a particular purpose or availability.
				</li>
				<li>
					Liability under the German Product Liability Act (Produkthaftungsgesetz) remains
					unaffected.
				</li>
			</ol>

			{/* ========== §11 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 11 Data Protection</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Provider processes the User&apos;s personal data in accordance with the General Data
					Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG). Details
					are set out in the{' '}
					<Link href="/privacy-policy" className="text-primary underline">
						Privacy Policy
					</Link>{' '}
					.
				</li>
				<li>
					Insofar as the User uses the Platform to process personal data of third parties
					(e.g.&thinsp;vCard contact data in QR codes, scan data of end users), the Provider acts as
					a data processor within the meaning of Art. 28 GDPR. The details of data processing are
					set out in the Data Processing Agreement (DPA) .
				</li>
			</ol>

			{/* ========== §12 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 12 Amendments to the Terms</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Provider is entitled to amend these Terms with effect for the future, provided that
					the amendment is reasonable for the User taking into account the interests of the
					Provider.
				</li>
				<li>
					The Provider will inform the User of amendments at least 30 days before the planned
					effective date by email. If the User does not object to the amendment within 30 days of
					receipt of the notification of amendment, the amendment shall be deemed approved. The
					Provider will inform the User in the notification of amendment of the right to object and
					the consequences of failing to object.
				</li>
				<li>
					In the event of an objection, the previous Terms shall continue to apply. In such case,
					the Provider has a special right of termination with a notice period of 30 days effective
					at the end of the month.
				</li>
			</ol>

			{/* ========== §13 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 13 Final Provisions</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The laws of the Federal Republic of Germany shall apply, excluding the UN Convention on
					Contracts for the International Sale of Goods (CISG). With respect to consumers, this
					choice of law shall only apply insofar as the protection granted is not withdrawn by
					mandatory provisions of the law of the consumer&apos;s habitual place of residence.
				</li>
				<li>
					If the User is a merchant, a legal entity under public law or a special fund under public
					law, the exclusive place of jurisdiction for all disputes arising from this contractual
					relationship shall be the registered office of the Provider.
				</li>
				<li>
					Should any provision of these Terms be or become invalid, the validity of the remaining
					provisions shall not be affected.
				</li>
				<li>
					The European Commission provides a platform for online dispute resolution (ODR):{' '}
					<a
						href="https://ec.europa.eu/consumers/odr/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline"
					>
						https://ec.europa.eu/consumers/odr/
					</a>
					. The Provider is not obligated and not willing to participate in a dispute resolution
					procedure before a consumer arbitration board.
				</li>
			</ol>

			<h2 className="text-2xl font-semibold mt-10 mb-4">Contact</h2>
			<address className="not-italic text-base leading-relaxed">
				Florian Breuer
				<br />
				FB-Development
				<br />
				33378 Rheda-Wiedenbr&uuml;ck
				<br />
				Deutschland
				<br />
				E-Mail:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</address>
		</div>
	);
}
