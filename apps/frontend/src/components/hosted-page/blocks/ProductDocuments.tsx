'use client';

import { useEffect, useMemo, useState } from 'react';
import type { THostedPageStyle } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { STYLE_TOKENS } from '../theme';
import { HostedDocumentList, type HostedDocumentItem } from './HostedDocumentList';

export type ProductDocumentItem = HostedDocumentItem & { category: string; language: string };

type ProductDocumentsProps = {
	style: THostedPageStyle;
	/** Document categories in display order, already named in the page's language */
	categories: { id: string; label: string }[];
	documents: ProductDocumentItem[];
	/** Earlier files of the documents, newest first */
	archive: ProductDocumentItem[];
	/** Language of the page itself; the visitor's browser languages win when a document matches */
	preferredLanguage: string;
	/** Inside another page (editor, marketing): category titles are no headings there */
	preview?: boolean;
	languageLabel: string;
	earlierLabel: string;
	/** Messages with a `{title}` placeholder */
	openTemplate: string;
	downloadTemplate: string;
};

// browsers report Norwegian as Bokmål or Nynorsk
const LANGUAGE_ALIASES: Record<string, string> = { nb: 'no', nn: 'no' };

const baseLanguage = (tag: string) => {
	const base = tag.toLowerCase().split('-')[0] ?? '';
	return LANGUAGE_ALIASES[base] ?? base;
};

function languageName(code: string): string {
	try {
		return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
	} catch {
		return code;
	}
}

/**
 * The documents of a product page, grouped by category and shown in one language at a time. A
 * client component, so it gets every text as a prop: hosted pages send no dictionary to the browser.
 */
export function ProductDocuments({
	style,
	categories,
	documents,
	archive,
	preferredLanguage,
	preview,
	languageLabel,
	earlierLabel,
	openTemplate,
	downloadTemplate,
}: ProductDocumentsProps) {
	const tokens = STYLE_TOKENS[style];
	const Heading = preview ? 'p' : 'h2';
	const languages = useMemo(
		() => [...new Set([...documents, ...archive].map((document) => document.language))],
		[documents, archive],
	);
	const pick = (wanted: readonly string[]) =>
		wanted.map(baseLanguage).find((code) => languages.includes(code));
	const [chosen, setChosen] = useState<string | null>(null);
	const [fromBrowser, setFromBrowser] = useState<string | undefined>(undefined);
	// after hydration only: the server knows the page's language, not every language of the phone
	useEffect(() => setFromBrowser(pick(navigator.languages)), [languages]); // eslint-disable-line react-hooks/exhaustive-deps
	const language =
		(chosen && languages.includes(chosen) ? chosen : undefined) ??
		fromBrowser ??
		pick([preferredLanguage, 'en']) ??
		languages[0];

	const listProps = {
		style,
		openLabel: (title: string) => openTemplate.replace('{title}', title),
		downloadLabel: (title: string) => downloadTemplate.replace('{title}', title),
	};
	// technical rows run from edge to edge; the other looks keep the card's padding
	const inset = style === 'technical' ? undefined : 'px-5';

	return (
		<div className="border-t border-[var(--hp-line)]">
			{languages.length > 1 && (
				<div
					role="group"
					aria-label={languageLabel}
					className="flex flex-wrap items-center gap-2 px-5 pt-4"
				>
					{languages.map((code) => (
						<button
							key={code}
							type="button"
							lang={code}
							aria-pressed={code === language}
							onClick={() => setChosen(code)}
							className={cn(
								'cursor-pointer px-3 py-1 text-xs font-medium capitalize ring-1 ring-[var(--hp-line)] transition-colors ring-inset',
								style === 'technical' ? 'rounded-md' : 'rounded-full',
								code === language
									? 'bg-[var(--hp-primary)] text-[var(--hp-on-primary)] ring-transparent'
									: 'text-[var(--hp-text)] hover:bg-[var(--hp-surface-2)]',
							)}
						>
							{languageName(code)}
						</button>
					))}
				</div>
			)}
			{categories.map(({ id, label }) => {
				const matches = (document: ProductDocumentItem) =>
					document.category === id && document.language === language;
				const current = documents.filter(matches);
				const earlier = archive.filter(matches);
				if (current.length === 0 && earlier.length === 0) return null;
				return (
					<section key={id} className="pt-5 last:pb-2">
						<Heading className={cn(tokens.eyebrow, 'px-5 pb-2 text-[var(--hp-text-muted)]')}>
							{label}
						</Heading>
						{current.length > 0 && (
							<div className={inset}>
								<HostedDocumentList {...listProps} items={current} />
							</div>
						)}
						{earlier.length > 0 && (
							<details className="group">
								<summary className="cursor-pointer px-5 py-2.5 text-xs text-[var(--hp-text-muted)] underline-offset-2 hover:underline">
									{earlierLabel} ({earlier.length})
								</summary>
								<div className={inset}>
									<HostedDocumentList {...listProps} items={earlier} />
								</div>
							</details>
						)}
					</section>
				);
			})}
		</div>
	);
}
