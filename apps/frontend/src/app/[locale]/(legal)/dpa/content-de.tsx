export default function AvvContentDe() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Auftragsverarbeitungsvereinbarung (AVV)</h1>
			<p className="text-base leading-relaxed">
				gem&auml;&szlig; Art. 28 Datenschutz-Grundverordnung (DSGVO)
			</p>
			<p className="text-sm text-muted-foreground mb-8">Stand: April 2026</p>

			<h2 className="text-lg font-semibold mt-6 mb-2">Vertragsparteien</h2>
			<p className="text-base leading-relaxed">
				<strong>Auftraggeber</strong> (im Folgenden &bdquo;Verantwortlicher&ldquo;): Der jeweilige
				Kunde, der die Dienste von QRcodly nutzt und sich auf der Plattform registriert hat.
			</p>
			<p className="text-base leading-relaxed">
				<strong>Auftragnehmer</strong> (im Folgenden &bdquo;Auftragsverarbeiter&ldquo;):
			</p>
			<address className="not-italic text-base leading-relaxed mb-6">
				Florian Breuer
				<br />
				FB-Development
				<br />
				33378 Rheda-Wiedenbrück
				<br />
				Deutschland
				<br />
				E-Mail:{' '}
				<a href="mailto:info@qrcodly.de" className="text-primary underline">
					info@qrcodly.de
				</a>
			</address>

			{/* ========== PR&Auml;AMBEL ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">Pr&auml;ambel</h2>
			<p className="text-base leading-relaxed">
				Der Verantwortliche nutzt die SaaS-Plattform QRcodly (nachfolgend &bdquo;Dienst&ldquo;) zur
				Erstellung, Verwaltung und Nachverfolgung von QR-Codes sowie zur Verk&uuml;rzung und Analyse
				von URLs. Im Rahmen dieser Nutzung verarbeitet der Auftragsverarbeiter personenbezogene
				Daten im Auftrag des Verantwortlichen. Diese Vereinbarung konkretisiert die
				datenschutzrechtlichen Pflichten der Vertragsparteien gem&auml;&szlig; Art. 28 DSGVO.
			</p>

			{/* ========== &sect;1 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 1 Gegenstand und Dauer der Verarbeitung
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Gegenstand:</strong> Der Auftragsverarbeiter verarbeitet personenbezogene Daten im
					Auftrag des Verantwortlichen im Rahmen der Bereitstellung der QRcodly-Plattform. Die
					Einzelheiten der Datenverarbeitung ergeben sich aus Anlage 3 dieser Vereinbarung.
				</li>
				<li>
					<strong>Dauer:</strong> Die Verarbeitung beginnt mit der Registrierung des
					Verantwortlichen bei QRcodly und endet mit der vollst&auml;ndigen L&ouml;schung des
					Nutzerkontos bzw. dem Ende des Vertragsverh&auml;ltnisses. Die Pflichten aus dieser
					Vereinbarung bestehen fort, solange der Auftragsverarbeiter personenbezogene Daten des
					Verantwortlichen verarbeitet oder im Besitz solcher Daten ist.
				</li>
			</ol>

			{/* ========== &sect;2 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 2 Art und Zweck der Verarbeitung</h2>
			<p className="text-base leading-relaxed">
				Die Verarbeitung personenbezogener Daten durch den Auftragsverarbeiter erfolgt
				ausschlie&szlig;lich zum Zweck der Erbringung der folgenden Dienste:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>Bereitstellung und Betrieb der QRcodly-SaaS-Plattform</li>
				<li>Erstellung, Speicherung und Verwaltung von QR-Codes</li>
				<li>Verk&uuml;rzung von URLs und Verwaltung von Kurz-Links</li>
				<li>
					Erfassung und Auswertung von Scan-Statistiken (Browser, Ger&auml;t, Standort, Referrer)
				</li>
				<li>Verwaltung von Custom Domains f&uuml;r den Verantwortlichen</li>
				<li>Authentifizierung und Kontoverwaltung</li>
				<li>Abrechnung und Zahlungsabwicklung</li>
				<li>Versand transaktionaler E-Mails (z.&thinsp;B. Abo-Benachrichtigungen)</li>
			</ul>

			{/* ========== &sect;3 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 3 Art der personenbezogenen Daten
			</h2>
			<p className="text-base leading-relaxed">
				Folgende Arten personenbezogener Daten sind Gegenstand der Verarbeitung:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Kontodaten:</strong> E-Mail-Adresse, Name, Benutzer-ID, Authentifizierungsdaten
				</li>
				<li>
					<strong>Inhaltsdaten:</strong> In QR-Codes enthaltene Informationen (URLs,
					vCard-Kontaktdaten, WLAN-Zugangsdaten, E-Mail-Adressen, Kalendereintr&auml;ge,
					Standortdaten, Freitext, EPC-Zahlungsdaten)
				</li>
				<li>
					<strong>Nutzungsdaten / Scan-Daten:</strong> IP-Adresse, Browser-Typ, Betriebssystem,
					Ger&auml;tetyp, Sprache, Referrer-URL, Bildschirmaufl&ouml;sung, Herkunftsland,
					Zeitstempel des Scans
				</li>
				<li>
					<strong>Abrechnungsdaten:</strong> Stripe-Kunden-ID, Abonnementstatus,
					Abrechnungszeitr&auml;ume (Zahlungsdaten wie Kreditkartennummern werden
					ausschlie&szlig;lich von Stripe verarbeitet und nicht bei QRcodly gespeichert)
				</li>
				<li>
					<strong>Technische Daten:</strong> Fehlerprotokolle, Anwendungslogs, Performance-Metriken
				</li>
			</ul>

			{/* ========== &sect;4 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 4 Kategorien betroffener Personen
			</h2>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Registrierte Nutzer der QRcodly-Plattform (Mitarbeiter, Beauftragte oder sonstige
					Angeh&ouml;rige des Verantwortlichen)
				</li>
				<li>
					Personen, deren personenbezogene Daten in QR-Codes des Verantwortlichen enthalten sind
					(z.&thinsp;B. Kontaktdaten in vCards)
				</li>
				<li>
					Endnutzer, die QR-Codes des Verantwortlichen scannen (deren Scan-Daten erfasst werden)
				</li>
			</ul>

			{/* ========== &sect;5 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 5 Pflichten des Auftragsverarbeiters
			</h2>
			<ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
				<li>
					Der Auftragsverarbeiter verarbeitet personenbezogene Daten ausschlie&szlig;lich auf
					dokumentierte Weisung des Verantwortlichen &mdash; auch in Bezug auf die &Uuml;bermittlung
					personenbezogener Daten an ein Drittland &mdash; es sei denn, er ist nach dem Unionsrecht
					oder dem Recht der Mitgliedstaaten, dem der Auftragsverarbeiter unterliegt, hierzu
					verpflichtet. In einem solchen Fall teilt der Auftragsverarbeiter dem Verantwortlichen
					diese rechtlichen Anforderungen vor der Verarbeitung mit, sofern das betreffende Recht
					eine solche Mitteilung nicht wegen eines wichtigen &ouml;ffentlichen Interesses verbietet.
				</li>
				<li>
					Der Auftragsverarbeiter gew&auml;hrleistet, dass sich die zur Verarbeitung der
					personenbezogenen Daten befugten Personen zur Vertraulichkeit verpflichtet haben oder
					einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.
				</li>
				<li>
					Der Auftragsverarbeiter ergreift alle gem&auml;&szlig; Art. 32 DSGVO erforderlichen
					technischen und organisatorischen Ma&szlig;nahmen. Die aktuellen Ma&szlig;nahmen sind in
					Anlage 1 beschrieben.
				</li>
				<li>
					Der Auftragsverarbeiter nimmt keine weiteren Auftragsverarbeiter ohne vorherige gesonderte
					oder allgemeine schriftliche Genehmigung des Verantwortlichen in Anspruch. Im Fall einer
					allgemeinen schriftlichen Genehmigung informiert der Auftragsverarbeiter den
					Verantwortlichen &uuml;ber jede beabsichtigte &Auml;nderung in Bezug auf die Hinzuziehung
					oder die Ersetzung weiterer Auftragsverarbeiter, wodurch der Verantwortliche die
					M&ouml;glichkeit erh&auml;lt, gegen derartige &Auml;nderungen Einspruch zu erheben. Die
					aktuellen Unterauftragnehmer sind in Anlage 2 aufgef&uuml;hrt.
				</li>
				<li>
					Der Auftragsverarbeiter unterst&uuml;tzt den Verantwortlichen nach M&ouml;glichkeit mit
					geeigneten technischen und organisatorischen Ma&szlig;nahmen, damit dieser seiner Pflicht
					zur Beantwortung von Antr&auml;gen auf Wahrnehmung der in Kapitel III DSGVO genannten
					Rechte der betroffenen Personen nachkommen kann.
				</li>
				<li>
					Unter Ber&uuml;cksichtigung der Art der Verarbeitung und der ihm zur Verf&uuml;gung
					stehenden Informationen unterst&uuml;tzt der Auftragsverarbeiter den Verantwortlichen bei
					der Einhaltung der in den Art. 32 bis 36 DSGVO genannten Pflichten (Sicherheit der
					Verarbeitung, Meldung von Verletzungen des Schutzes personenbezogener Daten,
					Datenschutz-Folgenabsch&auml;tzung, vorherige Konsultation).
				</li>
				<li>
					Der Auftragsverarbeiter informiert den Verantwortlichen unverz&uuml;glich, wenn er der
					Auffassung ist, dass eine Weisung gegen die DSGVO oder andere Datenschutzvorschriften der
					Union oder der Mitgliedstaaten verst&ouml;&szlig;t.
				</li>
			</ol>

			{/* ========== &sect;6 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 6 Meldung von Datenschutzverletzungen
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Auftragsverarbeiter meldet dem Verantwortlichen unverz&uuml;glich und nach
					M&ouml;glichkeit innerhalb von 48 Stunden, nachdem ihm eine Verletzung des Schutzes
					personenbezogener Daten bekannt wurde, diese Verletzung per E-Mail an die im Nutzerkonto
					hinterlegte E-Mail-Adresse.
				</li>
				<li>
					Die Meldung enth&auml;lt mindestens folgende Informationen: Art der Verletzung, betroffene
					Kategorien und ungef&auml;hre Anzahl der betroffenen Personen und Datens&auml;tze,
					wahrscheinliche Folgen der Verletzung, ergriffene oder vorgeschlagene Ma&szlig;nahmen.
				</li>
			</ol>

			{/* ========== &sect;7 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 7 Unterauftragsverarbeitung</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Verantwortliche erteilt hiermit seine allgemeine Genehmigung zur Hinzuziehung weiterer
					Auftragsverarbeiter (Unterauftragnehmer). Die bei Abschluss dieser Vereinbarung
					eingesetzten Unterauftragnehmer sind in Anlage 2 aufgef&uuml;hrt.
				</li>
				<li>
					Der Auftragsverarbeiter informiert den Verantwortlichen mindestens 30 Tage im Voraus
					&uuml;ber beabsichtigte &Auml;nderungen bei den Unterauftragnehmern per E-Mail. Der
					Verantwortliche kann der &Auml;nderung innerhalb von 14 Tagen nach Benachrichtigung aus
					berechtigtem Grund widersprechen.
				</li>
				<li>
					Bei berechtigtem Widerspruch bem&uuml;ht sich der Auftragsverarbeiter um eine zumutbare
					Alternativl&ouml;sung. Ist eine solche nicht m&ouml;glich, hat der Verantwortliche ein
					au&szlig;erordentliches K&uuml;ndigungsrecht.
				</li>
				<li>
					Der Auftragsverarbeiter stellt sicher, dass den Unterauftragnehmern dieselben
					Datenschutzpflichten auferlegt werden wie dem Auftragsverarbeiter selbst.
				</li>
				<li>
					F&uuml;r Daten&uuml;bermittlungen in Drittl&auml;nder (au&szlig;erhalb des EWR) stellt der
					Auftragsverarbeiter sicher, dass ein angemessenes Datenschutzniveau gew&auml;hrleistet
					ist, insbesondere durch EU-Standardvertragsklauseln (SCCs) gem&auml;&szlig; Art. 46 Abs. 2
					lit. c DSGVO oder einen Angemessenheitsbeschluss der Europ&auml;ischen Kommission.
				</li>
			</ol>

			{/* ========== &sect;8 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 8 Rechte betroffener Personen</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Auftragsverarbeiter unterst&uuml;tzt den Verantwortlichen bei der Erf&uuml;llung von
					Betroffenenrechten (Art. 15&ndash;22 DSGVO), soweit dies technisch m&ouml;glich und
					zumutbar ist.
				</li>
				<li>
					Wendet sich eine betroffene Person direkt an den Auftragsverarbeiter, leitet dieser die
					Anfrage unverz&uuml;glich an den Verantwortlichen weiter.
				</li>
			</ol>

			{/* ========== &sect;9 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 9 L&ouml;schung und R&uuml;ckgabe von Daten
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Nach Beendigung des Vertragsverh&auml;ltnisses l&ouml;scht der Auftragsverarbeiter
					s&auml;mtliche im Auftrag verarbeiteten personenbezogenen Daten, sofern keine gesetzliche
					Aufbewahrungspflicht besteht. Die L&ouml;schung erfolgt innerhalb von 30 Tagen nach
					Vertragsende.
				</li>
				<li>
					Auf Verlangen des Verantwortlichen stellt der Auftragsverarbeiter vor der L&ouml;schung
					eine Kopie der Daten in einem g&auml;ngigen, maschinenlesbaren Format bereit.
				</li>
				<li>
					Der Auftragsverarbeiter best&auml;tigt dem Verantwortlichen die vollst&auml;ndige
					L&ouml;schung auf Anfrage schriftlich.
				</li>
			</ol>

			{/* ========== &sect;10 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				&sect; 10 Nachweispflichten und Kontrollrechte
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Auftragsverarbeiter stellt dem Verantwortlichen alle erforderlichen Informationen zum
					Nachweis der Einhaltung der in Art. 28 DSGVO niedergelegten Pflichten zur Verf&uuml;gung.
				</li>
				<li>
					Der Auftragsverarbeiter erm&ouml;glicht und unterst&uuml;tzt &Uuml;berpr&uuml;fungen
					einschlie&szlig;lich Inspektionen, die vom Verantwortlichen oder einem anderen von diesem
					beauftragten Pr&uuml;fer durchgef&uuml;hrt werden. Die Kosten einer solchen Pr&uuml;fung
					tr&auml;gt der Verantwortliche.
				</li>
				<li>
					Pr&uuml;fungen sind mit einer Ank&uuml;ndigungsfrist von mindestens 14 Tagen und unter
					Wahrung angemessener Vertraulichkeit durchzuf&uuml;hren. Sie d&uuml;rfen den
					Gesch&auml;ftsbetrieb des Auftragsverarbeiters nicht unverh&auml;ltnism&auml;&szlig;ig
					st&ouml;ren.
				</li>
			</ol>

			{/* ========== &sect;11 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 11 Haftung</h2>
			<p className="text-base leading-relaxed">
				Die Haftung der Parteien richtet sich nach den gesetzlichen Bestimmungen der DSGVO,
				insbesondere Art. 82 DSGVO. Erg&auml;nzend gelten die Haftungsbeschr&auml;nkungen aus den
				Allgemeinen Gesch&auml;ftsbedingungen von QRcodly.
			</p>

			{/* ========== &sect;12 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">&sect; 12 Schlussbestimmungen</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					&Auml;nderungen und Erg&auml;nzungen dieser Vereinbarung bed&uuml;rfen der Textform
					(E-Mail gen&uuml;gt). Dies gilt auch f&uuml;r den Verzicht auf dieses Formerfordernis.
				</li>
				<li>
					Sollten einzelne Bestimmungen dieser Vereinbarung unwirksam sein oder werden, so wird
					dadurch die Wirksamkeit der &uuml;brigen Bestimmungen nicht ber&uuml;hrt. Die unwirksame
					Bestimmung ist durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck der
					unwirksamen Bestimmung am n&auml;chsten kommt.
				</li>
				<li>
					Diese Vereinbarung unterliegt deutschem Recht. Gerichtsstand ist der Sitz des
					Auftragsverarbeiters, soweit gesetzlich zul&auml;ssig.
				</li>
				<li>
					Im Falle von Widerspr&uuml;chen zwischen dieser Vereinbarung und sonstigen Vereinbarungen
					zwischen den Parteien gehen die Regelungen dieser Auftragsverarbeitungsvereinbarung in
					Bezug auf den Schutz personenbezogener Daten vor.
				</li>
			</ol>

			{/* ================================================================ */}
			{/*                        ANLAGE 1: TOMs                            */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Anlage 1: Technische und organisatorische Ma&szlig;nahmen (TOMs)
			</h2>
			<p className="text-base leading-relaxed">
				gem&auml;&szlig; Art. 32 DSGVO &mdash; Stand: April 2026
			</p>
			<p className="text-base leading-relaxed">
				Die folgenden technischen und organisatorischen Ma&szlig;nahmen beschreiben die
				tats&auml;chlich implementierten Sicherheitsma&szlig;nahmen der QRcodly-Plattform.
			</p>

			{/* ----- 1. Vertraulichkeit ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)
			</h3>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.1 Zutrittskontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die Unbefugten den physischen Zutritt zu Datenverarbeitungsanlagen
				verwehren:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Serverhosting bei Hetzner Online GmbH in ISO-27001-zertifizierten Rechenzentren in
					Deutschland
				</li>
				<li>
					Zutrittskontrollsysteme der Rechenzentren: elektronische Zutrittskontrolle,
					Video&uuml;berwachung, Sicherheitspersonal 24/7 (verantwortet durch Hetzner)
				</li>
				<li>
					Der Auftragsverarbeiter hat keinen physischen Zugang zur Serverhardware; Verwaltung
					erfolgt ausschlie&szlig;lich &uuml;ber verschl&uuml;sselte Remote-Verbindungen
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.2 Zugangskontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die verhindern, dass Datenverarbeitungssysteme von Unbefugten genutzt
				werden:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Authentifizierung &uuml;ber Clerk (branchen&uuml;blicher OAuth 2.0 / OpenID Connect
					Standard) mit optionaler Zwei-Faktor-Authentifizierung
				</li>
				<li>JWT-Token-basierte API-Authentifizierung mit kryptographisch signierten Tokens</li>
				<li>Signierte Cookies mit serverseitigem Secret (min. 32 Zeichen)</li>
				<li>
					Redis-basiertes Rate Limiting pro IP-Adresse und Benutzer zum Schutz vor
					Brute-Force-Angriffen
				</li>
				<li>Automatische IP-Abuse-Erkennung und -Sperrung</li>
				<li>
					Serverseitige Zugangsdaten (Datenbankpassw&ouml;rter, API-Schl&uuml;ssel) werden als
					Umgebungsvariablen verwaltet und nicht im Quellcode gespeichert
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.3 Zugriffskontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die gew&auml;hrleisten, dass die zur Benutzung berechtigten Personen
				ausschlie&szlig;lich auf die ihrer Zugriffsberechtigung unterliegenden Daten zugreifen
				k&ouml;nnen:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Mandantentrennung: Alle Datenbankabfragen sind nach Benutzer-ID gefiltert &mdash; jeder
					Nutzer hat ausschlie&szlig;lich Zugriff auf eigene Daten
				</li>
				<li>
					AES-256-GCM-Verschl&uuml;sselung f&uuml;r gespeicherte Analytics-Credentials (Google
					Analytics / Matomo API-Zugangsdaten der Kunden)
				</li>
				<li>Strikte Eingabevalidierung aller API-Anfragen mittels Zod-Schema-Validierung</li>
				<li>
					Minimale Datenspeicherung: Zahlungsdaten (Kreditkartennummern etc.) werden nicht bei
					QRcodly gespeichert, sondern ausschlie&szlig;lich bei Stripe verarbeitet
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">1.4 Trennungskontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die gew&auml;hrleisten, dass zu unterschiedlichen Zwecken erhobene Daten
				getrennt verarbeitet werden:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Mandantenf&auml;higkeit durch konsequente Benutzer-ID-basierte Datentrennung in allen
					Datenbanktabellen
				</li>
				<li>Logische Trennung von Anwendungsdaten (MySQL) und Analysedaten (Umami/PostgreSQL)</li>
				<li>Separate Datenbank-Schemas f&uuml;r unterschiedliche Funktionsbereiche</li>
				<li>Getrennte Verarbeitung von Kundendaten, Scan-Analysen und Abrechnungsinformationen</li>
			</ul>

			{/* ----- 2. Integrit&auml;t ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				2. Integrit&auml;t (Art. 32 Abs. 1 lit. b DSGVO)
			</h3>

			<h4 className="text-lg font-semibold mt-5 mb-2">2.1 Weitergabekontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die gew&auml;hrleisten, dass personenbezogene Daten bei der
				&Uuml;bertragung oder Speicherung nicht unbefugt gelesen, kopiert, ver&auml;ndert oder
				entfernt werden k&ouml;nnen:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					TLS/HTTPS-Verschl&uuml;sselung f&uuml;r s&auml;mtliche Daten&uuml;bertragungen zwischen
					Client und Server
				</li>
				<li>CORS-Konfiguration beschr&auml;nkt API-Zugriffe auf autorisierte Domains</li>
				<li>Cloudflare SSL-Zertifikate f&uuml;r Custom Domains mit automatischer Erneuerung</li>
				<li>
					Verschl&uuml;sselte Kommunikation mit allen Drittanbietern (Clerk, Stripe, Sentry etc.)
				</li>
				<li>
					Signierte Webhooks (Clerk, Stripe) zur Sicherstellung der Authentizit&auml;t eingehender
					Nachrichten
				</li>
			</ul>

			<h4 className="text-lg font-semibold mt-5 mb-2">2.2 Eingabekontrolle</h4>
			<p className="text-base leading-relaxed">
				Ma&szlig;nahmen, die gew&auml;hrleisten, dass nachtr&auml;glich &uuml;berpr&uuml;ft werden
				kann, ob und von wem personenbezogene Daten eingegeben, ver&auml;ndert oder entfernt worden
				sind:
			</p>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Vollst&auml;ndige Protokollierung aller Daten&auml;nderungen mit Zeitstempeln (createdAt,
					updatedAt)
				</li>
				<li>Zuordnung aller Datens&auml;tze zu authentifizierten Benutzern (createdBy-Feld)</li>
				<li>
					Soft-Delete-Mechanismus f&uuml;r Kurz-URLs (Daten werden nicht sofort gel&ouml;scht,
					sondern als gel&ouml;scht markiert)
				</li>
				<li>Strukturierte Anwendungsprotokolle (Pino Logger) mit Kontextinformationen</li>
				<li>
					Zentralisiertes Log-Management &uuml;ber Axiom f&uuml;r l&uuml;ckenlose
					Nachvollziehbarkeit
				</li>
			</ul>

			{/* ----- 3. Verf&uuml;gbarkeit und Belastbarkeit ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				3. Verf&uuml;gbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Hetzner-Rechenzentren mit redundanter Stromversorgung, Klimatisierung und
					Netzwerkanbindung
				</li>
				<li>
					Redis-Caching-Schicht f&uuml;r Leistungsoptimierung und Reduzierung der Datenbankbelastung
				</li>
				<li>
					Echtzeit-Fehler&uuml;berwachung &uuml;ber Sentry mit sofortiger Benachrichtigung bei
					kritischen Fehlern
				</li>
				<li>
					Proaktive System&uuml;berwachung &uuml;ber Axiom (Anwendungsmetriken und
					Performance-Monitoring)
				</li>
				<li>Rate Limiting zum Schutz vor &Uuml;berlastung und Denial-of-Service-Angriffen</li>
				<li>Regelm&auml;&szlig;ige Datenbank-Backups &uuml;ber die Hetzner-Infrastruktur</li>
			</ul>

			{/* ----- 4. Wiederherstellbarkeit ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				4. Rasche Wiederherstellbarkeit (Art. 32 Abs. 1 lit. c DSGVO)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Regelm&auml;&szlig;ige automatische Datenbank-Backups mit
					Wiederherstellungsm&ouml;glichkeit
				</li>
				<li>Disaster-Recovery-F&auml;higkeit &uuml;ber die Hetzner-Infrastruktur</li>
				<li>
					Vollst&auml;ndige Versionskontrolle des Quellcodes &uuml;ber Git (erm&ouml;glicht schnelle
					Wiederherstellung des Anwendungszustands)
				</li>
				<li>Automatisierte Datenbankmigrationen f&uuml;r konsistente Schema-Updates</li>
			</ul>

			{/* ----- 5. Verfahren zur &Uuml;berpr&uuml;fung ----- */}
			<h3 className="text-xl font-semibold mt-8 mb-3">
				5. Verfahren zur regelm&auml;&szlig;igen &Uuml;berpr&uuml;fung, Bewertung und Evaluierung
				(Art. 32 Abs. 1 lit. d DSGVO)
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					Open-Source-Codebasis unter MIT-Lizenz erm&ouml;glicht unabh&auml;ngige
					Sicherheits&uuml;berpr&uuml;fungen durch Dritte
				</li>
				<li>Automatisierte Test-Suite (Jest) zur Sicherstellung der Anwendungsintegrit&auml;t</li>
				<li>Kontinuierliche Fehler&uuml;berwachung und -analyse &uuml;ber Sentry</li>
				<li>
					Regelm&auml;&szlig;ige &Uuml;berpr&uuml;fung und Aktualisierung von Abh&auml;ngigkeiten
					(Sicherheitspatches)
				</li>
				<li>Dokumentierte Datenschutzprozesse in dieser Auftragsverarbeitungsvereinbarung</li>
			</ul>

			{/* ================================================================ */}
			{/*               ANLAGE 2: Unterauftragnehmer                       */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Anlage 2: Genehmigte Unterauftragnehmer
			</h2>
			<p className="text-base leading-relaxed mb-6">Stand: April 2026</p>

			<div className="overflow-x-auto">
				<table className="min-w-full text-sm border-collapse">
					<thead>
						<tr className="border-b-2 border-gray-300">
							<th className="text-left py-2 pr-4 font-semibold">Unterauftragnehmer</th>
							<th className="text-left py-2 pr-4 font-semibold">Zweck</th>
							<th className="text-left py-2 pr-4 font-semibold">Standort</th>
							<th className="text-left py-2 font-semibold">Garantien</th>
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
								Server-Hosting, Infrastruktur, Datenbank-Hosting, Backups
							</td>
							<td className="py-3 pr-4 align-top">Deutschland (EU)</td>
							<td className="py-3 align-top">AVV mit Hetzner, ISO 27001</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Clerk, Inc.
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								Authentifizierung, Benutzerverwaltung, Session-Management
							</td>
							<td className="py-3 pr-4 align-top">USA</td>
							<td className="py-3 align-top">EU-Standardvertragsklauseln (SCCs), DPA</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Stripe, Inc. / Stripe Payments Europe, Ltd.
								<br />
								<span className="text-xs text-gray-500">Dublin, Irland / USA</span>
							</td>
							<td className="py-3 pr-4 align-top">Zahlungsabwicklung, Abonnementverwaltung</td>
							<td className="py-3 pr-4 align-top">Irland (EU) / USA</td>
							<td className="py-3 align-top">EU-Niederlassung, SCCs, PCI DSS Level 1</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Cloudflare, Inc.
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								CDN, DNS-Verwaltung, SSL-Zertifikate f&uuml;r Custom Domains
							</td>
							<td className="py-3 pr-4 align-top">USA (EU-Verarbeitung)</td>
							<td className="py-3 align-top">SCCs, DPA, ISO 27001</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Functional Software, Inc. (Sentry)
								<br />
								<span className="text-xs text-gray-500">San Francisco, CA, USA</span>
							</td>
							<td className="py-3 pr-4 align-top">
								Fehler&uuml;berwachung, Performance-Monitoring
							</td>
							<td className="py-3 pr-4 align-top">USA</td>
							<td className="py-3 align-top">SCCs, DPA</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">
								Axiom, Inc.
								<br />
								<span className="text-xs text-gray-500">USA</span>
							</td>
							<td className="py-3 pr-4 align-top">Strukturierte Anwendungsprotokolle, Metriken</td>
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
								Produktanalyse (anonymisierte Nutzungsstatistiken)
							</td>
							<td className="py-3 pr-4 align-top">USA (EU-Hosting verf&uuml;gbar)</td>
							<td className="py-3 align-top">SCCs, DPA</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p className="text-base leading-relaxed mt-4">
				<strong>Hinweis:</strong> Die Scan-Analyse (Umami) wird auf der eigenen
				Hetzner-Infrastruktur des Auftragsverarbeiters betrieben (Self-Hosted) und stellt keinen
				separaten Unterauftragnehmer dar.
			</p>

			{/* ================================================================ */}
			{/*          ANLAGE 3: Beschreibung der Datenverarbeitung             */}
			{/* ================================================================ */}
			<h2 className="text-2xl font-semibold mt-16 mb-4 pt-8 border-t border-gray-300">
				Anlage 3: Beschreibung der Datenverarbeitung
			</h2>

			<h3 className="text-xl font-semibold mt-6 mb-3">
				1. Verarbeitungst&auml;tigkeiten im &Uuml;berblick
			</h3>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm border-collapse">
					<thead>
						<tr className="border-b-2 border-gray-300">
							<th className="text-left py-2 pr-4 font-semibold">Verarbeitungst&auml;tigkeit</th>
							<th className="text-left py-2 pr-4 font-semibold">Verarbeitete Daten</th>
							<th className="text-left py-2 font-semibold">Speicherort</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Benutzerregistrierung</td>
							<td className="py-3 pr-4 align-top">E-Mail, Name, Benutzer-ID</td>
							<td className="py-3 align-top">Clerk (Auth-Provider)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">QR-Code-Erstellung</td>
							<td className="py-3 pr-4 align-top">
								QR-Code-Inhalte (URLs, vCards, WLAN, E-Mail, Kalender, Standort, Text, EPC),
								Gestaltungskonfiguration, Vorschaubilder
							</td>
							<td className="py-3 align-top">MySQL-Datenbank, S3-Speicher (Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">URL-Verk&uuml;rzung</td>
							<td className="py-3 pr-4 align-top">
								Ziel-URL, 5-stelliger Kurzcode, Zuordnung zu Custom Domain
							</td>
							<td className="py-3 align-top">MySQL-Datenbank (Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Scan-Erfassung</td>
							<td className="py-3 pr-4 align-top">
								IP-Adresse, User Agent, Browser, Betriebssystem, Ger&auml;tetyp, Sprache, Referrer,
								Bildschirmaufl&ouml;sung, Herkunftsland
							</td>
							<td className="py-3 align-top">Umami (Self-Hosted, Hetzner)</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Zahlungsabwicklung</td>
							<td className="py-3 pr-4 align-top">
								Stripe-Kunden-ID, Abonnementstatus, Abrechnungszeitr&auml;ume
							</td>
							<td className="py-3 align-top">MySQL-Datenbank (Hetzner), Stripe</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Custom-Domain-Verwaltung</td>
							<td className="py-3 pr-4 align-top">Domain-Name, DNS-Eintr&auml;ge, SSL-Status</td>
							<td className="py-3 align-top">MySQL-Datenbank (Hetzner), Cloudflare</td>
						</tr>
						<tr className="border-b border-gray-200">
							<td className="py-3 pr-4 align-top font-medium">Analytics-Integration</td>
							<td className="py-3 pr-4 align-top">
								Verschl&uuml;sselte API-Credentials des Kunden (Google Analytics, Matomo)
							</td>
							<td className="py-3 align-top">
								MySQL-Datenbank (Hetzner), AES-256-GCM-verschl&uuml;sselt
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<h3 className="text-xl font-semibold mt-8 mb-3">
				2. Datenl&ouml;schung und Aufbewahrungsfristen
			</h3>
			<ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
				<li>
					<strong>Kontodaten:</strong> Werden bei L&ouml;schung des Nutzerkontos gel&ouml;scht
				</li>
				<li>
					<strong>QR-Codes und Kurz-URLs:</strong> Werden bei L&ouml;schung des Nutzerkontos
					gel&ouml;scht; Kurz-URLs werden zun&auml;chst als gel&ouml;scht markiert (Soft Delete) und
					nach Ablauf der Aufbewahrungsfrist endg&uuml;ltig entfernt
				</li>
				<li>
					<strong>Scan-Daten:</strong> Werden in aggregierter Form in Umami gespeichert; IP-Adressen
					werden nicht dauerhaft gespeichert
				</li>
				<li>
					<strong>Abrechnungsdaten:</strong> Aufbewahrung gem&auml;&szlig; handels- und
					steuerrechtlichen Pflichten (in der Regel 10 Jahre gem&auml;&szlig; &sect;&thinsp;147 AO,
					&sect;&thinsp;257 HGB)
				</li>
				<li>
					<strong>Fehlerprotokolle:</strong> Werden nach 90 Tagen automatisch gel&ouml;scht
					(Sentry-Retention)
				</li>
			</ul>

			<p className="mt-12 text-sm text-muted-foreground">
				Diese Auftragsverarbeitungsvereinbarung basiert auf den Anforderungen des Art. 28 DSGVO und
				orientiert sich an der Muster-AVV des Bayerischen Landesamts f&uuml;r Datenschutzaufsicht
				sowie der Bitkom-Vorlage.
			</p>
		</div>
	);
}
