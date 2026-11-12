import { deDE, enUS, esES, frFR, itIT, nlNL, plPL, ptBR, ruRU } from '@clerk/localizations';

type ClerkLocalization = typeof enUS;

// Every account gets product news by email (opt-out), so sign-up has to say so.
// Sign-in shows it too: a Google/GitHub sign-up that starts there never reaches the sign-up card.
// signUp.continue is where such a sign-up lands when it still needs the terms checkbox.
// titleCombined: only used where Clerk lacks it, else the combined card (desktop app) shows the
// English title. Same for the sign-up password placeholder, which only Clerk's English texts define.
function withNewsletterNotice(
	base: ClerkLocalization,
	notice: string,
	titleCombined?: string,
): ClerkLocalization {
	return {
		...base,
		formFieldInputPlaceholder__signUpPassword:
			base.formFieldInputPlaceholder__signUpPassword ?? base.formFieldInputPlaceholder__password,
		signIn: {
			...base.signIn,
			start: {
				...base.signIn?.start,
				titleCombined: base.signIn?.start?.titleCombined ?? titleCombined,
				subtitle: notice,
				subtitleCombined: notice,
			},
		},
		signUp: {
			...base.signUp,
			start: { ...base.signUp?.start, subtitle: notice, subtitleCombined: notice },
			continue: { ...base.signUp?.continue, subtitle: notice },
		},
	};
}

// Our pages say "du", Clerk's German says "Sie": switch the texts on the first card and the
// consent steps, the later steps (password, code) keep Clerk's wording.
const deDEWithDu: ClerkLocalization = {
	...deDE,
	signUp: {
		...deDE.signUp,
		start: {
			...deDE.signUp?.start,
			title: 'Erstelle dein Konto',
			titleCombined: 'Erstelle dein Konto',
			actionText: 'Hast du schon ein Konto?',
		},
		continue: {
			...deDE.signUp?.continue,
			title: 'Ergänze die fehlenden Angaben',
			actionText: 'Hast du schon ein Konto?',
		},
		legalConsent: {
			...deDE.signUp?.legalConsent,
			continue: {
				...deDE.signUp?.legalConsent?.continue,
				subtitle: 'Bitte lies und akzeptiere die Bedingungen, um fortzufahren',
			},
		},
	},
};

const clerkLocalizations = {
	en: withNewsletterNotice(
		enUS,
		"With your account, you'll occasionally receive news about QRcodly by email. You can object at any time, at no cost other than the transmission costs at basic rates.",
	),
	de: withNewsletterNotice(
		deDEWithDu,
		'Mit deinem Konto erhältst du gelegentlich Neuigkeiten zu QRcodly per E-Mail. Du kannst dem jederzeit widersprechen, ohne dass dir andere als die Übermittlungskosten nach den Basistarifen entstehen.',
	),
	nl: withNewsletterNotice(
		nlNL,
		'Met je account ontvang je af en toe nieuws over QRcodly per e-mail. Je kunt hier op elk moment bezwaar tegen maken, zonder andere kosten dan de verzendkosten volgens de basistarieven.',
		'Doorgaan naar {{applicationName}}',
	),
	fr: withNewsletterNotice(
		frFR,
		'Avec votre compte, vous recevrez occasionnellement des nouvelles de QRcodly par e-mail. Vous pouvez vous y opposer à tout moment, sans autres frais que les coûts de transmission aux tarifs de base.',
	),
	it: withNewsletterNotice(
		itIT,
		'Con il tuo account riceverai occasionalmente novità su QRcodly via e-mail. Puoi opporti in qualsiasi momento, senza costi diversi da quelli di trasmissione secondo le tariffe di base.',
		'Continua su {{applicationName}}',
	),
	es: withNewsletterNotice(
		esES,
		'Con tu cuenta recibirás ocasionalmente novedades sobre QRcodly por correo electrónico. Puedes oponerte en cualquier momento, sin más costes que los de transmisión según las tarifas básicas.',
		'Continuar a {{applicationName}}',
	),
	pl: withNewsletterNotice(
		plPL,
		'Wraz z kontem będziesz od czasu do czasu otrzymywać e-mailem informacje o nowościach w QRcodly. W każdej chwili możesz się temu sprzeciwić, bez kosztów innych niż koszty przesyłu według taryf podstawowych.',
	),
	pt: withNewsletterNotice(
		ptBR,
		'Com sua conta, você receberá ocasionalmente novidades sobre o QRcodly por e-mail. Você pode se opor a qualquer momento, sem custos além dos custos de transmissão pelas tarifas básicas.',
	),
	ru: withNewsletterNotice(
		ruRU,
		'Вместе с учётной записью вы будете время от времени получать новости о QRcodly по электронной почте. Вы можете отказаться от них в любой момент без каких-либо затрат, кроме расходов на передачу данных по базовым тарифам.',
	),
};

export function getClerkLocalization(locale?: string): ClerkLocalization {
	return clerkLocalizations[locale as keyof typeof clerkLocalizations] ?? clerkLocalizations.en;
}
