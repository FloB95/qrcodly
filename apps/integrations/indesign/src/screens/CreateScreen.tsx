import { useEffect, useMemo, useState } from 'react';
import type { TConfigTemplateResponseDto } from '@shared/schemas';
import { ApiError, blobToDataUrl, QrcodlyApi } from '../lib/api-client';
import { getAutoPlaceSizeMm, placePngInActiveDocument, PRINT_QR_PX } from '../lib/indesign';
import { BrandHeader } from '../components/Logo';
import { Button } from '../components/Button';
import { QrPreview } from '../components/QrPreview';

type Props = {
	apiKey: string;
	onDone: () => void;
	onCancel: () => void;
};

type ContentType = 'url' | 'text';

const SHORT_URL_BASE = 'https://qrcodly.de/u/';

export function CreateScreen({ apiKey, onDone, onCancel }: Props) {
	const api = useMemo(() => new QrcodlyApi(apiKey), [apiKey]);

	const [templates, setTemplates] = useState<TConfigTemplateResponseDto[]>([]);
	const [templateId, setTemplateId] = useState<string>('');
	const [contentType, setContentType] = useState<ContentType>('url');
	const [value, setValue] = useState('');
	const [name, setName] = useState('');
	const [isDynamic, setIsDynamic] = useState(true);
	const [reservedShortCode, setReservedShortCode] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedTemplate = templates.find((t) => t.id === templateId);
	const trimmed = value.trim();
	const livePayload = trimmed
		? contentType === 'url' && isDynamic && reservedShortCode
			? `${SHORT_URL_BASE}${reservedShortCode}`
			: trimmed
		: null;

	useEffect(() => {
		Promise.all([api.listPredefinedTemplates(), api.listMyTemplates()])
			.then(([predefined, mine]) => {
				setTemplates([...predefined.data, ...mine.data]);
				const modern = predefined.data.find((t) => t.name.toLowerCase() === 'modern');
				const initial = modern ?? predefined.data[0];
				if (initial) setTemplateId(initial.id);
			})
			.catch(() => {
				// templates unavailable — user can still create without one
			});
	}, [api]);

	// Reserve a short code when the user picks dynamic URL (used as preview so
	// the rendered QR matches what the saved record will actually encode).
	useEffect(() => {
		if (contentType !== 'url' || !isDynamic) {
			setReservedShortCode(null);
			return;
		}
		if (reservedShortCode) return;
		let cancelled = false;
		void api
			.getReservedShortCode()
			.then((res) => {
				if (!cancelled) setReservedShortCode(res.shortCode);
			})
			.catch(() => {
				/* non-fatal — render without it */
			});
		return () => {
			cancelled = true;
		};
	}, [api, contentType, isDynamic, reservedShortCode]);

	const submit = async () => {
		if (!value.trim()) {
			setError('Enter content');
			return;
		}
		setError(null);
		setSubmitting(true);

		let newQr;
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
			newQr = await api.createQrCode({
				name: name.trim() || null,
				content,
				templateId: templateId || undefined,
			});
		} catch (err) {
			if (err instanceof ApiError) setError(err.message);
			else setError(err instanceof Error ? err.message : 'Failed');
			setSubmitting(false);
			return;
		}

		if (newQr.qrCodeData) {
			try {
				const blob = await api.renderQrPng({
					config: newQr.config,
					data: newQr.qrCodeData,
					sizePx: PRINT_QR_PX,
					printSizeMm: getAutoPlaceSizeMm(),
				});
				const dataUrl = await blobToDataUrl(blob);
				await placePngInActiveDocument(dataUrl, newQr.name ?? newQr.id);
			} catch (err) {
				// The QR was created successfully server-side — only placement failed.
				// Surface the error but still return the user to the list so they can
				// click the saved QR to retry insertion.
				setError(err instanceof Error ? err.message : 'Failed to place QR code');
				setSubmitting(false);
				return;
			}
		}

		setSubmitting(false);
		onDone();
	};

	const showShortUrlHint = contentType === 'url' && isDynamic && reservedShortCode;

	return (
		<div className="app">
			<div className="header">
				<BrandHeader />
				<Button onClick={onCancel}>Cancel</Button>
			</div>

			<div className={livePayload ? 'live-preview' : 'live-preview empty'}>
				{livePayload ? (
					<QrPreview
						api={api}
						config={(selectedTemplate?.config ?? {}) as never}
						data={livePayload}
						sizePx={400}
					/>
				) : (
					<span>Preview</span>
				)}
			</div>

			<div className="field">
				<label>Name (optional)</label>
				<input className="input" value={name} onChange={(e) => setName(e.target.value)} />
			</div>

			<div className="field">
				<label>Type</label>
				<select
					className="input"
					value={contentType}
					onChange={(e) => setContentType(e.target.value as ContentType)}
				>
					<option value="url">URL</option>
					<option value="text">Text</option>
				</select>
			</div>

			<div className="field">
				<label>{contentType === 'url' ? 'URL' : 'Text'}</label>
				<input
					className="input"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={contentType === 'url' ? 'https://…' : 'Any text'}
				/>
			</div>

			{contentType === 'url' && (
				<label className="toggle-row">
					<input
						type="checkbox"
						checked={isDynamic}
						onChange={(e) => setIsDynamic(e.target.checked)}
					/>
					<span className="label">Dynamic QR code</span>
				</label>
			)}

			{showShortUrlHint && (
				<div className="short-url-display">{`${SHORT_URL_BASE}${reservedShortCode}`}</div>
			)}

			{templates.length > 0 && (
				<div className="field">
					<label>Template</label>
					<select
						className="input"
						value={templateId}
						onChange={(e) => setTemplateId(e.target.value)}
					>
						{templates.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</select>
				</div>
			)}

			{error && <p className="error">{error}</p>}
			<Button variant="primary" onClick={submit} disabled={submitting}>
				{submitting ? 'Creating…' : 'Create & insert'}
			</Button>
		</div>
	);
}
