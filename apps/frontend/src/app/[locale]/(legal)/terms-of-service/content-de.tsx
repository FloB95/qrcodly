import Link from 'next/link';

export default function AgbContentDe() {
	return (
		<div className="prose prose-neutral">
			<h1 className="text-3xl font-semibold mb-6">Allgemeine Geschäftsbedingungen (AGB)</h1>
			<p className="text-sm text-muted-foreground mb-8">Stand: April 2026</p>

			{/* ========== §1 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 1 Geltungsbereich</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Diese Allgemeinen Gesch&auml;ftsbedingungen (nachfolgend &bdquo;AGB&ldquo;) gelten
					f&uuml;r die Nutzung der von Florian Breuer, FB-Development, 33378 Rheda-Wiedenbrück,
					Deutschland (nachfolgend &bdquo;Anbieter&ldquo;) betriebenen SaaS-Plattform QRcodly unter
					der Domain qrcodly.de (nachfolgend &bdquo;Plattform&ldquo;) und aller damit verbundenen
					Dienste.
				</li>
				<li>
					Die AGB gelten gegenüber Verbrauchern im Sinne des § 13 BGB und gegenüber Unternehmern im
					Sinne des &sect; 14 BGB (nachfolgend gemeinsam &bdquo;Nutzer&ldquo;).
				</li>
				<li>
					Abweichende, entgegenstehende oder ergänzende AGB des Nutzers werden nur dann
					Vertragsbestandteil, wenn der Anbieter ihrer Geltung ausdrücklich schriftlich zugestimmt
					hat.
				</li>
			</ol>

			{/* ========== §2 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				§ 2 Vertragsgegenstand und Leistungsbeschreibung
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Anbieter stellt dem Nutzer über die Plattform einen internetbasierten Dienst
					(Software-as-a-Service) zur Verfügung, der folgende Kernfunktionen umfasst:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>
							Erstellung, Gestaltung und Verwaltung von QR-Codes (URL, vCard, WLAN, E-Mail,
							Kalender, Standort, Text, EPC)
						</li>
						<li>Verkürzung und Verwaltung von URLs (URL Shortener)</li>
						<li>Erfassung und Auswertung von Scan-Statistiken (Analytics)</li>
						<li>Anbindung eigener Domains (Custom Domains, im Pro-Tarif)</li>
						<li>Verwaltung von Vorlagen und Tags zur Organisation</li>
						<li>Export von QR-Codes in verschiedenen Formaten (PNG, JPEG, SVG)</li>
					</ul>
				</li>
				<li>
					Der genaue Leistungsumfang richtet sich nach dem jeweiligen Tarif (Free oder Pro) gemäß
					der aktuellen Preisübersicht auf der Plattform.
				</li>
				<li>
					Der Anbieter ist berechtigt, die Plattform weiterzuentwickeln und den Funktionsumfang zu
					erweitern, zu ändern oder einzuschränken, sofern die vertragswesentlichen Leistungen nicht
					wesentlich beeinträchtigt werden.
				</li>
			</ol>

			{/* ========== §3 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 3 Registrierung und Nutzerkonto</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Die Nutzung der Plattform setzt eine Registrierung voraus. Die Registrierung ist kostenlos
					und erfolgt über den externen Authentifizierungsdienst Clerk.
				</li>
				<li>
					Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße und vollständige
					Angaben zu machen und diese aktuell zu halten.
				</li>
				<li>
					Jeder Nutzer darf nur ein Nutzerkonto anlegen. Die Zugangsdaten sind vertraulich zu
					behandeln und nicht an Dritte weiterzugeben.
				</li>
				<li>
					Der Nutzer haftet für sämtliche Aktivitäten, die über sein Nutzerkonto vorgenommen werden,
					sofern er die unbefugte Nutzung nicht zu vertreten hat.
				</li>
				<li>
					Der Anbieter ist berechtigt, Nutzerkonten bei Verstoß gegen diese AGB oder bei Missbrauch
					der Plattform zu sperren oder zu löschen.
				</li>
			</ol>

			{/* ========== §4 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 4 Leistungsumfang und Tarife</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Free-Tarif:</strong> Der Anbieter stellt einen kostenfreien Grundtarif zur
					Verfügung, der in seinem Funktionsumfang eingeschränkt ist. Die Einzelheiten ergeben sich
					aus der aktuellen Tarifübersicht.
				</li>
				<li>
					<strong>Pro-Tarif:</strong> Der Pro-Tarif bietet erweiterte Funktionen, darunter die
					Nutzung eigener Domains, erweiterte Analytics-Funktionen und Analytics-Integrationen
					(Google Analytics, Matomo). Der Funktionsumfang ergibt sich aus der aktuellen
					Tarifübersicht.
				</li>
				<li>
					Der Anbieter behält sich vor, den Funktionsumfang der einzelnen Tarife anzupassen.
					Wesentliche Einschränkungen bestehender Funktionen werden den Nutzern mindestens 30 Tage
					im Voraus per E-Mail mitgeteilt.
				</li>
			</ol>

			{/* ========== §5 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 5 Preise und Zahlungsbedingungen</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Die aktuellen Preise f&uuml;r den Pro-Tarif ergeben sich aus der Preis&uuml;bersicht auf
					der Plattform. Alle angegebenen Preise sind Endpreise. Aufgrund der Anwendung der
					Kleinunternehmerregelung gem&auml;&szlig; &sect;&thinsp;19 UStG wird keine Umsatzsteuer
					erhoben und daher auch nicht ausgewiesen.
				</li>
				<li>
					Die Zahlungsabwicklung erfolgt &uuml;ber den Zahlungsdienstleister Stripe. Mit Abschluss
					des Pro-Abonnements akzeptiert der Nutzer die Nutzungsbedingungen von Stripe.
				</li>
				<li>
					Die Abrechnung erfolgt je nach gew&auml;hltem Abrechnungszeitraum monatlich oder
					j&auml;hrlich im Voraus.
				</li>
				<li>
					Der Anbieter ist berechtigt, die Preise mit einer Ank&uuml;ndigungsfrist von mindestens 30
					Tagen zum Ende des laufenden Abrechnungszeitraums anzupassen. Der Nutzer hat in diesem
					Fall ein Sonderk&uuml;ndigungsrecht zum Zeitpunkt des Inkrafttretens der
					Preis&auml;nderung.
				</li>
				<li>
					Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zu Pro-Funktionen nach
					angemessener Nachfrist zu sperren.
				</li>
			</ol>

			{/* ========== §6 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 6 Vertragslaufzeit und Kündigung</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					<strong>Free-Tarif:</strong> Die Nutzung des Free-Tarifs erfolgt auf unbestimmte Zeit und
					kann jederzeit ohne Einhaltung einer Frist durch Löschung des Nutzerkontos beendet werden.
				</li>
				<li>
					<strong>Pro-Tarif:</strong> Das Abonnement wird für den gewählten Abrechnungszeitraum
					(monatlich oder jährlich) abgeschlossen und verlängert sich automatisch um den jeweiligen
					Zeitraum, sofern es nicht vor Ablauf des aktuellen Zeitraums gekündigt wird.
				</li>
				<li>
					Die Kündigung des Pro-Tarifs kann jederzeit über die Kontoeinstellungen auf der Plattform
					oder per E-Mail an info@qrcodly.de erfolgen. Die Kündigung wird zum Ende des laufenden
					Abrechnungszeitraums wirksam.
				</li>
				<li>
					Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein
					wichtiger Grund liegt für den Anbieter insbesondere vor, wenn der Nutzer gegen wesentliche
					Bestimmungen dieser AGB verstößt.
				</li>
				<li>
					Nach Beendigung des Vertragsverhältnisses werden die Daten des Nutzers gemäß den
					Bestimmungen der Datenschutzerklärung und der Auftragsverarbeitungsvereinbarung gelöscht,
					sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
				</li>
			</ol>

			{/* ========== §7 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 7 Verfügbarkeit und Wartung</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Anbieter bemüht sich um eine möglichst unterbrechungsfreie Verfügbarkeit der
					Plattform. Eine Verfügbarkeit von 100 % kann technisch nicht gewährleistet werden.
				</li>
				<li>
					Wartungsarbeiten werden, soweit möglich, im Voraus angekündigt und außerhalb der üblichen
					Geschäftszeiten durchgeführt. Notwendige Wartungsarbeiten, die eine vorübergehende
					Nichterreichbarkeit verursachen, stellen keinen Mangel dar.
				</li>
				<li>
					Der Anbieter haftet nicht für Ausfälle oder Einschränkungen, die auf höhere Gewalt,
					Störungen bei Drittanbietern (z.&thinsp;B. Hosting-Provider, Zahlungsdienstleister) oder
					vom Nutzer zu vertretende Umstände zurückzuführen sind.
				</li>
			</ol>

			{/* ========== §8 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 8 Pflichten des Nutzers</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Nutzer verpflichtet sich, die Plattform nur im Rahmen der geltenden Gesetze und dieser
					AGB zu nutzen. Insbesondere ist es untersagt:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>
							QR-Codes oder Kurz-URLs für rechtswidrige, betrügerische oder irreführende Zwecke zu
							erstellen oder zu verwenden
						</li>
						<li>
							Inhalte zu verbreiten, die gegen geltendes Recht verstoßen (insbesondere Urheberrecht,
							Markenrecht, Persönlichkeitsrechte)
						</li>
						<li>
							Die Plattform in einer Weise zu nutzen, die deren Betrieb beeinträchtigt oder
							gefährdet (z.&thinsp;B. automatisierte Massenabfragen, Denial-of-Service-Versuche)
						</li>
						<li>Sicherheitsmechanismen der Plattform zu umgehen oder auszunutzen</li>
						<li>
							Spam oder unaufgeforderte Massennachrichten über QR-Codes oder Kurz-URLs zu versenden
						</li>
					</ul>
				</li>
				<li>
					Der Nutzer ist für alle über sein Konto erstellten Inhalte (QR-Codes, Kurz-URLs, vCards
					etc.) selbst verantwortlich und stellt den Anbieter von Ansprüchen Dritter frei, die aus
					einer rechtswidrigen Nutzung resultieren.
				</li>
				<li>
					Bei Nutzung der Custom-Domain-Funktion ist der Nutzer für die korrekte DNS-Konfiguration
					und die Einhaltung der Domain-Registrierungsbedingungen selbst verantwortlich.
				</li>
				<li>
					Soweit der Nutzer personenbezogene Daten Dritter in QR-Codes hinterlegt (z.&thinsp;B.
					vCard-Kontaktdaten), ist er als datenschutzrechtlich Verantwortlicher für die Zulässigkeit
					dieser Verarbeitung verantwortlich.
				</li>
			</ol>

			{/* ========== §9 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">
				§ 9 Geistiges Eigentum und Nutzungsrechte
			</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Die QRcodly-Plattform ist Open-Source-Software, veröffentlicht unter der MIT-Lizenz. Die
					Nutzung des Quellcodes richtet sich nach den Bedingungen dieser Lizenz.
				</li>
				<li>
					Die vom Nutzer über die Plattform erstellten Inhalte (QR-Codes, Kurz-URLs etc.) verbleiben
					im Eigentum des Nutzers. Der Anbieter erwirbt keine Nutzungsrechte an diesen Inhalten über
					das für die Erbringung des Dienstes erforderliche Maß hinaus.
				</li>
				<li>
					Die Marke &bdquo;QRcodly&ldquo;, das Logo und das Design der Plattform sind Eigentum des
					Anbieters und dürfen ohne vorherige Genehmigung nicht verwendet werden.
				</li>
			</ol>

			{/* ========== §10 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 10 Haftungsbeschränkung</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Anbieter haftet unbeschr&auml;nkt f&uuml;r Sch&auml;den aus der Verletzung des Lebens,
					des K&ouml;rpers oder der Gesundheit, die auf einer vors&auml;tzlichen oder
					fahrl&auml;ssigen Pflichtverletzung des Anbieters oder eines gesetzlichen Vertreters oder
					Erf&uuml;llungsgehilfen beruhen.
				</li>
				<li>
					Der Anbieter haftet unbeschr&auml;nkt f&uuml;r sonstige Sch&auml;den, die auf einer
					vors&auml;tzlichen oder grob fahrl&auml;ssigen Pflichtverletzung des Anbieters oder eines
					gesetzlichen Vertreters oder Erf&uuml;llungsgehilfen beruhen.
				</li>
				<li>
					Bei der Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) durch leichte
					Fahrl&auml;ssigkeit ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden
					begrenzt. Wesentliche Vertragspflichten sind Pflichten, deren Erf&uuml;llung die
					ordnungsgem&auml;&szlig;e Durchf&uuml;hrung des Vertrages &uuml;berhaupt erst
					erm&ouml;glicht und auf deren Einhaltung der Nutzer regelm&auml;&szlig;ig vertrauen darf.
				</li>
				<li>
					Die Haftung f&uuml;r leichte Fahrl&auml;ssigkeit bei Verletzung wesentlicher
					Vertragspflichten ist der H&ouml;he nach begrenzt auf den Betrag, den der Nutzer in den
					letzten 12 Monaten vor dem schadensbegr&uuml;ndenden Ereignis an den Anbieter gezahlt hat,
					maximal jedoch 500&thinsp;&euro;. Bei Nutzung des kostenfreien Tarifs ist die Haftung
					f&uuml;r leichte Fahrl&auml;ssigkeit ausgeschlossen, soweit gesetzlich zul&auml;ssig.
				</li>
				<li>
					Im &Uuml;brigen ist die Haftung des Anbieters &mdash; gleich aus welchem Rechtsgrund
					&mdash; ausgeschlossen. Dies gilt insbesondere f&uuml;r:
					<ul className="list-disc pl-6 space-y-1 mt-2">
						<li>
							Mittelbare Sch&auml;den, Folgesch&auml;den, entgangenen Gewinn und entgangene
							Einsparungen
						</li>
						<li>Datenverlust, der durch fehlende Datensicherung des Nutzers verursacht wurde</li>
						<li>
							Sch&auml;den durch Inhalte, die der Nutzer &uuml;ber die Plattform erstellt oder
							verbreitet
						</li>
						<li>
							Ausf&auml;lle oder St&ouml;rungen von Drittdiensten (Clerk, Stripe, Cloudflare etc.)
						</li>
						<li>
							Sch&auml;den, die durch die Nutzung von durch QR-Codes oder Kurz-URLs verlinkten
							Inhalten Dritter entstehen
						</li>
						<li>
							Sch&auml;den durch unbefugten Zugriff auf das Nutzerkonto, sofern der Anbieter die
							unbefugte Nutzung nicht zu vertreten hat
						</li>
					</ul>
				</li>
				<li>
					Die Plattform wird im Rahmen des kostenfreien Tarifs &bdquo;as&thinsp;is&ldquo; (wie
					besehen) bereitgestellt, ohne ausdr&uuml;ckliche oder stillschweigende Gew&auml;hrleistung
					f&uuml;r eine bestimmte Eignung oder Verf&uuml;gbarkeit.
				</li>
				<li>Die Haftung nach dem Produkthaftungsgesetz bleibt unber&uuml;hrt.</li>
			</ol>

			{/* ========== §11 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 11 Datenschutz</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Anbieter verarbeitet personenbezogene Daten des Nutzers im Einklang mit der
					Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG). Einzelheiten
					sind in der{' '}
					<Link href="/privacy-policy" className="text-primary underline">
						Datenschutzerklärung
					</Link>{' '}
					beschrieben.
				</li>
				<li>
					Soweit der Nutzer die Plattform nutzt, um personenbezogene Daten Dritter zu verarbeiten
					(z.&thinsp;B. vCard-Kontaktdaten in QR-Codes, Scan-Daten von Endnutzern), handelt der
					Anbieter als Auftragsverarbeiter im Sinne des Art. 28 DSGVO. Die Einzelheiten der
					Auftragsverarbeitung sind in der{' '}
					<Link href="/dpa" className="text-primary underline">
						Auftragsverarbeitungsvereinbarung (AVV)
					</Link>{' '}
					geregelt.
				</li>
			</ol>

			{/* ========== §12 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 12 Änderungen der AGB</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Der Anbieter ist berechtigt, diese AGB mit Wirkung für die Zukunft zu ändern, sofern die
					Änderung unter Berücksichtigung der Interessen des Anbieters für den Nutzer zumutbar ist.
				</li>
				<li>
					Der Anbieter wird den Nutzer über Änderungen mindestens 30 Tage vor dem geplanten
					Inkrafttreten per E-Mail informieren. Widerspricht der Nutzer der Änderung nicht innerhalb
					von 30 Tagen nach Zugang der Änderungsmitteilung, gilt die Änderung als genehmigt. Der
					Anbieter wird den Nutzer in der Änderungsmitteilung auf die Widerspruchsmöglichkeit und
					die Folgen eines unterlassenen Widerspruchs hinweisen.
				</li>
				<li>
					Im Falle eines Widerspruchs gelten die bisherigen AGB fort. Der Anbieter hat in diesem
					Fall ein Sonderkündigungsrecht mit einer Frist von 30 Tagen zum Monatsende.
				</li>
			</ol>

			{/* ========== §13 ========== */}
			<h2 className="text-2xl font-semibold mt-10 mb-4">§ 13 Schlussbestimmungen</h2>
			<ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
				<li>
					Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts
					(CISG). Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit der gewährte Schutz nicht
					durch zwingende Bestimmungen des Rechts des gewöhnlichen Aufenthaltsorts des Verbrauchers
					entzogen wird.
				</li>
				<li>
					Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder
					öffentlich-rechtliches Sondervermögen, ist Gerichtsstand für alle Streitigkeiten aus
					diesem Vertragsverhältnis der Sitz des Anbieters.
				</li>
				<li>
					Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, so wird dadurch die
					Wirksamkeit der übrigen Bestimmungen nicht berührt.
				</li>
				<li>
					Die Europ&auml;ische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
					bereit:{' '}
					<a
						href="https://ec.europa.eu/consumers/odr/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline"
					>
						https://ec.europa.eu/consumers/odr/
					</a>
					. Der Anbieter ist nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren
					vor einer Verbraucherschlichtungsstelle teilzunehmen.
				</li>
			</ol>

			<h2 className="text-2xl font-semibold mt-10 mb-4">Kontakt</h2>
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
