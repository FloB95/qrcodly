'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
	HOSTED_PDF_MAX_DOCUMENTS,
	type THostedPdfDocument,
	type THostedUploadResponseDto,
	type TPdfInput,
} from '@shared/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useHostedAssetUrls } from '@/hooks/useHostedPagePreview';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import {
	HOSTED_PAGE_LIMITS,
	useHostedPageUsageQuery,
	useUploadHostedFileMutation,
} from '@/lib/api/hosted-page';
import { HostedPageUsage, useHostedPlanRoom } from './HostedPageUsage';
import { formatBytes } from '@/components/hosted-page/format';
import {
	isPdfContentUntouched,
	readPdfSampleTexts,
} from '@/components/hosted-page/page-types/pdf.preview';
import { CharacterCounter } from './CharacterCounter';
import { HostedFileDropzone } from './HostedFileDropzone';
import { HostedPageDesignFields } from './HostedPageDesignFields';
import { HostedPageProGate } from './HostedPageProGate';
import { HostedPageTemplates, type HostedTemplateChoice } from './HostedPageTemplates';
import { resolveActiveTemplate } from '@/components/hosted-page/preview';
import {
	getStylePresetTheme,
	getTemplateTheme,
	type THostedPageTemplateId,
	type TQrCodeContent,
} from '@shared/schemas';

type PdfSectionProps = {
	value: TPdfInput;
	onChange: (data: TPdfInput) => void;
};

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 500;
const BRAND_MAX = 80;
const BUTTON_MAX = 40;
const MB = 1024 * 1024;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
// unused uploads are deleted after 24 hours; a cached template image is reused well before that
const TEMPLATE_UPLOAD_REUSE_MS = 12 * 60 * 60 * 1000;

/** Text fields that are debounced before they reach the store (and with it the preview). */
type TextFields = {
	title: string;
	description: string;
	brandName: string;
	buttonLabel: string;
	linkLabel: string;
	linkUrl: string;
};

const toTextFields = (value: TPdfInput): TextFields => ({
	title: value.title,
	description: value.description ?? '',
	brandName: value.brandName ?? '',
	buttonLabel: value.buttonLabel ?? '',
	linkLabel: value.link?.label ?? '',
	linkUrl: value.link?.url ?? '',
});

/** The fields as they reach the store: trimmed. */
const committedForm = (fields: TextFields): TextFields => ({
	title: fields.title,
	description: fields.description.trim(),
	brandName: fields.brandName.trim(),
	buttonLabel: fields.buttonLabel.trim(),
	linkLabel: fields.linkLabel.trim(),
	linkUrl: fields.linkUrl.trim(),
});

const PdfSectionBase = ({ value, onChange: commitToStore }: PdfSectionProps) => {
	const t = useTranslations('generator.contentSwitch.pdf');
	const { isSignedIn } = useAuth();
	const { hasProPlan, isLoading } = useHasProPlan();
	const {
		id: qrCodeId,
		rememberHostedAsset,
		hostedSampleTemplate,
		setHostedSampleTemplate,
		setHostedPreviewView,
		hostedAdopted,
		setHostedAdopted,
		hostedTemplate,
		setHostedTemplate,
		hostedTemplateUploads,
		rememberTemplateUpload,
	} = useQrCodeGeneratorStore((state) => state);
	const tTemplates = useTranslations('generator.contentSwitch.hosted.templates');
	const assetUrls = useHostedAssetUrls();

	const latest = useRef(value);
	latest.current = value;
	// Uploads finish after the owner may have switched to another content type; their result must
	// not switch the generator back to this page.
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const commit = (next: TPdfInput) => {
		if (mounted.current) commitToStore(next);
	};
	// the owner's first own change replaces the template sample in the preview
	const onChange = (next: TPdfInput) => {
		if (hostedSampleTemplate) setHostedSampleTemplate(null);
		commit(next);
	};
	const activeTemplate = resolveActiveTemplate(hostedTemplate, value.theme);
	// "open directly" skips the landing page, so only what names the file is left to edit
	const direct = value.openMode === 'direct';

	// Adopting a template copies its design, texts and images into the page, so the owner edits
	// from there instead of from nothing. A field is written only while it is empty or still holds
	// what the previous template put there: the owner's own words and images always survive.
	const upload = useUploadHostedFileMutation();
	const [adopting, setAdopting] = useState(false);
	const fromTemplate = (field: keyof NonNullable<typeof hostedAdopted>) => {
		const current = value[field];
		return !current || current === hostedAdopted?.[field];
	};
	const adoptTemplate = async (id: THostedPageTemplateId) => {
		const texts = readPdfSampleTexts(tTemplates, id);
		const adopted: NonNullable<typeof hostedAdopted> = {};
		const next: TPdfInput = { ...value, theme: getTemplateTheme(id) };
		for (const field of ['title', 'description', 'brandName', 'buttonLabel'] as const) {
			if (fromTemplate(field)) {
				next[field] = texts[field];
				adopted[field] = texts[field];
			}
		}
		setHostedSampleTemplate(null);
		setHostedAdopted({
			...adopted,
			coverKey: hostedAdopted?.coverKey,
			logoKey: hostedAdopted?.logoKey,
		});
		commit(next);

		const slots = (['coverKey', 'logoKey'] as const).filter(fromTemplate);
		if (slots.length === 0) return;
		setAdopting(true);
		try {
			for (const slot of slots) {
				// each template image is uploaded once per session: switching back and forth between
				// templates must not use up the pending uploads or the upload rate
				const slotKey = `${id}:${slot}`;
				const cached = hostedTemplateUploads?.[slotKey];
				let fileKey =
					cached && Date.now() - cached.uploadedAt < TEMPLATE_UPLOAD_REUSE_MS
						? cached.fileKey
						: undefined;
				if (!fileKey) {
					const name = slot === 'coverKey' ? `${id}-cover.webp` : `${id}-logo.png`;
					const response = await fetch(`/hosted-templates/${name}`);
					if (!response.ok) continue;
					const file = new File([await response.blob()], name, {
						type: slot === 'coverKey' ? 'image/webp' : 'image/png',
					});
					const result = await upload.mutateAsync({ file, kind: 'image' });
					rememberHostedAsset(result.fileKey, result.url);
					rememberTemplateUpload(slotKey, result.fileKey);
					fileKey = result.fileKey;
				}
				adopted[slot] = fileKey;
				setHostedAdopted({ ...adopted });
				commit({ ...latest.current, [slot]: fileKey });
			}
		} catch {
			// texts and design are adopted already; the images stay for the owner to upload
		} finally {
			setAdopting(false);
		}
	};
	const chooseTemplate = (choice: HostedTemplateChoice) => {
		setHostedTemplate(choice);
		if (choice === 'blank') {
			// clears what a template wrote; whatever the owner typed or uploaded stays
			setHostedSampleTemplate(null);
			setHostedAdopted(null);
			commit({
				...value,
				theme: getStylePresetTheme('editorial'),
				title: fromTemplate('title') ? '' : value.title,
				description: fromTemplate('description') ? undefined : value.description,
				brandName: fromTemplate('brandName') ? undefined : value.brandName,
				buttonLabel: fromTemplate('buttonLabel') ? undefined : value.buttonLabel,
				coverKey: fromTemplate('coverKey') ? undefined : value.coverKey,
				logoKey: fromTemplate('logoKey') ? undefined : value.logoKey,
			});
			return;
		}
		void adoptTemplate(choice);
	};
	const sampleText = (key: 'title' | 'description' | 'brandName' | 'documents') =>
		activeTemplate ? tTemplates(`${activeTemplate}.sample.${key}`) : null;

	const [fields, setFields] = useState<TextFields>(() => toTextFields(value));
	const [debounced] = useDebouncedValue(fields, 400);
	const setField = (key: keyof TextFields, next: string) =>
		setFields((current) => ({ ...current, [key]: next }));

	useEffect(() => {
		const linkLabel = debounced.linkLabel.trim();
		const linkUrl = debounced.linkUrl.trim();
		const next: TPdfInput = {
			...value,
			title: debounced.title,
			description: debounced.description.trim() || undefined,
			brandName: debounced.brandName.trim() || undefined,
			buttonLabel: debounced.buttonLabel.trim() || undefined,
			// half a button stays in the content, so saving waits until both fields are filled
			link: linkLabel || linkUrl ? { label: linkLabel, url: linkUrl } : undefined,
		};
		if (JSON.stringify(next) === JSON.stringify(value)) return;
		onChange(next);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	// Sync when the store resets or loads a saved code. Compared in committed form, so the trimming
	// of the commit never eats a space being typed and an address typed before its label survives.
	useEffect(() => {
		const incoming = toTextFields(value);
		setFields((current) =>
			JSON.stringify(committedForm(current)) === JSON.stringify(committedForm(incoming))
				? current
				: incoming,
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		value.title,
		value.description,
		value.brandName,
		value.buttonLabel,
		value.link?.label,
		value.link?.url,
	]);

	// Without Pro nothing new can be built. An existing page stays editable after a downgrade, as
	// the API allows: texts and documents can change, uploads and the design stay Pro.
	const planLocked = !isSignedIn || (!isLoading && !hasProPlan);
	const isExistingPage = Boolean(qrCodeId);
	const locked = planLocked && !isExistingPage;
	const uploadsLocked = planLocked;
	const { data: usage } = useHostedPageUsageQuery(qrCodeId ?? null);
	const maxPdfBytes = usage?.maxFileSizeBytes.pdf || HOSTED_PAGE_LIMITS.pro.maxFileSizeBytes.pdf;
	const maxImageBytes =
		usage?.maxFileSizeBytes.image || HOSTED_PAGE_LIMITS.pro.maxFileSizeBytes.image;
	const draft = { type: 'pdf', data: value } as TQrCodeContent;
	const { hasRoomForFile } = useHostedPlanRoom(draft, qrCodeId ?? null);
	const documents = value.documents;
	// a link button needs both its text and its address; until then saving stays disabled
	const hasLinkLabel = Boolean(fields.linkLabel.trim());
	const hasLinkUrl = Boolean(fields.linkUrl.trim());
	const linkIssue =
		hasLinkLabel && !hasLinkUrl
			? 'urlMissing'
			: !hasLinkLabel && hasLinkUrl
				? 'labelMissing'
				: null;
	// the big button exists only on a one-document page; with a template's stand-ins the
	// preview already shows a list when the template expects several files
	const expectedDocuments =
		documents.length ||
		(activeTemplate ? readPdfSampleTexts(tTemplates, activeTemplate).documents.length : 0);
	const showButtonLabel = expectedDocuments <= 1;

	// uploads finish later, so they merge into the newest content, not the one they started from.
	// Every document gets a stable id that stays when its file is replaced.
	const addDocument = (upload: THostedUploadResponseDto) =>
		onChange({
			...latest.current,
			documents: [
				...latest.current.documents,
				{
					id: crypto.randomUUID(),
					fileKey: upload.fileKey,
					fileName: upload.fileName,
					fileSize: upload.fileSize,
				},
			],
		});

	const replaceDocumentFile = (documentId: string | undefined, upload: THostedUploadResponseDto) =>
		onChange({
			...latest.current,
			documents: latest.current.documents.map((document) =>
				document.id === documentId
					? {
							...document,
							fileKey: upload.fileKey,
							fileName: upload.fileName,
							fileSize: upload.fileSize,
						}
					: document,
			),
		});

	// one real (hidden) file input in the DOM: detached inputs are unreliable on iOS Safari
	const replaceInput = useRef<HTMLInputElement>(null);
	const replaceTarget = useRef<string | null>(null);
	const [replacing, setReplacing] = useState<string | null>(null);
	const pickReplacement = (documentId: string | undefined) => {
		if (!documentId || !replaceInput.current) return;
		replaceTarget.current = documentId;
		replaceInput.current.value = '';
		replaceInput.current.click();
	};
	const onReplacementChosen = async (file: File | undefined) => {
		const documentId = replaceTarget.current;
		if (!file || !documentId) return;
		if (file.size > maxPdfBytes) {
			toast({
				variant: 'destructive',
				title: t('documents.tooLarge', { maxSize: Math.round(maxPdfBytes / MB) }),
			});
			return;
		}
		setReplacing(documentId);
		try {
			const result = await upload.mutateAsync({ file, kind: 'pdf' });
			replaceDocumentFile(documentId, result);
		} catch (error) {
			toast({
				variant: 'destructive',
				title: t('documents.replaceFailed'),
				description: (error as Error).message,
			});
		} finally {
			setReplacing(null);
		}
	};

	const updateDocument = (index: number, patch: Partial<THostedPdfDocument>) =>
		onChange({
			...value,
			documents: documents.map((document, i) =>
				i === index ? { ...document, ...patch } : document,
			),
		});

	const imageField = (key: 'coverKey' | 'logoKey', label: string, hint: string) => {
		const current = value[key];
		return (
			<div className="space-y-2">
				<Label>{label}</Label>
				<HostedFileDropzone
					kind="image"
					accept={IMAGE_ACCEPT}
					maxSize={maxImageBytes}
					hint={current || hasRoomForFile ? hint : t('documents.limitReached')}
					current={current ? { name: label, url: assetUrls[current] ?? null } : null}
					onUploaded={(upload) => {
						rememberHostedAsset(upload.fileKey, upload.url);
						onChange({ ...latest.current, [key]: upload.fileKey });
					}}
					onRemove={() => onChange({ ...value, [key]: undefined })}
					disabled={uploadsLocked || (!current && !hasRoomForFile)}
				/>
			</div>
		);
	};

	const textField = (
		key: keyof TextFields,
		label: string,
		placeholder: string,
		max: number,
		id: string,
	) => (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<InputGroup>
				<InputGroupInput
					id={id}
					value={fields[key]}
					maxLength={max}
					placeholder={placeholder}
					onChange={(e) => setField(key, e.target.value)}
					disabled={locked}
					className="pr-16"
				/>
				<InputGroupAddon align="inline-end">
					<CharacterCounter current={fields[key].length} max={max} />
				</InputGroupAddon>
			</InputGroup>
		</div>
	);

	return (
		<div className="space-y-8">
			{/* What a scan opens */}
			<section className="space-y-2">
				<Label>{t('openMode.label')}</Label>
				<div role="radiogroup" aria-label={t('openMode.label')} className="grid grid-cols-2 gap-2">
					{(['page', 'direct'] as const).map((mode) => {
						const active = (value.openMode ?? 'page') === mode;
						return (
							<button
								key={mode}
								type="button"
								role="radio"
								aria-checked={active}
								disabled={locked}
								onClick={() => {
									// a mode is not content: the sample stays and the preview follows the mode
									commit({ ...value, openMode: mode });
									setHostedPreviewView(mode === 'direct' ? 'qr' : 'page');
								}}
								className={cn(
									'cursor-pointer rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
									active
										? 'border-slate-900 bg-white shadow-sm'
										: 'border-border bg-white/60 hover:bg-white',
								)}
							>
								<span className="block font-medium">{t(`openMode.${mode}.title`)}</span>
								<span className="block text-xs text-muted-foreground">
									{t(`openMode.${mode}.description`)}
								</span>
							</button>
						);
					})}
				</div>
			</section>

			<p className="text-sm leading-relaxed text-muted-foreground">
				{t.rich(direct ? 'intro.direct' : 'intro.page', {
					strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
				})}{' '}
				{t('intro.pro')}
			</p>
			{planLocked ? (
				<HostedPageProGate />
			) : (
				<HostedPageUsage draft={draft} qrCodeId={qrCodeId ?? null} direct={direct} />
			)}

			{!direct && (
				<HostedPageTemplates
					type="pdf"
					activeId={
						hostedSampleTemplate
							? null
							: (hostedTemplate ??
								(isPdfContentUntouched(value) && !hostedAdopted ? 'blank' : activeTemplate))
					}
					disabled={uploadsLocked || adopting}
					onSelect={chooseTemplate}
					showBlank={!isExistingPage}
				/>
			)}

			{/* Documents */}
			<section className="space-y-3">
				<div className="flex items-baseline justify-between">
					<Label>{t('documents.title')}</Label>
					<span className="text-xs text-muted-foreground">
						{t('documents.count', { count: documents.length, max: HOSTED_PDF_MAX_DOCUMENTS })}
					</span>
				</div>
				<input
					ref={replaceInput}
					type="file"
					accept="application/pdf,.pdf"
					className="hidden"
					aria-hidden="true"
					tabIndex={-1}
					data-testid="pdf-replace-input"
					onChange={(e) => void onReplacementChosen(e.target.files?.[0])}
				/>
				{documents.map((document, index) => (
					<div
						key={document.id ?? document.fileKey}
						className="flex items-center gap-3 rounded-lg border bg-white p-3"
					>
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
							<DocumentTextIcon className="size-5 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1 space-y-1">
							<Input
								value={document.title ?? ''}
								maxLength={80}
								placeholder={
									sampleText('documents')?.split('|')[index]?.trim() ||
									t('documents.titlePlaceholder')
								}
								onChange={(e) => updateDocument(index, { title: e.target.value || undefined })}
								disabled={locked}
								className="h-8"
								aria-label={t('documents.titleLabel')}
							/>
							<p className="truncate text-xs text-muted-foreground">
								{replacing === document.id
									? t('documents.replacing')
									: `${document.fileName} · ${formatBytes(document.fileSize)}`}
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-8 shrink-0"
							onClick={() => pickReplacement(document.id)}
							disabled={uploadsLocked || replacing !== null || !document.id}
							aria-label={t('documents.replace')}
							title={t('documents.replace')}
						>
							<ArrowPathIcon
								className={cn('size-4', replacing === document.id && 'animate-spin')}
							/>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-8 shrink-0"
							onClick={() =>
								onChange({ ...value, documents: documents.filter((_, i) => i !== index) })
							}
							disabled={locked}
							aria-label={t('documents.remove')}
						>
							<TrashIcon className="size-4" />
						</Button>
					</div>
				))}
				{documents.length < HOSTED_PDF_MAX_DOCUMENTS && (
					<HostedFileDropzone
						kind="pdf"
						accept="application/pdf,.pdf"
						maxSize={maxPdfBytes}
						hint={
							hasRoomForFile
								? t('documents.hint', { maxSize: Math.round(maxPdfBytes / MB) })
								: t('documents.limitReached')
						}
						current={null}
						onUploaded={addDocument}
						onRemove={() => {}}
						disabled={uploadsLocked || !hasRoomForFile}
					/>
				)}
				{/* only saved files are kept: a draft's uploads are swept after a day */}
				{isExistingPage && (
					<p className="text-xs text-muted-foreground">{t('documents.retentionHint')}</p>
				)}
			</section>

			{/* Text */}
			<section className="space-y-5">
				{textField(
					'title',
					`${t('title.label')}*`,
					sampleText('title') ?? t('title.placeholder'),
					TITLE_MAX,
					'pdf-title',
				)}
				{!direct && (
					<>
						<div className="space-y-2">
							<Label htmlFor="pdf-description">{t('description.label')}</Label>
							<div className="relative">
								<Textarea
									id="pdf-description"
									value={fields.description}
									maxLength={DESCRIPTION_MAX}
									rows={3}
									placeholder={sampleText('description') ?? t('description.placeholder')}
									onChange={(e) => setField('description', e.target.value)}
									disabled={locked}
									className="resize-none pr-16"
								/>
								<div className="absolute right-3 bottom-2">
									<CharacterCounter current={fields.description.length} max={DESCRIPTION_MAX} />
								</div>
							</div>
						</div>
						{textField(
							'brandName',
							t('brandName.label'),
							sampleText('brandName') ?? t('brandName.placeholder'),
							BRAND_MAX,
							'pdf-brand',
						)}
						{showButtonLabel && (
							<div className="space-y-1.5">
								{textField(
									'buttonLabel',
									t('buttonLabel.label'),
									activeTemplate
										? tTemplates(`${activeTemplate}.buttonLabel`)
										: t('buttonLabel.placeholder'),
									BUTTON_MAX,
									'pdf-button',
								)}
								<p className="text-xs text-muted-foreground">{t('buttonLabel.hint')}</p>
							</div>
						)}
					</>
				)}
			</section>

			{!direct && (
				<>
					{/* Images */}
					<section className="grid gap-5 sm:grid-cols-2">
						{imageField(
							'coverKey',
							t('cover.label'),
							t('cover.hint', { maxSize: Math.round(maxImageBytes / MB) }),
						)}
						{imageField(
							'logoKey',
							t('logo.label'),
							t('logo.hint', { maxSize: Math.round(maxImageBytes / MB) }),
						)}
					</section>

					{/* Link button */}
					<section className="space-y-3">
						<div>
							<Label>{t('link.title')}</Label>
							<p className="mt-1 text-xs text-muted-foreground">{t('link.description')}</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
							<Input
								value={fields.linkLabel}
								maxLength={BUTTON_MAX}
								placeholder={
									activeTemplate
										? tTemplates(`${activeTemplate}.linkLabel`)
										: t('link.labelPlaceholder')
								}
								onChange={(e) => setField('linkLabel', e.target.value)}
								disabled={locked}
								aria-label={t('link.label')}
								aria-invalid={linkIssue === 'labelMissing'}
							/>
							<Input
								value={fields.linkUrl}
								maxLength={500}
								placeholder={t('link.urlPlaceholder')}
								onChange={(e) => setField('linkUrl', e.target.value)}
								onBlur={(e) => {
									const url = e.target.value.trim();
									if (url && !/^https?:\/\//i.test(url)) setField('linkUrl', `https://${url}`);
								}}
								disabled={locked}
								aria-label={t('link.url')}
								aria-invalid={linkIssue === 'urlMissing'}
							/>
						</div>
						{linkIssue && <p className="text-xs text-destructive">{t(`link.${linkIssue}`)}</p>}
					</section>

					<HostedPageDesignFields
						value={{ theme: value.theme, hideBranding: value.hideBranding }}
						onChange={(design) => onChange({ ...value, ...design })}
						disabled={uploadsLocked}
					/>
				</>
			)}
		</div>
	);
};

function arePdfPropsEqual(prev: PdfSectionProps, next: PdfSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const PdfSection = memo(PdfSectionBase, arePdfPropsEqual);
