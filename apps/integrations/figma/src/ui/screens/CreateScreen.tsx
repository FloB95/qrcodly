import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, LinkIcon, QrCodeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { TConfigTemplateResponseDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { QrCodeDefaults } from '@shared/schemas/utils/QrCodeDefaults';
import type { InsertFormat } from '../../shared/messages';
import { QrcodlyApi } from '../lib/api-client';
import { CONTENT_TYPES } from '../lib/content-types';
import { insertQrCode } from '../lib/insert';
import { PlacementHint } from '../components/PlacementHint';
import { QrPreview } from '../components/QrPreview';
import { Spinner } from '../components/Spinner';

type Props = {
	apiKey: string;
	insertFormat: InsertFormat;
	onDone: () => void;
	onCancel: () => void;
};

type ContentType = 'url' | 'text';

const CREATABLE_TYPES: ContentType[] = ['url', 'text'];

export function CreateScreen({ apiKey, insertFormat, onDone, onCancel }: Props) {
	const api = useMemo(() => new QrcodlyApi(apiKey), [apiKey]);

	const [predefinedTemplates, setPredefinedTemplates] = useState<TConfigTemplateResponseDto[]>([]);
	const [myTemplates, setMyTemplates] = useState<TConfigTemplateResponseDto[]>([]);
	const [templateId, setTemplateId] = useState<string>('');
	const [contentType, setContentType] = useState<ContentType>('url');
	const [value, setValue] = useState('');
	const [debouncedValue, setDebouncedValue] = useState('');
	const [name, setName] = useState('');
	const [isDynamic, setIsDynamic] = useState(true);
	const [reservedShortCode, setReservedShortCode] = useState<string | null>(null);
	const [reservedShortUrl, setReservedShortUrl] = useState<string | null>(null);
	const [created, setCreated] = useState<TQrCodeWithRelationsResponseDto | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedTemplate = [...predefinedTemplates, ...myTemplates].find(
		(t) => t.id === templateId,
	);
	const isDynamicUrl = contentType === 'url' && isDynamic;
	const livePayload = debouncedValue
		? isDynamicUrl && reservedShortUrl
			? reservedShortUrl
			: debouncedValue
		: null;

	useEffect(() => {
		const t = setTimeout(() => setDebouncedValue(value.trim()), 300);
		return () => clearTimeout(t);
	}, [value]);

	useEffect(() => {
		Promise.all([api.listPredefinedTemplates(), api.listMyTemplates()])
			.then(([predefined, mine]) => {
				setPredefinedTemplates(predefined.data);
				setMyTemplates(mine.data);
				const modern = predefined.data.find((t) => t.name.toLowerCase() === 'modern');
				const initial = modern ?? predefined.data[0];
				if (initial) setTemplateId(initial.id);
			})
			.catch(() => {
				// templates unavailable — user can still create without one
			});
	}, [api]);

	// Reserve a short code for dynamic URLs so the preview encodes exactly what
	// the saved record will.
	useEffect(() => {
		if (!isDynamicUrl || reservedShortCode) return;
		let cancelled = false;
		void api
			.getReservedShortCode()
			.then((res) => {
				if (cancelled) return;
				setReservedShortCode(res.shortCode);
				setReservedShortUrl(res.shortUrl);
			})
			.catch(() => {
				/* non-fatal — render without it */
			});
		return () => {
			cancelled = true;
		};
	}, [api, isDynamicUrl, reservedShortCode]);

	const submit = async () => {
		if (!created && !value.trim()) {
			setError(contentType === 'url' ? 'Enter a URL.' : 'Enter some text.');
			return;
		}
		setError(null);
		setSubmitting(true);

		let qr = created;
		if (!qr) {
			try {
				const content =
					contentType === 'url'
						? {
								type: 'url' as const,
								data: {
									url: value.trim(),
									isDynamic,
									...(isDynamic && reservedShortCode ? { shortCode: reservedShortCode } : {}),
								},
							}
						: { type: 'text' as const, data: value.trim() };

				// Send templateId only; sending config too would replace the raw
				// image storage key with the public URL and break the embed.
				qr = await api.createQrCode({
					name: name.trim() || null,
					content,
					templateId: templateId || undefined,
				});
				setCreated(qr);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to create the QR code');
				setSubmitting(false);
				return;
			}
		}

		try {
			await insertQrCode(api, qr, insertFormat);
		} catch (err) {
			// The QR code is saved — retrying only re-runs the insert, so no duplicate is created.
			const reason = err instanceof Error ? err.message : 'unknown error';
			setError(`Your QR code was saved, but inserting it failed: ${reason}`);
			setSubmitting(false);
			return;
		}

		setSubmitting(false);
		onDone();
	};

	return (
		<div className="app">
			<header className="topbar">
				<button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
					<ArrowLeftIcon />
					Back
				</button>
				<span className="topbar-title">New QR code</span>
			</header>

			<div className="scroll">
				<fieldset className="form" disabled={created !== null}>
					<div className={livePayload ? 'live-preview' : 'live-preview is-empty'}>
						{livePayload ? (
							<QrPreview
								api={api}
								config={selectedTemplate?.config ?? QrCodeDefaults}
								data={livePayload}
								sizePx={400}
							/>
						) : (
							<span className="live-preview-placeholder">
								<QrCodeIcon />
								Live preview
							</span>
						)}
					</div>

					<div className="tabs" role="tablist">
						{CREATABLE_TYPES.map((type) => {
							const { icon: Icon, label } = CONTENT_TYPES[type];
							return (
								<button
									key={type}
									type="button"
									role="tab"
									aria-selected={contentType === type}
									className={contentType === type ? 'tab is-active' : 'tab'}
									onClick={() => setContentType(type)}
								>
									<Icon />
									{label}
								</button>
							);
						})}
					</div>

					<div className="field">
						<label className="label" htmlFor="qr-content">
							{contentType === 'url' ? 'Website URL' : 'Text'}
						</label>
						{contentType === 'url' ? (
							<input
								id="qr-content"
								className="input"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								placeholder="https://example.com"
								type="url"
								autoFocus
							/>
						) : (
							<textarea
								id="qr-content"
								className="input textarea"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								placeholder="Any text"
								rows={3}
							/>
						)}
					</div>

					{contentType === 'url' && (
						<div className="field">
							<button
								type="button"
								role="switch"
								aria-checked={isDynamic}
								className={isDynamic ? 'dynamic-toggle is-on' : 'dynamic-toggle'}
								onClick={() => setIsDynamic((v) => !v)}
							>
								Dynamic
								<span className="switch">
									<span className="switch-thumb" />
								</span>
							</button>
							<p className="help">
								{isDynamic
									? 'Change the destination and track scans after printing.'
									: 'The URL is encoded directly and cannot be changed later.'}
							</p>
							{isDynamic && reservedShortUrl && (
								<p className="short-url">
									<LinkIcon />
									{reservedShortUrl}
								</p>
							)}
						</div>
					)}

					<div className="field">
						<label className="label" htmlFor="qr-name">
							Name <span className="optional">optional</span>
						</label>
						<input
							id="qr-name"
							className="input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={50}
						/>
					</div>

					{predefinedTemplates.length + myTemplates.length > 0 && (
						<div className="field">
							<label className="label" htmlFor="qr-template">
								Template
							</label>
							<select
								id="qr-template"
								className="input select"
								value={templateId}
								onChange={(e) => setTemplateId(e.target.value)}
							>
								{myTemplates.length > 0 && (
									<optgroup label="My templates">
										{myTemplates.map((t) => (
											<option key={t.id} value={t.id}>
												{t.name}
											</option>
										))}
									</optgroup>
								)}
								<optgroup label="QRcodly templates">
									{predefinedTemplates.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</optgroup>
							</select>
						</div>
					)}
				</fieldset>
			</div>

			<footer className="footer footer-stack">
				{error && <p className="alert">{error}</p>}
				<PlacementHint />
				<button
					type="button"
					className="btn btn-primary btn-block"
					onClick={submit}
					disabled={submitting}
				>
					{submitting ? <Spinner /> : <SparklesIcon />}
					{submitting ? 'Working…' : created ? 'Retry insert' : 'Create & insert'}
				</button>
			</footer>
		</div>
	);
}
