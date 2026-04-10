export default function AvvContentEn() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Data Processing Agreement (DPA)</h1>
			<p className="text-base leading-relaxed">
				pursuant to Art. 28 General Data Protection Regulation (GDPR)
			</p>
			<p className="text-sm text-muted-foreground mb-8">As of: April 2026</p>

			<h2 className="text-lg font-semibold mt-6 mb-2">Contracting Parties</h2>
			<p className="text-base leading-relaxed">
				<strong>Controller</strong> (hereinafter referred to as &ldquo;Controller&rdquo;): The
				respective customer who uses the services of QRcodly and has registered on the platform.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Processor</strong> (hereinafter referred to as &ldquo;Processor&rdquo;):
			</p>
			<address className="not-italic text-base leading-relaxed mb-6">
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

			{/* ========== PREAMBLE ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">Preamble</h2>
			<p className="text-base leading-relaxed">
				The Controller uses the SaaS platform QRcodly (hereinafter referred to as
				&ldquo;Service&rdquo;) for the creation, management, and tracking of QR codes as well as the
				shortening and analysis of URLs. In the course of this use, the Processor processes personal
				data on behalf of the Controller. This Agreement specifies the data protection obligations
				of the contracting parties pursuant to Art. 28 GDPR.
			</p>

			{/* ========== &sect;1 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 1 Subject Matter and Duration of Processing
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Subject Matter:</strong> The Processor processes personal data on behalf of the
					Controller in connection with the provision of the QRcodly platform. The details of the
					data processing are set out in Annex 3 of this Agreement.
				</li>
				<li>
					<strong>Duration:</strong> The processing commences upon the Controller&rsquo;s
					registration with QRcodly and ends upon the complete deletion of the user account or the
					termination of the contractual relationship. The obligations under this Agreement shall
					remain in effect for as long as the Processor processes personal data of the Controller or
					is in possession of such data.
				</li>
			</ol>

			{/* ========== &sect;2 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 2 Nature and Purpose of Processing
			</h2>
			<p className="text-base leading-relaxed">
				The processing of personal data by the Processor shall be carried out exclusively for the
				purpose of providing the following services:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Provision and operation of the QRcodly SaaS platform</li>
				<li>Creation, storage, and management of QR codes</li>
				<li>URL shortening and management of short links</li>
				<li>Collection and analysis of scan statistics (browser, device, location, referrer)</li>
				<li>Management of custom domains for the Controller</li>
				<li>Authentication and account management</li>
				<li>Billing and payment processing</li>
				<li>Sending transactional emails (e.g., subscription notifications)</li>
			</ul>

			{/* ========== &sect;3 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 3 Types of Personal Data</h2>
			<p className="text-base leading-relaxed">
				The following types of personal data are subject to processing:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Account data:</strong> Email address, name, user ID, authentication data
				</li>
				<li>
					<strong>Content data:</strong> Information contained in QR codes (URLs, vCard contact
					data, Wi-Fi credentials, email addresses, calendar entries, location data, free text, EPC
					payment data)
				</li>
				<li>
					<strong>Usage data / Scan data:</strong> IP address, browser type, operating system,
					device type, language, referrer URL, screen resolution, country of origin, scan timestamp
				</li>
				<li>
					<strong>Billing data:</strong> Stripe customer ID, subscription status, billing periods
					(payment data such as credit card numbers are processed exclusively by Stripe and are not
					stored by QRcodly)
				</li>
				<li>
					<strong>Technical data:</strong> Error logs, application logs, performance metrics
				</li>
			</ul>

			{/* ========== &sect;4 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 4 Categories of Data Subjects</h2>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Registered users of the QRcodly platform (employees, agents, or other representatives of
					the Controller)
				</li>
				<li>
					Persons whose personal data is contained in QR codes created by the Controller (e.g.,
					contact data in vCards)
				</li>
				<li>
					End users who scan QR codes created by the Controller (whose scan data is collected)
				</li>
			</ul>

			{/* ========== &sect;5 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 5 Obligations of the Processor</h2>
			<ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
				<li>
					The Processor shall process personal data only on documented instructions from the
					Controller &mdash; including with regard to transfers of personal data to a third country
					&mdash; unless required to do so by Union or Member State law to which the Processor is
					subject. In such a case, the Processor shall inform the Controller of that legal
					requirement before processing, unless that law prohibits such notification on important
					grounds of public interest.
				</li>
				<li>
					The Processor shall ensure that persons authorized to process the personal data have
					committed themselves to confidentiality or are under an appropriate statutory obligation
					of confidentiality.
				</li>
				<li>
					The Processor shall take all measures required pursuant to Art. 32 GDPR (technical and
					organizational measures). The current measures are described in Annex 1.
				</li>
				<li>
					The Processor shall not engage another processor without prior specific or general written
					authorization of the Controller. In the case of general written authorization, the
					Processor shall inform the Controller of any intended changes concerning the addition or
					replacement of other processors, thereby giving the Controller the opportunity to object
					to such changes. The current sub-processors are listed in Annex 2.
				</li>
				<li>
					The Processor shall assist the Controller, insofar as this is possible, by appropriate
					technical and organizational measures, in fulfilling the Controller&rsquo;s obligation to
					respond to requests for exercising the data subject&rsquo;s rights laid down in Chapter
					III of the GDPR.
				</li>
				<li>
					Taking into account the nature of the processing and the information available to the
					Processor, the Processor shall assist the Controller in ensuring compliance with the
					obligations pursuant to Articles 32 to 36 of the GDPR (security of processing,
					notification of personal data breaches, data protection impact assessment, prior
					consultation).
				</li>
				<li>
					At the choice of the Controller, the Processor shall delete or return all personal data to
					the Controller after the end of the provision of services relating to the processing, and
					shall delete existing copies unless Union or Member State law requires the storage of the
					personal data.
				</li>
				<li>
					The Processor shall inform the Controller without undue delay if, in the Processor&rsquo;s
					opinion, an instruction infringes the GDPR or other Union or Member State data protection
					provisions.
				</li>
			</ol>

			{/* ========== &sect;6 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 6 Notification of Personal Data Breaches
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Processor shall notify the Controller without undue delay and, where feasible, within
					48 hours after becoming aware of a personal data breach, by email to the email address
					registered in the user account.
				</li>
				<li>
					The notification shall contain at least the following information: the nature of the
					breach, the categories and approximate number of data subjects and data records affected,
					the likely consequences of the breach, and the measures taken or proposed to be taken.
				</li>
			</ol>

			{/* ========== &sect;7 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 7 Sub-processing</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Controller hereby grants general authorization for the engagement of additional
					processors (sub-processors). The sub-processors engaged at the time of conclusion of this
					Agreement are listed in Annex 2.
				</li>
				<li>
					The Processor shall inform the Controller at least 30 days in advance of any intended
					changes regarding sub-processors by email. The Controller may object to the change within
					14 days of notification on legitimate grounds.
				</li>
				<li>
					In the event of a legitimate objection, the Processor shall endeavor to find a reasonable
					alternative solution. If no such alternative is possible, the Controller shall have the
					right of extraordinary termination.
				</li>
				<li>
					The Processor shall ensure that sub-processors are subject to the same data protection
					obligations as the Processor itself.
				</li>
				<li>
					For data transfers to third countries (outside the EEA), the Processor shall ensure that
					an adequate level of data protection is guaranteed, in particular through EU Standard
					Contractual Clauses (SCCs) pursuant to Art. 46(2)(c) GDPR or an adequacy decision of the
					European Commission.
				</li>
			</ol>

			{/* ========== &sect;8 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 8 Rights of Data Subjects</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Processor shall assist the Controller in fulfilling data subject rights (Art.
					15&ndash;22 GDPR) to the extent technically feasible and reasonable.
				</li>
				<li>
					If a data subject contacts the Processor directly, the Processor shall forward the request
					to the Controller without undue delay.
				</li>
			</ol>

			{/* ========== &sect;9 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 9 Deletion and Return of Data</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Upon termination of the contractual relationship, the Processor shall delete all personal
					data processed on behalf of the Controller, unless there is a statutory obligation to
					retain the data. Deletion shall take place within 30 days of the end of the contract.
				</li>
				<li>
					Upon request by the Controller, the Processor shall provide a copy of the data in a
					commonly used, machine-readable format prior to deletion.
				</li>
				<li>
					The Processor shall confirm the complete deletion in writing to the Controller upon
					request.
				</li>
			</ol>

			{/* ========== &sect;10 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 10 Accountability and Audit Rights
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					The Processor shall make available to the Controller all information necessary to
					demonstrate compliance with the obligations laid down in Art. 28 GDPR.
				</li>
				<li>
					The Processor shall allow for and contribute to audits, including inspections, conducted
					by the Controller or another auditor mandated by the Controller. The costs of such an
					audit shall be borne by the Controller.
				</li>
				<li>
					Audits shall be conducted with a notice period of at least 14 days and with due regard for
					appropriate confidentiality. They shall not disproportionately disrupt the
					Processor&rsquo;s business operations.
				</li>
			</ol>

			{/* ========== &sect;11 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 11 Liability</h2>
			<p className="text-base leading-relaxed">
				The liability of the parties shall be governed by the statutory provisions of the GDPR, in
				particular Art. 82 GDPR. The limitations of liability set forth in the General Terms and
				Conditions of QRcodly shall apply in addition.
			</p>

			{/* ========== &sect;12 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 12 Final Provisions</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Amendments and supplements to this Agreement must be made in text form (email shall
					suffice). This requirement shall also apply to any waiver of this formal requirement.
				</li>
				<li>
					Should any provision of this Agreement be or become invalid, the validity of the remaining
					provisions shall not be affected. The invalid provision shall be replaced by a valid
					provision that most closely approximates the economic purpose of the invalid provision.
				</li>
				<li>
					This Agreement shall be governed by German law. The place of jurisdiction shall be the
					registered office of the Processor, to the extent permitted by law.
				</li>
				<li>
					In the event of conflicts between this Agreement and any other agreements between the
					parties, the provisions of this Data Processing Agreement shall prevail with respect to
					the protection of personal data.
				</li>
			</ol>

			{/* ================================================================ */}
			{/*                     ANNEX 1: TOMs                                */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Annex 1: Technical and Organizational Measures (TOMs)
			</h2>
			<p className="text-base leading-relaxed">
				pursuant to Art. 32 GDPR &mdash; As of: April 2026
			</p>
			<p className="text-base leading-relaxed">
				The following technical and organizational measures describe the security measures actually
				implemented on the QRcodly platform.
			</p>

			{/* ----- 1. Confidentiality ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">1. Confidentiality (Art. 32(1)(b) GDPR)</h3>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.1 Physical Access Control</h4>
			<p className="text-base leading-relaxed">
				Measures to prevent unauthorized persons from gaining physical access to data processing
				facilities:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Server hosting with Hetzner Online GmbH in ISO 27001-certified data centers in Germany
				</li>
				<li>
					Data center access control systems: electronic access control, video surveillance, 24/7
					security personnel (managed by Hetzner)
				</li>
				<li>
					The Processor has no physical access to server hardware; administration is carried out
					exclusively via encrypted remote connections
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.2 System Access Control</h4>
			<p className="text-base leading-relaxed">
				Measures to prevent data processing systems from being used by unauthorized persons:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Authentication via Clerk (industry-standard OAuth 2.0 / OpenID Connect) with optional
					two-factor authentication
				</li>
				<li>JWT token-based API authentication with cryptographically signed tokens</li>
				<li>Signed cookies with server-side secret (minimum 32 characters)</li>
				<li>
					Redis-based rate limiting per IP address and user to protect against brute-force attacks
				</li>
				<li>Automatic IP abuse detection and blocking</li>
				<li>
					Server-side credentials (database passwords, API keys) are managed as environment
					variables and are not stored in source code
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.3 Data Access Control</h4>
			<p className="text-base leading-relaxed">
				Measures to ensure that authorized users can only access data within the scope of their
				access rights:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Tenant isolation: All database queries are filtered by user ID &mdash; each user has
					access exclusively to their own data
				</li>
				<li>
					AES-256-GCM encryption for stored analytics credentials (Google Analytics / Matomo API
					credentials of customers)
				</li>
				<li>Strict input validation of all API requests using Zod schema validation</li>
				<li>
					Data minimization: Payment data (credit card numbers, etc.) is not stored by QRcodly but
					is processed exclusively by Stripe
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.4 Separation Control</h4>
			<p className="text-base leading-relaxed">
				Measures to ensure that data collected for different purposes is processed separately:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Multi-tenancy through consistent user ID-based data separation across all database tables
				</li>
				<li>
					Logical separation of application data (MySQL) and analytics data (Umami/PostgreSQL)
				</li>
				<li>Separate database schemas for different functional areas</li>
				<li>Separate processing of customer data, scan analytics, and billing information</li>
			</ul>

			{/* ----- 2. Integrity ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">2. Integrity (Art. 32(1)(b) GDPR)</h3>

			<h4 className="text-lg font-semibold mt-5 mb-2">2.1 Transfer Control</h4>
			<p className="text-base leading-relaxed">
				Measures to ensure that personal data cannot be read, copied, modified, or removed without
				authorization during electronic transmission or storage:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>TLS/HTTPS encryption for all data transmissions between client and server</li>
				<li>CORS configuration restricts API access to authorized domains</li>
				<li>Cloudflare SSL certificates for custom domains with automatic renewal</li>
				<li>
					Encrypted communication with all third-party providers (Clerk, Stripe, Sentry, etc.)
				</li>
				<li>Signed webhooks (Clerk, Stripe) to ensure the authenticity of incoming messages</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">2.2 Input Control</h4>
			<p className="text-base leading-relaxed">
				Measures to ensure that it is possible to verify and establish retroactively whether and by
				whom personal data has been entered, modified, or removed:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Complete logging of all data changes with timestamps (createdAt, updatedAt)</li>
				<li>Attribution of all records to authenticated users (createdBy field)</li>
				<li>
					Soft-delete mechanism for short URLs (data is not immediately deleted but marked as
					deleted)
				</li>
				<li>Structured application logging (Pino Logger) with contextual information</li>
				<li>Centralized log management via Axiom for complete traceability</li>
			</ul>

			{/* ----- 3. Availability and Resilience ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				3. Availability and Resilience (Art. 32(1)(b) GDPR)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Hetzner data centers with redundant power supply, climate control, and network
					connectivity
				</li>
				<li>Redis caching layer for performance optimization and reduction of database load</li>
				<li>
					Real-time error monitoring via Sentry with immediate notification of critical errors
				</li>
				<li>
					Proactive system monitoring via Axiom (application metrics and performance monitoring)
				</li>
				<li>Rate limiting for protection against overload and denial-of-service attacks</li>
				<li>Regular database backups via Hetzner infrastructure</li>
			</ul>

			{/* ----- 4. Recoverability ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				4. Rapid Recoverability (Art. 32(1)(c) GDPR)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Regular automatic database backups with recovery capability</li>
				<li>Disaster recovery capability via Hetzner infrastructure</li>
				<li>
					Full version control of source code via Git (enabling rapid restoration of application
					state)
				</li>
				<li>Automated database migrations for consistent schema updates</li>
			</ul>

			{/* ----- 5. Review Procedures ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				5. Procedures for Regular Review, Assessment, and Evaluation (Art. 32(1)(d) GDPR)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Open-source codebase under MIT license enables independent third-party security audits
				</li>
				<li>Automated test suite (Jest) to ensure application integrity</li>
				<li>Continuous error monitoring and analysis via Sentry</li>
				<li>Regular review and updating of dependencies (security patches)</li>
				<li>Documented data protection processes in this Data Processing Agreement</li>
			</ul>

			{/* ================================================================ */}
			{/*               ANNEX 2: Sub-processors                            */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Annex 2: Approved Sub-processors
			</h2>
			<p className="text-base leading-relaxed mb-6">As of: April 2026</p>

			<div className="overflow-x-auto">
				<table className="min-w-full text-sm border-collapse">
					<thead>
						<tr className="border-b-2 border-gray-300">
							<th className="text-left py-2 pr-4 font-semibold">Sub-processor</th>
							<th className="text-left py-2 pr-4 font-semibold">Purpose</th>
							<th className="text-left py-2 pr-4 font-semibold">Location</th>
							<th className="text-left py-2 font-semibold">Safeguards</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Hetzner Online GmbH
								<br />
								<span className="text-xs text-gray-500">Industriestr. 25, 91710 Gunzenhausen</span>
							</td>
							<td className="py-3 pr-4 align-top">
								Server hosting, infrastructure, database hosting, backups
							</td>
							<td className="py-3 pr-4 align-top">Germany (EU)</td>
							<td className="py-3 align-top">DPA with Hetzner, ISO 27001</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Clerk, Inc.
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								Authentication, user management, session management
							</td>
							<td className="py-3 pr-4 align-top">USA</td>
							<td className="py-3 align-top">EU Standard Contractual Clauses (SCCs), DPA</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Stripe, Inc. / Stripe Payments Europe, Ltd.
								<br />
								<span className="text-xs text-gray-500">Dublin, Ireland / USA</span>
							</td>
							<td className="py-3 pr-4 align-top">Payment processing, subscription management</td>
							<td className="py-3 pr-4 align-top">Ireland (EU) / USA</td>
							<td className="py-3 align-top">EU establishment, SCCs, PCI DSS Level 1</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Cloudflare, Inc.
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								CDN, DNS management, SSL certificates for custom domains
							</td>
							<td className="py-3 pr-4 align-top">USA (EU processing)</td>
							<td className="py-3 align-top">SCCs, DPA, ISO 27001</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Functional Software, Inc. (Sentry)
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">Error monitoring, performance monitoring</td>
							<td className="py-3 pr-4 align-top">USA</td>
							<td className="py-3 align-top">SCCs, DPA</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Axiom, Inc.
								<br />
								<span className="text-xs text-gray-500">USA</span>
							</td>
							<td className="py-3 pr-4 align-top">Structured application logging, metrics</td>
							<td className="py-3 pr-4 align-top">USA</td>
							<td className="py-3 align-top">SCCs, DPA</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								PostHog, Inc.
								<br />
								<span className="text-xs text-gray-500">USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								Product analytics (anonymized usage statistics)
							</td>
							<td className="py-3 pr-4 align-top">USA (EU hosting available)</td>
							<td className="py-3 align-top">SCCs, DPA</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p className="text-base leading-relaxed mt-4">
				<strong>Note:</strong> The scan analytics service (Umami) is operated on the
				Processor&rsquo;s own Hetzner infrastructure (self-hosted) and does not constitute a
				separate sub-processor.
			</p>

			{/* ================================================================ */}
			{/*          ANNEX 3: Description of Data Processing                  */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Annex 3: Description of Data Processing
			</h2>

			<h3 className="text-xl font-semibold mt-6 mb-3">1. Overview of Processing Activities</h3>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm border-collapse">
					<thead>
						<tr className="border-b-2 border-gray-300">
							<th className="text-left py-2 pr-4 font-semibold">Processing Activity</th>
							<th className="text-left py-2 pr-4 font-semibold">Data Processed</th>
							<th className="text-left py-2 font-semibold">Storage Location</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">User registration</td>
							<td className="py-3 pr-4 align-top">Email, name, user ID</td>
							<td className="py-3 align-top">Clerk (auth provider)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">QR code creation</td>
							<td className="py-3 pr-4 align-top">
								QR code content (URLs, vCards, Wi-Fi, email, calendar, location, text, EPC), design
								configuration, preview images
							</td>
							<td className="py-3 align-top">MySQL database, S3 storage (Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">URL shortening</td>
							<td className="py-3 pr-4 align-top">
								Target URL, 5-character short code, custom domain assignment
							</td>
							<td className="py-3 align-top">MySQL database (Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Scan tracking</td>
							<td className="py-3 pr-4 align-top">
								IP address, user agent, browser, operating system, device type, language, referrer,
								screen resolution, country of origin
							</td>
							<td className="py-3 align-top">Umami (self-hosted, Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Payment processing</td>
							<td className="py-3 pr-4 align-top">
								Stripe customer ID, subscription status, billing periods
							</td>
							<td className="py-3 align-top">MySQL database (Hetzner), Stripe</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Custom domain management</td>
							<td className="py-3 pr-4 align-top">Domain name, DNS records, SSL status</td>
							<td className="py-3 align-top">MySQL database (Hetzner), Cloudflare</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Analytics integration</td>
							<td className="py-3 pr-4 align-top">
								Encrypted API credentials of the customer (Google Analytics, Matomo)
							</td>
							<td className="py-3 align-top">MySQL database (Hetzner), AES-256-GCM encrypted</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3 className="text-xl font-semibold mt-8 mb-3">2. Data Deletion and Retention Periods</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Account data:</strong> Deleted upon deletion of the user account
				</li>
				<li>
					<strong>QR codes and short URLs:</strong> Deleted upon deletion of the user account; short
					URLs are initially marked as deleted (soft delete) and permanently removed after the
					retention period expires
				</li>
				<li>
					<strong>Scan data:</strong> Stored in aggregated form in Umami; IP addresses are not
					stored permanently
				</li>
				<li>
					<strong>Billing data:</strong> Retained in accordance with commercial and tax law
					obligations (generally 10 years pursuant to &sect;&thinsp;147 AO, &sect;&thinsp;257 HGB)
				</li>
				<li>
					<strong>Error logs:</strong> Automatically deleted after 90 days (Sentry retention)
				</li>
			</ul>

			<p className="mt-12 text-sm text-muted-foreground">
				This Data Processing Agreement is based on the requirements of Art. 28 GDPR and is modeled
				on the template DPA of the Bavarian State Office for Data Protection Supervision (BayLDA)
				and the Bitkom template.
			</p>
		</div>
	);
}
