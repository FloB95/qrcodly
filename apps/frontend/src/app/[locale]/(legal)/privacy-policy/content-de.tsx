export default function PrivacyPolicyContentDe() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Datenschutzerkl&auml;rung</h1>
			<p className="text-sm text-muted-foreground mb-8">Stand: April 2026</p>

			{/* ========== 1. Verantwortlicher ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">1. Verantwortlicher und Kontakt</h2>
			<p className="text-base leading-relaxed">
				Verantwortlicher f&uuml;r die Datenverarbeitung auf dieser Website im Sinne der
				Datenschutz-Grundverordnung (DSGVO):
			</p>
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

			{/* ========== 2. &Uuml;bersicht ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				2. &Uuml;bersicht der Datenverarbeitungen
			</h2>

			<h3 className="text-xl font-semibold mt-6 mb-2">Welche Daten erheben wir?</h3>
			<p className="text-base leading-relaxed">
				Wir verarbeiten personenbezogene Daten nur, soweit dies f&uuml;r die Bereitstellung der
				QRcodly-Plattform und der damit verbundenen Dienste erforderlich ist. Im Einzelnen:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Kontodaten:</strong> E-Mail-Adresse, Name und Benutzer-ID bei der Registrierung
					(&uuml;ber unseren Authentifizierungsdienst Clerk)
				</li>
				<li>
					<strong>Nutzungsdaten:</strong> Technische Informationen wie Browser-Typ, Betriebssystem,
					Ger&auml;tetyp, Bildschirmaufl&ouml;sung, IP-Adresse und Zugriffszeiten
				</li>
				<li>
					<strong>Inhaltsdaten:</strong> Von Ihnen erstellte Inhalte (QR-Codes, Kurz-URLs, Vorlagen,
					Tags)
				</li>
				<li>
					<strong>Scan-Daten:</strong> Beim Scannen von QR-Codes bzw. Aufrufen von Kurz-URLs:
					IP-Adresse, Browser, Betriebssystem, Ger&auml;tetyp, Sprache, Referrer, Herkunftsland
				</li>
				<li>
					<strong>Zahlungsdaten:</strong> Abrechnungsinformationen bei Abschluss eines
					kostenpflichtigen Abonnements (verarbeitet durch Stripe)
				</li>
			</ul>

			<h3 className="text-xl font-semibold mt-6 mb-2">Rechtsgrundlagen</h3>
			<p className="text-base leading-relaxed">
				Die Verarbeitung Ihrer Daten erfolgt auf Grundlage folgender Rechtsgrundlagen:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Art. 6 Abs. 1 lit. b DSGVO</strong> &mdash; Vertragserf&uuml;llung: Verarbeitung,
					die zur Erf&uuml;llung des Nutzungsvertrags erforderlich ist (Kontoverwaltung,
					QR-Code-Erstellung, Scan-Analyse, Zahlungsabwicklung)
				</li>
				<li>
					<strong>Art. 6 Abs. 1 lit. f DSGVO</strong> &mdash; Berechtigtes Interesse:
					Gew&auml;hrleistung der Sicherheit und Verf&uuml;gbarkeit des Dienstes
					(Fehler&uuml;berwachung, Logging, Missbrauchsschutz)
				</li>
				<li>
					<strong>Art. 6 Abs. 1 lit. a DSGVO</strong> &mdash; Einwilligung: Soweit wir Ihre
					Einwilligung f&uuml;r bestimmte Verarbeitungen einholen
				</li>
				<li>
					<strong>Art. 6 Abs. 1 lit. c DSGVO</strong> &mdash; Rechtliche Verpflichtung: Soweit
					gesetzliche Aufbewahrungspflichten bestehen (z.&thinsp;B. steuerrechtliche Pflichten)
				</li>
			</ul>

			{/* ========== 3. Hosting ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">3. Hosting</h2>
			<p className="text-base leading-relaxed">
				Diese Website wird bei Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen,
				Deutschland, gehostet. Hetzner betreibt ISO-27001-zertifizierte Rechenzentren in
				Deutschland.
			</p>
			<p className="text-base leading-relaxed">
				Beim Besuch unserer Website erfasst der Server automatisch technische Daten in sogenannten
				Server-Log-Dateien: IP-Adresse, Datum und Uhrzeit der Anfrage, angeforderte URL,
				Referrer-URL, Browser-Typ und -Version, Betriebssystem.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				sicheren und stabilen Bereitstellung der Website).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Auftragsverarbeitung:</strong> Mit Hetzner besteht ein Vertrag zur
				Auftragsverarbeitung (AVV).
			</p>

			{/* ========== 4. Authentifizierung ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">4. Authentifizierung (Clerk)</h2>
			<p className="text-base leading-relaxed">
				F&uuml;r die Registrierung und Anmeldung nutzen wir den Dienst Clerk (Clerk, Inc., San
				Francisco, CA, USA). Clerk verarbeitet Ihre E-Mail-Adresse, Ihren Namen, Profilinformationen
				und Authentifizierungsdaten.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung &mdash;
				die Authentifizierung ist Voraussetzung f&uuml;r die Nutzung der Plattform).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Drittlandtransfer:</strong> Clerk hat seinen Sitz in den USA. Die
				Daten&uuml;bermittlung erfolgt auf Grundlage von EU-Standardvertragsklauseln (SCCs)
				gem&auml;&szlig; Art. 46 Abs. 2 lit. c DSGVO.
			</p>

			{/* ========== 5. Zahlungsabwicklung ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">5. Zahlungsabwicklung (Stripe)</h2>
			<p className="text-base leading-relaxed">
				F&uuml;r die Abwicklung von Zahlungen im Pro-Tarif nutzen wir Stripe (Stripe, Inc. / Stripe
				Payments Europe, Ltd., Dublin, Irland). Stripe verarbeitet Ihre Zahlungsinformationen
				(Kreditkartendaten, Bankverbindung), E-Mail-Adresse und Transaktionsdaten. Zahlungsdaten wie
				Kreditkartennummern werden ausschlie&szlig;lich von Stripe verarbeitet und nicht auf unseren
				Servern gespeichert.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung).
			</p>
			<p className="text-base leading-relaxed">
				Stripe verf&uuml;gt &uuml;ber eine EU-Niederlassung in Irland und ist PCI DSS Level 1
				zertifiziert. Weitere Informationen:{' '}
				<a
					href="https://stripe.com/de/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline"
				>
					Stripe Datenschutzerkl&auml;rung
				</a>
				.
			</p>

			{/* ========== 6. Scan-Analyse ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">6. Scan-Analyse (Umami)</h2>
			<p className="text-base leading-relaxed">
				Zur Erfassung und Auswertung von QR-Code-Scans und Kurz-URL-Aufrufen setzen wir Umami ein,
				eine datenschutzfreundliche Analyse-Software. Umami wird von uns selbst auf unserer eigenen
				Hetzner-Infrastruktur in Deutschland betrieben (Self-Hosted) und ist kein externer
				Drittdienst.
			</p>
			<p className="text-base leading-relaxed">Bei einem Scan werden folgende Daten erfasst:</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>IP-Adresse (wird nicht dauerhaft gespeichert)</li>
				<li>Browser-Typ und -Version</li>
				<li>Betriebssystem</li>
				<li>Ger&auml;tetyp (Desktop, Mobil, Tablet)</li>
				<li>Sprache</li>
				<li>Referrer-URL</li>
				<li>Herkunftsland (abgeleitet aus der IP-Adresse)</li>
				<li>Zeitstempel des Scans</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung &mdash;
				die Scan-Analyse ist Kernbestandteil des Dienstes).
			</p>
			<p className="text-base leading-relaxed">
				Umami setzt keine Cookies und erstellt keine ger&auml;te&uuml;bergreifenden Profile. Die
				Daten werden in aggregierter Form gespeichert.
			</p>

			{/* ========== 7. Fehler&uuml;berwachung ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">7. Fehler&uuml;berwachung (Sentry)</h2>
			<p className="text-base leading-relaxed">
				Wir nutzen Sentry (Functional Software, Inc., San Francisco, CA, USA) zur &Uuml;berwachung
				von Fehlern und zur Sicherstellung der Stabilit&auml;t unserer Plattform. Im Fehlerfall
				k&ouml;nnen folgende Daten an Sentry &uuml;bermittelt werden:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Fehlerdetails und Stack-Traces</li>
				<li>Browser- und Ger&auml;teinformationen</li>
				<li>URL der aufgerufenen Seite</li>
				<li>IP-Adresse (anonymisiert)</li>
				<li>Zeitpunkt des Fehlers</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				Fehlerbehebung und Stabilit&auml;t des Dienstes).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Drittlandtransfer:</strong> SCCs gem&auml;&szlig; Art. 46 Abs. 2 lit. c DSGVO.
				Fehlerprotokolle werden nach 90 Tagen automatisch gel&ouml;scht.
			</p>

			{/* ========== 8. Produktanalyse ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">8. Produktanalyse (PostHog)</h2>
			<p className="text-base leading-relaxed">
				Zur Verbesserung unserer Plattform nutzen wir PostHog (PostHog, Inc., USA) f&uuml;r
				anonymisierte Produktanalysen. PostHog erfasst:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Anonymisierte Nutzungsereignisse (z.&thinsp;B. QR-Code erstellt, Button geklickt)</li>
				<li>Seitenaufrufe</li>
				<li>Technische Ger&auml;te- und Browserinformationen</li>
			</ul>
			<p className="text-base leading-relaxed">
				Es werden keine personenbezogenen Daten wie E-Mail-Adressen oder Namen an PostHog
				&uuml;bermittelt.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				Verbesserung des Dienstes).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Drittlandtransfer:</strong> SCCs gem&auml;&szlig; Art. 46 Abs. 2 lit. c DSGVO.
			</p>

			{/* ========== 9. CDN und SSL ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">9. CDN und Custom Domains (Cloudflare)</h2>
			<p className="text-base leading-relaxed">
				F&uuml;r die Bereitstellung von SSL-Zertifikaten f&uuml;r Custom Domains und die
				DNS-Verwaltung nutzen wir Cloudflare (Cloudflare, Inc., San Francisco, CA, USA). Cloudflare
				kann dabei technische Verbindungsdaten (IP-Adresse, angefragte Domain) verarbeiten.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung &mdash;
				Custom Domains sind eine vertragliche Leistung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
				Interesse an der Sicherheit).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Drittlandtransfer:</strong> SCCs, DPA, ISO 27001.
			</p>

			{/* ========== 10. Logging ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">10. Anwendungsprotokollierung (Axiom)</h2>
			<p className="text-base leading-relaxed">
				F&uuml;r die strukturierte Protokollierung von Anwendungsereignissen nutzen wir Axiom
				(Axiom, Inc., USA). Axiom speichert technische Anwendungsprotokolle, die in
				Ausnahmef&auml;llen auch IP-Adressen oder Anfragemetadaten enthalten k&ouml;nnen.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
				Fehlererkennung und dem sicheren Betrieb).
			</p>
			<p className="text-base leading-relaxed">
				<strong>Drittlandtransfer:</strong> SCCs gem&auml;&szlig; Art. 46 Abs. 2 lit. c DSGVO.
			</p>

			{/* ========== 11. Google Maps ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">11. Google Maps API</h2>
			<p className="text-base leading-relaxed">
				F&uuml;r die Standorteingabe bei der Erstellung von Standort-QR-Codes nutzen wir die Google
				Maps API (Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland). Bei Nutzung
				der Standortsuche werden Suchanfragen und ggf. Ihre IP-Adresse an Google &uuml;bermittelt.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung &mdash;
				die Standortsuche ist Bestandteil der QR-Code-Erstellung).
			</p>
			<p className="text-base leading-relaxed">
				Weitere Informationen:{' '}
				<a
					href="https://policies.google.com/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline"
				>
					Google Datenschutzerkl&auml;rung
				</a>
				.
			</p>

			{/* ========== 12. Cookies ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">12. Cookies</h2>
			<p className="text-base leading-relaxed">
				Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die auf Ihrem Ger&auml;t
				gespeichert werden. Folgende Arten von Cookies werden eingesetzt:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Technisch notwendige Cookies:</strong> Session-Cookies f&uuml;r die
					Authentifizierung (Clerk) &mdash; diese sind f&uuml;r den Betrieb der Plattform zwingend
					erforderlich
				</li>
				<li>
					<strong>Funktionale Cookies:</strong> Speicherung von
					Benutzeroberfl&auml;cheneinstellungen (z.&thinsp;B. QR-Code-Generator-Status im Local
					Storage)
				</li>
			</ul>
			<p className="text-base leading-relaxed">
				<strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
				f&uuml;r technisch notwendige Cookies. Umami und PostHog arbeiten cookieless und setzen
				keine Cookies.
			</p>

			{/* ========== 13. Auftragsverarbeitung ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">13. Auftragsverarbeitung</h2>
			<p className="text-base leading-relaxed">
				Soweit Sie die Plattform nutzen, um personenbezogene Daten Dritter zu verarbeiten
				(z.&thinsp;B. Kontaktdaten in vCard-QR-Codes, Scan-Daten von Endnutzern), handeln wir als
				Auftragsverarbeiter im Sinne des Art. 28 DSGVO. Die Einzelheiten sind in unserer{' '}
				Auftragsverarbeitungsvereinbarung (AVV) geregelt.
			</p>

			{/* ========== 14. Rechte ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">14. Ihre Rechte als betroffene Person</h2>
			<p className="text-base leading-relaxed">Nach der DSGVO stehen Ihnen folgende Rechte zu:</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Sie k&ouml;nnen Auskunft &uuml;ber die
					von uns verarbeiteten personenbezogenen Daten verlangen.
				</li>
				<li>
					<strong>Berichtigung (Art. 16 DSGVO):</strong> Sie k&ouml;nnen die Berichtigung
					unrichtiger Daten verlangen.
				</li>
				<li>
					<strong>L&ouml;schung (Art. 17 DSGVO):</strong> Sie k&ouml;nnen die L&ouml;schung Ihrer
					Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
				</li>
				<li>
					<strong>Einschr&auml;nkung (Art. 18 DSGVO):</strong> Sie k&ouml;nnen die
					Einschr&auml;nkung der Verarbeitung verlangen.
				</li>
				<li>
					<strong>Daten&uuml;bertragbarkeit (Art. 20 DSGVO):</strong> Sie k&ouml;nnen die Herausgabe
					Ihrer Daten in einem maschinenlesbaren Format verlangen.
				</li>
				<li>
					<strong>Widerspruch (Art. 21 DSGVO):</strong> Sie k&ouml;nnen jederzeit Widerspruch gegen
					die Verarbeitung auf Basis eines berechtigten Interesses einlegen.
				</li>
				<li>
					<strong>Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO):</strong> Sie k&ouml;nnen eine
					erteilte Einwilligung jederzeit mit Wirkung f&uuml;r die Zukunft widerrufen.
				</li>
			</ul>
			<p className="text-base leading-relaxed">
				Zur Aus&uuml;bung Ihrer Rechte wenden Sie sich bitte an{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
				.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Beschwerderecht:</strong> Sie haben das Recht, sich bei einer
				Datenschutz-Aufsichtsbeh&ouml;rde zu beschweren. Die f&uuml;r uns zust&auml;ndige
				Aufsichtsbeh&ouml;rde ist die Landesbeauftragte f&uuml;r Datenschutz und
				Informationsfreiheit Nordrhein-Westfalen (LDI NRW).
			</p>

			{/* ========== 15. Speicherdauer ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">15. Speicherdauer und L&ouml;schung</h2>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Kontodaten:</strong> Werden bei L&ouml;schung Ihres Nutzerkontos gel&ouml;scht
				</li>
				<li>
					<strong>QR-Codes und Kurz-URLs:</strong> Werden bei Kontol&ouml;schung entfernt
				</li>
				<li>
					<strong>Scan-Daten:</strong> Aggregiert gespeichert; IP-Adressen werden nicht dauerhaft
					gespeichert
				</li>
				<li>
					<strong>Zahlungsdaten:</strong> Gem&auml;&szlig; handels- und steuerrechtlichen
					Aufbewahrungspflichten (bis zu 10 Jahre, &sect;&thinsp;147 AO, &sect;&thinsp;257 HGB)
				</li>
				<li>
					<strong>Fehlerprotokolle (Sentry):</strong> Automatische L&ouml;schung nach 90 Tagen
				</li>
				<li>
					<strong>Server-Logs:</strong> Werden nach 30 Tagen gel&ouml;scht
				</li>
			</ul>

			{/* ========== 16. Drittl&auml;nder ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				16. Daten&uuml;bermittlung in Drittl&auml;nder
			</h2>
			<p className="text-base leading-relaxed">
				Einige der von uns eingesetzten Dienstleister haben ihren Sitz in den USA (Clerk, Stripe,
				Cloudflare, Sentry, Axiom, PostHog). Die Daten&uuml;bermittlung in die USA erfolgt auf
				Grundlage von EU-Standardvertragsklauseln (SCCs) gem&auml;&szlig; Art. 46 Abs. 2 lit. c
				DSGVO. Eine vollst&auml;ndige &Uuml;bersicht der eingesetzten Dienstleister finden Sie in
				unserer AVV (Anlage 2: Unterauftragnehmer) .
			</p>

			{/* ========== 17. &Auml;nderungen ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				17. &Auml;nderungen dieser Datenschutzerkl&auml;rung
			</h2>
			<p className="text-base leading-relaxed">
				Wir behalten uns vor, diese Datenschutzerkl&auml;rung bei Bedarf anzupassen, um sie an
				ge&auml;nderte Rechtslagen oder &Auml;nderungen unseres Dienstes anzupassen. Die aktuelle
				Fassung ist stets auf dieser Seite verf&uuml;gbar.
			</p>
		</div>
	);
}
