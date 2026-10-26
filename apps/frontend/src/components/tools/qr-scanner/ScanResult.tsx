'use client';

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	ArrowDownTrayIcon,
	ArrowPathIcon,
	ArrowTopRightOnSquareIcon,
	ChatBubbleLeftEllipsisIcon,
	CheckIcon,
	ClipboardDocumentIcon,
	DocumentTextIcon,
	EnvelopeIcon,
	ExclamationTriangleIcon,
	EyeIcon,
	EyeSlashIcon,
	IdentificationIcon,
	InformationCircleIcon,
	LinkIcon,
	MapPinIcon,
	PhoneIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import type { ParsedQrContent, QrContentType } from './parseQrContent';

const TYPE_ICONS: Record<QrContentType, React.ComponentType<{ className?: string }>> = {
	url: LinkIcon,
	wifi: WifiIcon,
	vcard: IdentificationIcon,
	email: EnvelopeIcon,
	phone: PhoneIcon,
	sms: ChatBubbleLeftEllipsisIcon,
	geo: MapPinIcon,
	text: DocumentTextIcon,
};

const PRIMARY_LINK_CLASS = cn(buttonVariants(), 'gap-2');
const SECONDARY_LINK_CLASS = cn(buttonVariants({ variant: 'outline' }), 'gap-2');
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wider text-slate-400';

type Translate = ReturnType<typeof useTranslations<'qrScannerTool.result'>>;

export function ScanResult({
	raw,
	parsed,
	previewUrl,
	onReset,
	headingRef,
}: {
	raw: string;
	parsed: ParsedQrContent;
	previewUrl: string | null;
	onReset: () => void;
	headingRef: RefObject<HTMLHeadingElement | null>;
}) {
	const t = useTranslations('qrScannerTool.result');
	const tScanner = useTranslations('qrScannerTool.scanner');
	const Icon = TYPE_ICONS[parsed.type];
	const [showPassword, setShowPassword] = useState(false);

	return (
		<section className="p-3 text-left sm:p-5">
			<header className="flex items-start gap-4">
				{previewUrl && (
					// Object URLs cannot go through next/image
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={previewUrl}
						alt={tScanner('previewAlt')}
						className="h-14 w-14 flex-shrink-0 rounded-2xl bg-slate-100 object-contain p-1"
					/>
				)}
				<div className="min-w-0 flex-1">
					<h2
						ref={headingRef}
						tabIndex={-1}
						className={cn(
							LABEL_CLASS,
							'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
						)}
					>
						{t('title')}
					</h2>
					<p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
						<Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
						{t(`types.${parsed.type}`)}
					</p>
				</div>
				<CopyButton text={raw} label={t('copy')} copiedLabel={t('copied')} />
			</header>

			<div className="mt-6 border-t border-slate-100 pt-6">
				<ResultBody
					parsed={parsed}
					t={t}
					showPassword={showPassword}
					onTogglePassword={() => setShowPassword((value) => !value)}
				/>
			</div>

			{parsed.type !== 'text' && (
				<details className="mt-6">
					<summary className="cursor-pointer rounded text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
						{t('rawContent')}
					</summary>
					<pre className="mt-3 whitespace-pre-wrap break-all rounded-2xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200">
						{raw}
					</pre>
				</details>
			)}

			<footer className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
				<ResultActions parsed={parsed} raw={raw} t={t} />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="gap-2 text-slate-600 sm:ml-auto"
					onClick={onReset}
				>
					<ArrowPathIcon className="h-4 w-4" aria-hidden />
					{tScanner('scanAnother')}
				</Button>
			</footer>
		</section>
	);
}

function ResultBody({
	parsed,
	t,
	showPassword,
	onTogglePassword,
}: {
	parsed: ParsedQrContent;
	t: Translate;
	showPassword: boolean;
	onTogglePassword: () => void;
}) {
	switch (parsed.type) {
		case 'url':
			return (
				<div className="space-y-5">
					<UrlDisplay url={parsed.url} />
					<Notice tone={parsed.isShortLink ? 'warning' : 'info'}>
						{parsed.isShortLink ? t('shortLinkNotice') : t('linkNotice')}
					</Notice>
				</div>
			);
		case 'wifi':
			return (
				<Fields>
					<Field label={t('fields.ssid')}>
						<span className="font-semibold">{parsed.ssid}</span>
					</Field>
					<Field label={t('fields.encryption')}>
						{parsed.encryption ?? t('fields.noPassword')}
					</Field>
					{parsed.password !== null && (
						<Field label={t('fields.password')}>
							<span className="inline-flex items-center gap-3">
								<span className="font-mono tracking-wider">
									{showPassword
										? parsed.password
										: '•'.repeat(Math.min(parsed.password.length, 12))}
								</span>
								<button
									type="button"
									onClick={onTogglePassword}
									aria-pressed={showPassword}
									aria-label={showPassword ? t('hidePassword') : t('showPassword')}
									className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									{showPassword ? (
										<EyeSlashIcon className="h-4 w-4" aria-hidden />
									) : (
										<EyeIcon className="h-4 w-4" aria-hidden />
									)}
								</button>
							</span>
						</Field>
					)}
					<Field label={t('fields.hidden')}>
						{parsed.hidden ? t('fields.yes') : t('fields.no')}
					</Field>
				</Fields>
			);
		case 'vcard':
			return (
				<Fields>
					{parsed.name && (
						<Field label={t('fields.name')} wide>
							<span className="text-xl font-bold">{parsed.name}</span>
							{(parsed.jobTitle || parsed.organization) && (
								<span className="mt-0.5 block text-sm text-slate-500">
									{[parsed.jobTitle, parsed.organization].filter(Boolean).join(' · ')}
								</span>
							)}
						</Field>
					)}
					{!parsed.name && parsed.organization && (
						<Field label={t('fields.organization')}>{parsed.organization}</Field>
					)}
					{!parsed.name && parsed.jobTitle && (
						<Field label={t('fields.jobTitle')}>{parsed.jobTitle}</Field>
					)}
					{parsed.phones.length > 0 && (
						<Field label={t('fields.phone')}>
							<LinkList
								items={parsed.phones.map((phone) => ({ label: phone, href: `tel:${phone}` }))}
							/>
						</Field>
					)}
					{parsed.emails.length > 0 && (
						<Field label={t('fields.email')}>
							<LinkList
								items={parsed.emails.map((email) => ({ label: email, href: `mailto:${email}` }))}
							/>
						</Field>
					)}
					{parsed.websites.length > 0 && (
						<Field label={t('fields.website')}>
							<LinkList
								external
								items={parsed.websites.map((url) => ({ label: url, href: url }))}
							/>
						</Field>
					)}
					{parsed.address && <Field label={t('fields.address')}>{parsed.address}</Field>}
					{parsed.note && (
						<Field label={t('fields.note')} wide>
							<span className="whitespace-pre-wrap">{parsed.note}</span>
						</Field>
					)}
				</Fields>
			);
		case 'email':
			return (
				<Fields>
					<Field label={t('fields.to')}>
						<span className="font-semibold">{parsed.to}</span>
					</Field>
					{parsed.subject && <Field label={t('fields.subject')}>{parsed.subject}</Field>}
					{parsed.body && (
						<Field label={t('fields.message')} wide>
							<span className="whitespace-pre-wrap">{parsed.body}</span>
						</Field>
					)}
				</Fields>
			);
		case 'phone':
			return (
				<Fields>
					<Field label={t('fields.number')}>
						<span className="text-xl font-bold">{parsed.number}</span>
					</Field>
				</Fields>
			);
		case 'sms':
			return (
				<Fields>
					<Field label={t('fields.number')}>
						<span className="font-semibold">{parsed.number}</span>
					</Field>
					{parsed.message && (
						<Field label={t('fields.message')} wide>
							<span className="whitespace-pre-wrap">{parsed.message}</span>
						</Field>
					)}
				</Fields>
			);
		case 'geo':
			return (
				<Fields>
					<Field label={t('fields.latitude')}>
						<span className="font-mono">{parsed.latitude}</span>
					</Field>
					<Field label={t('fields.longitude')}>
						<span className="font-mono">{parsed.longitude}</span>
					</Field>
				</Fields>
			);
		case 'text':
			return (
				<p className="whitespace-pre-wrap break-words text-base leading-relaxed text-slate-900">
					{parsed.text}
				</p>
			);
	}
}

function ResultActions({ parsed, raw, t }: { parsed: ParsedQrContent; raw: string; t: Translate }) {
	switch (parsed.type) {
		case 'url':
			return (
				<a
					href={parsed.url}
					target="_blank"
					rel="noopener noreferrer"
					className={PRIMARY_LINK_CLASS}
				>
					<ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
					{t('openLink')}
				</a>
			);
		case 'wifi':
			return parsed.password !== null ? (
				<CopyButton
					text={parsed.password}
					label={t('copyPassword')}
					copiedLabel={t('copied')}
					variant="default"
				/>
			) : null;
		case 'vcard':
			return (
				<a
					href={`data:text/vcard;charset=utf-8,${encodeURIComponent(parsed.vcf)}`}
					download={`${(parsed.name ?? 'contact').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'contact'}.vcf`}
					className={PRIMARY_LINK_CLASS}
				>
					<ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
					{t('downloadVcf')}
				</a>
			);
		case 'email':
			return (
				<a href={raw.trim()} className={PRIMARY_LINK_CLASS}>
					<EnvelopeIcon className="h-4 w-4" aria-hidden />
					{t('composeEmail')}
				</a>
			);
		case 'phone':
			return (
				<a href={`tel:${parsed.number}`} className={PRIMARY_LINK_CLASS}>
					<PhoneIcon className="h-4 w-4" aria-hidden />
					{t('call')}
				</a>
			);
		case 'sms':
			return (
				<a href={`sms:${parsed.number}`} className={PRIMARY_LINK_CLASS}>
					<ChatBubbleLeftEllipsisIcon className="h-4 w-4" aria-hidden />
					{t('sendSms')}
				</a>
			);
		case 'geo':
			return (
				<a
					href={`https://www.openstreetmap.org/?mlat=${parsed.latitude}&mlon=${parsed.longitude}#map=16/${parsed.latitude}/${parsed.longitude}`}
					target="_blank"
					rel="noopener noreferrer"
					className={SECONDARY_LINK_CLASS}
				>
					<MapPinIcon className="h-4 w-4" aria-hidden />
					{t('showOnMap')}
				</a>
			);
		case 'text':
			return null;
	}
}

function UrlDisplay({ url }: { url: string }) {
	let parts: { prefix: string; host: string; rest: string } | null = null;
	try {
		const { host } = new URL(url);
		const index = url.toLowerCase().indexOf(host);
		if (index >= 0) {
			parts = {
				prefix: url.slice(0, index),
				host: url.slice(index, index + host.length),
				rest: url.slice(index + host.length),
			};
		}
	} catch {
		parts = null;
	}

	return (
		<p className="break-all text-lg font-medium leading-snug sm:text-xl">
			{parts ? (
				<>
					<span className="text-slate-400">{parts.prefix}</span>
					<span className="font-bold text-slate-900">{parts.host}</span>
					<span className="text-slate-400">{parts.rest}</span>
				</>
			) : (
				<span className="text-slate-900">{url}</span>
			)}
		</p>
	);
}

function Notice({ tone, children }: { tone: 'info' | 'warning'; children: ReactNode }) {
	const NoticeIcon = tone === 'warning' ? ExclamationTriangleIcon : InformationCircleIcon;
	return (
		<p className="flex items-start gap-2 text-sm leading-relaxed text-slate-500">
			<NoticeIcon
				className={cn(
					'mt-0.5 h-4 w-4 flex-shrink-0',
					tone === 'warning' ? 'text-amber-500' : 'text-slate-400',
				)}
				aria-hidden
			/>
			<span>{children}</span>
		</p>
	);
}

function Fields({ children }: { children: ReactNode }) {
	return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
	return (
		<div className={cn('min-w-0', wide && 'sm:col-span-2')}>
			<dt className={LABEL_CLASS}>{label}</dt>
			<dd className="mt-1 break-words text-base text-slate-900">{children}</dd>
		</div>
	);
}

function LinkList({
	items,
	external = false,
}: {
	items: Array<{ label: string; href: string }>;
	external?: boolean;
}) {
	return (
		<ul className="space-y-1">
			{items.map((item) => (
				<li key={item.href}>
					<a
						href={item.href}
						target={external ? '_blank' : undefined}
						rel={external ? 'noopener noreferrer' : undefined}
						className="break-all underline-offset-4 hover:underline"
					>
						{item.label}
					</a>
				</li>
			))}
		</ul>
	);
}

function CopyButton({
	text,
	label,
	copiedLabel,
	variant = 'ghost',
}: {
	text: string;
	label: string;
	copiedLabel: string;
	variant?: 'ghost' | 'default';
}) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 2000);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	return (
		<Button
			type="button"
			variant={variant}
			size={variant === 'ghost' ? 'sm' : 'default'}
			className={cn('gap-2', variant === 'ghost' && 'text-slate-600')}
			onClick={() => void copy()}
		>
			{copied ? (
				<CheckIcon className="h-4 w-4" aria-hidden />
			) : (
				<ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
			)}
			<span aria-live="polite">{copied ? copiedLabel : label}</span>
		</Button>
	);
}
