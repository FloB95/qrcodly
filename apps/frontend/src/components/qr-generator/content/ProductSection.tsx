'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowPathIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
	HOSTED_DOCUMENT_CATEGORIES,
	HOSTED_DOCUMENT_LANGUAGES,
	HOSTED_PRODUCT_MAX_DOCUMENTS,
	productPageType,
	type THostedDocumentCategory,
	type THostedDocumentLanguage,
	type THostedProductDocument,
	type THostedUploadResponseDto,
	type TProductInput,
	type TQrCodeContent,
} from '@shared/schemas';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useHostedAssetUrls } from '@/hooks/useHostedPagePreview';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import {
	HOSTED_PAGE_LIMITS,
	useHostedPageUsageQuery,
	useUploadHostedFileMutation,
} from '@/lib/api/hosted-page';
import { useListQrCodesQuery } from '@/lib/api/qr-code';
import { productPageIssues } from '@/lib/product-page';
import { formatBytes } from '@/components/hosted-page/format';
import { CharacterCounter } from './CharacterCounter';
import { HostedFileDropzone } from './HostedFileDropzone';
import { HostedPageDesignFields } from './HostedPageDesignFields';
import { HostedPageProGate } from './HostedPageProGate';
import { HostedPageUsage, useHostedPlanRoom } from './HostedPageUsage';

type ProductSectionProps = {
	value: TProductInput;
	onChange: (data: TProductInput) => void;
};

const DESCRIPTION_MAX = 500;
const SAFETY_MAX = 2000;
const MB = 1024 * 1024;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
const PDF_ACCEPT = 'application/pdf,.pdf';

/** Text fields that are debounced before they reach the store (and with it the preview). */
type TextFields = {
	title: string;
	model: string;
	articleNumber: string;
	gtin: string;
	description: string;
	brandName: string;
	manufacturerName: string;
	manufacturerAddress: string;
	manufacturerEmail: string;
	manufacturerWebsite: string;
	manufacturerPhone: string;
	euName: string;
	euAddress: string;
	euEmail: string;
	safetyNotice: string;
	paperEmail: string;
	linkLabel: string;
	linkUrl: string;
};

const toTextFields = (value: TProductInput): TextFields => ({
	title: value.title,
	model: value.model,
	articleNumber: value.articleNumber ?? '',
	gtin: value.gtin ?? '',
	description: value.description ?? '',
	brandName: value.brandName ?? '',
	manufacturerName: value.manufacturer.name,
	manufacturerAddress: value.manufacturer.address,
	manufacturerEmail: value.manufacturer.email ?? '',
	manufacturerWebsite: value.manufacturer.website ?? '',
	manufacturerPhone: value.manufacturer.phone ?? '',
	euName: value.euRepresentative?.name ?? '',
	euAddress: value.euRepresentative?.address ?? '',
	euEmail: value.euRepresentative?.email ?? '',
	safetyNotice: value.safetyNotice ?? '',
	paperEmail: value.paperRequest?.email ?? '',
	linkLabel: value.link?.label ?? '',
	linkUrl: value.link?.url ?? '',
});

const trimmed = (fields: TextFields): TextFields =>
	Object.fromEntries(Object.entries(fields).map(([key, text]) => [key, text.trim()])) as TextFields;

// compared trimmed, so the trimming of a commit never eats a space that is being typed
const sameFields = (a: TextFields, b: TextFields) =>
	JSON.stringify(trimmed(a)) === JSON.stringify(trimmed(b));

/** The page with the text fields written in: trimmed, and empty optional ones left out. */
function withFields(value: TProductInput, raw: TextFields): TProductInput {
	const fields = trimmed(raw);
	const paperEnabled = value.paperRequest?.enabled ?? false;
	return {
		...value,
		title: fields.title,
		model: fields.model,
		articleNumber: fields.articleNumber || undefined,
		gtin: fields.gtin || undefined,
		description: fields.description || undefined,
		brandName: fields.brandName || undefined,
		manufacturer: {
			name: fields.manufacturerName,
			address: fields.manufacturerAddress,
			email: fields.manufacturerEmail || undefined,
			website: fields.manufacturerWebsite || undefined,
			phone: fields.manufacturerPhone || undefined,
		},
		euRepresentative:
			fields.euName || fields.euAddress || fields.euEmail
				? {
						...value.euRepresentative,
						name: fields.euName,
						address: fields.euAddress,
						email: fields.euEmail || undefined,
					}
				: undefined,
		safetyNotice: fields.safetyNotice || undefined,
		paperRequest:
			paperEnabled || fields.paperEmail
				? { enabled: paperEnabled, email: fields.paperEmail || undefined }
				: undefined,
		// half a button stays in the content, so saving waits until both fields are filled
		link:
			fields.linkLabel || fields.linkUrl
				? { label: fields.linkLabel, url: fields.linkUrl }
				: undefined,
	};
}

const ProductSectionBase = ({ value, onChange: commitToStore }: ProductSectionProps) => {
	const t = useTranslations('generator.contentSwitch.product');
	const tPdf = useTranslations('generator.contentSwitch.pdf');
	const tPage = useTranslations('hostedPage.product');
	const locale = useLocale();
	const { isSignedIn } = useAuth();
	const { hasProPlan, isLoading } = useHasProPlan();
	const {
		id: qrCodeId,
		latestQrCode,
		rememberHostedAsset,
		hostedSampleTemplate,
		setHostedSampleTemplate,
		startHostedUpload,
		finishHostedUpload,
	} = useQrCodeGeneratorStore((state) => state);
	const assetUrls = useHostedAssetUrls();
	const upload = useUploadHostedFileMutation();

	const latest = useRef(value);
	latest.current = value;
	// uploads finish after the owner may have switched to another content type
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	// the owner's first own change replaces the template sample in the preview
	const onChange = (next: TProductInput) => {
		if (!mounted.current) return;
		if (hostedSampleTemplate) setHostedSampleTemplate(null);
		commitToStore(next);
	};

	const [fields, setFields] = useState<TextFields>(() => toTextFields(value));
	const [debounced] = useDebouncedValue(fields, 400);
	const setField = (key: keyof TextFields, next: string) =>
		setFields((current) => ({ ...current, [key]: next }));

	useEffect(() => {
		if (sameFields(debounced, toTextFields(value))) return;
		onChange(withFields(value, debounced));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	// sync when the store resets or loads a saved code
	const storedFields = JSON.stringify(toTextFields(value));
	useEffect(() => {
		const incoming = JSON.parse(storedFields) as TextFields;
		setFields((current) => (sameFields(current, incoming) ? current : incoming));
	}, [storedFields]);

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

	// What the server will store: a replaced or removed file of the saved page joins the archive,
	// versions marked for deletion leave it. The plan counts exactly that.
	const saved = latestQrCode?.content.type === 'product' ? latestQrCode.content.data : null;
	const projected = useMemo(
		() =>
			({
				type: 'product',
				data: productPageType.carryOver(isExistingPage ? saved : null, value, {
					now: new Date(),
					newId: () => 'pending',
				}),
			}) as TQrCodeContent,
		[isExistingPage, saved, value],
	);
	const { hasRoomForFile } = useHostedPlanRoom(projected, qrCodeId ?? null);

	const documents = value.documents;
	const removedArchiveIds = new Set(value.removeArchiveIds);
	const archive = (value.archive ?? []).filter((entry) => !removedArchiveIds.has(entry.id));
	const issues = productPageIssues(value);

	const languageNames = useMemo(() => {
		const names = new Intl.DisplayNames([locale], { type: 'language' });
		return HOSTED_DOCUMENT_LANGUAGES.map((code) => ({ code, name: names.of(code) ?? code })).sort(
			(a, b) => a.name.localeCompare(b.name, locale),
		);
	}, [locale]);
	const languageName = (code: string) =>
		languageNames.find((language) => language.code === code)?.name ?? code;
	const dateFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
		[locale],
	);
	const formatDate = (iso: string | undefined) => (iso ? dateFormat.format(new Date(iso)) : null);

	// A new document continues in the language of the last one and takes the first category that
	// language does not have yet.
	const addDocument = (uploaded: THostedUploadResponseDto) => {
		const current = latest.current.documents;
		const language: THostedDocumentLanguage =
			current.at(-1)?.language ?? HOSTED_DOCUMENT_LANGUAGES.find((code) => code === locale) ?? 'en';
		const taken = new Set(
			current.filter((document) => document.language === language).map((d) => d.category),
		);
		const category: THostedDocumentCategory =
			HOSTED_DOCUMENT_CATEGORIES.find((candidate) => !taken.has(candidate)) ?? 'other';
		onChange({
			...latest.current,
			documents: [
				...current,
				{
					id: crypto.randomUUID(),
					category,
					language,
					fileKey: uploaded.fileKey,
					fileName: uploaded.fileName,
					fileSize: uploaded.fileSize,
				},
			],
		});
	};

	const updateDocument = (id: string | undefined, patch: Partial<THostedProductDocument>) =>
		onChange({
			...latest.current,
			documents: latest.current.documents.map((document) =>
				document.id === id ? { ...document, ...patch } : document,
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
				title: tPdf('documents.tooLarge', { maxSize: Math.round(maxPdfBytes / MB) }),
			});
			return;
		}
		setReplacing(documentId);
		startHostedUpload();
		try {
			const result = await upload.mutateAsync({ file, kind: 'pdf' });
			updateDocument(documentId, {
				fileKey: result.fileKey,
				fileName: result.fileName,
				fileSize: result.fileSize,
				validFrom: undefined,
			});
		} catch (error) {
			toast({
				variant: 'destructive',
				title: tPdf('documents.replaceFailed'),
				description: (error as Error).message,
			});
		} finally {
			setReplacing(null);
			finishHostedUpload();
		}
	};

	// the manufacturer rarely changes between products: offer what the newest product page says
	const manufacturerEmpty = !fields.manufacturerName.trim() && !fields.manufacturerAddress.trim();
	const { data: productPages } = useListQrCodesQuery(
		1,
		1,
		{ contentType: ['product'] },
		isSignedIn === true && !isExistingPage,
	);
	const lastProduct = productPages?.data[0]?.content;
	const lastData = lastProduct?.type === 'product' ? lastProduct.data : null;
	const adoptManufacturer = () => {
		if (!lastData) return;
		setFields((current) => ({
			...current,
			manufacturerName: lastData.manufacturer.name,
			manufacturerAddress: lastData.manufacturer.address,
			manufacturerEmail: lastData.manufacturer.email ?? '',
			manufacturerWebsite: lastData.manufacturer.website ?? '',
			manufacturerPhone: lastData.manufacturer.phone ?? '',
			euName: lastData.euRepresentative?.name ?? '',
			euAddress: lastData.euRepresentative?.address ?? '',
			euEmail: lastData.euRepresentative?.email ?? '',
		}));
	};

	const issueLabel = (path: string): string => {
		const partyField = (party: string) => {
			const field = path.split('.')[1] as 'name' | 'address' | 'email' | 'website' | 'phone';
			// a missing digital contact is reported on the e-mail field
			const missingContact = path === 'manufacturer.email' && !fields.manufacturerEmail.trim();
			return `${party}: ${missingContact ? t('issues.contact') : t(`party.${field}`)}`;
		};
		if (path === 'title') return t('name.label');
		if (path === 'model') return t('model.label');
		if (path === 'gtin') return t('gtin.label');
		if (path === 'articleNumber') return t('articleNumber.label');
		if (path === 'documents') return t('issues.documents');
		if (path.startsWith('manufacturer.')) return partyField(t('manufacturer.title'));
		if (path.startsWith('euRepresentative.')) return partyField(t('euRepresentative.title'));
		if (path.startsWith('paperRequest')) return `${t('paperRequest.title')}: ${t('party.email')}`;
		if (path.startsWith('link')) return tPdf('link.title');
		return t('issues.other');
	};
	const openIssues = [...new Set(issues.map(issueLabel))];

	const textField = (
		key: keyof TextFields,
		label: string,
		options: { placeholder?: string; max: number; type?: string; hint?: string } = { max: 120 },
	) => (
		<div className="space-y-2">
			<Label htmlFor={`product-${key}`}>{label}</Label>
			<Input
				id={`product-${key}`}
				type={options.type ?? 'text'}
				value={fields[key]}
				maxLength={options.max}
				placeholder={options.placeholder}
				onChange={(e) => setField(key, e.target.value)}
				disabled={locked}
			/>
			{options.hint && <p className="text-xs text-muted-foreground">{options.hint}</p>}
		</div>
	);

	const textArea = (
		key: keyof TextFields,
		label: string,
		options: { placeholder?: string; max: number; rows: number; counter?: boolean },
	) => (
		<div className="space-y-2">
			<Label htmlFor={`product-${key}`}>{label}</Label>
			<div className="relative">
				<Textarea
					id={`product-${key}`}
					value={fields[key]}
					maxLength={options.max}
					rows={options.rows}
					placeholder={options.placeholder}
					onChange={(e) => setField(key, e.target.value)}
					disabled={locked}
					className={cn('resize-none', options.counter && 'pr-16')}
				/>
				{options.counter && (
					<div className="absolute right-3 bottom-2">
						<CharacterCounter current={fields[key].length} max={options.max} />
					</div>
				)}
			</div>
		</div>
	);

	const imageField = (key: 'coverKey' | 'logoKey', label: string, hint: string) => {
		const current = value[key];
		return (
			<div className="space-y-2">
				<Label>{label}</Label>
				<HostedFileDropzone
					kind="image"
					accept={IMAGE_ACCEPT}
					maxSize={maxImageBytes}
					hint={current || hasRoomForFile ? hint : tPdf('documents.limitReached')}
					current={current ? { name: label, url: assetUrls[current] ?? null } : null}
					onUploaded={(uploaded) => {
						rememberHostedAsset(uploaded.fileKey, uploaded.url);
						onChange({ ...latest.current, [key]: uploaded.fileKey });
					}}
					onRemove={() => onChange({ ...value, [key]: undefined })}
					disabled={uploadsLocked || (!current && !hasRoomForFile)}
				/>
			</div>
		);
	};

	const sectionTitle = (title: string, description?: string) => (
		<div>
			<Label>{title}</Label>
			{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
		</div>
	);

	return (
		<div className="space-y-8">
			<p className="text-sm leading-relaxed text-muted-foreground">
				{t.rich('intro.page', {
					strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
				})}{' '}
				{t('intro.pro')}
			</p>
			{planLocked ? (
				<HostedPageProGate />
			) : (
				<HostedPageUsage draft={projected} qrCodeId={qrCodeId ?? null} direct={false} />
			)}

			{/* Product */}
			<section className="space-y-5">
				{textField('title', `${t('name.label')}*`, {
					placeholder: t('name.placeholder'),
					max: 120,
				})}
				{textField('model', `${t('model.label')}*`, {
					placeholder: t('model.placeholder'),
					max: 120,
					hint: t('model.hint'),
				})}
				<div className="grid gap-5 sm:grid-cols-2">
					{textField('articleNumber', t('articleNumber.label'), { max: 60 })}
					{textField('gtin', t('gtin.label'), { max: 14 })}
				</div>
				{textArea('description', tPdf('description.label'), {
					placeholder: tPdf('description.placeholder'),
					max: DESCRIPTION_MAX,
					rows: 3,
					counter: true,
				})}
			</section>

			{/* Documents */}
			<section className="space-y-3">
				<div className="flex items-baseline justify-between">
					<Label>{tPdf('documents.title')}</Label>
					<span className="text-xs text-muted-foreground">
						{tPdf('documents.count', {
							count: documents.length,
							max: HOSTED_PRODUCT_MAX_DOCUMENTS,
						})}
					</span>
				</div>
				<input
					ref={replaceInput}
					type="file"
					accept={PDF_ACCEPT}
					className="hidden"
					aria-hidden="true"
					tabIndex={-1}
					data-testid="product-replace-input"
					onChange={(e) => void onReplacementChosen(e.target.files?.[0])}
				/>
				{documents.map((document) => {
					const since = formatDate(document.validFrom);
					return (
						<div
							key={document.id ?? document.fileKey}
							className="space-y-2 rounded-lg border bg-white p-3"
						>
							<div className="flex items-center gap-2">
								<Select
									value={document.category}
									onValueChange={(category) =>
										updateDocument(document.id, { category: category as THostedDocumentCategory })
									}
									disabled={locked}
								>
									<SelectTrigger
										className="h-8 min-w-0 flex-1"
										aria-label={t('documents.category')}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{HOSTED_DOCUMENT_CATEGORIES.map((category) => (
											<SelectItem key={category} value={category}>
												{t(`documents.categories.${category}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={document.language}
									onValueChange={(language) =>
										updateDocument(document.id, { language: language as THostedDocumentLanguage })
									}
									disabled={locked}
								>
									<SelectTrigger className="h-8 w-36 shrink-0" aria-label={t('documents.language')}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{languageNames.map(({ code, name }) => (
											<SelectItem key={code} value={code}>
												{name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 shrink-0"
									onClick={() => pickReplacement(document.id)}
									disabled={uploadsLocked || replacing !== null || !document.id || !hasRoomForFile}
									aria-label={tPdf('documents.replace')}
									title={tPdf('documents.replace')}
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
										onChange({
											...value,
											documents: documents.filter((other) => other !== document),
										})
									}
									disabled={locked}
									aria-label={tPdf('documents.remove')}
								>
									<TrashIcon className="size-4" />
								</Button>
							</div>
							<div className="grid gap-2 sm:grid-cols-[3fr_2fr]">
								<Input
									value={document.title ?? ''}
									maxLength={80}
									placeholder={t('documents.titlePlaceholder')}
									onChange={(e) =>
										updateDocument(document.id, { title: e.target.value || undefined })
									}
									disabled={locked}
									className="h-8"
									aria-label={tPdf('documents.titleLabel')}
								/>
								<Input
									value={document.version ?? ''}
									maxLength={40}
									placeholder={t('documents.versionPlaceholder')}
									onChange={(e) =>
										updateDocument(document.id, { version: e.target.value || undefined })
									}
									disabled={locked}
									className="h-8"
									aria-label={t('documents.version')}
								/>
							</div>
							<p className="truncate text-xs text-muted-foreground">
								{replacing === document.id
									? tPdf('documents.replacing')
									: [
											document.fileName,
											formatBytes(document.fileSize),
											since && tPage('since', { date: since }),
										]
											.filter(Boolean)
											.join(' · ')}
							</p>
						</div>
					);
				})}
				{documents.length < HOSTED_PRODUCT_MAX_DOCUMENTS && (
					<HostedFileDropzone
						kind="pdf"
						accept={PDF_ACCEPT}
						maxSize={maxPdfBytes}
						hint={
							hasRoomForFile
								? tPdf('documents.hint', { maxSize: Math.round(maxPdfBytes / MB) })
								: tPdf('documents.limitReached')
						}
						current={null}
						onUploaded={addDocument}
						onRemove={() => {}}
						disabled={uploadsLocked || !hasRoomForFile}
					/>
				)}
				<p className="text-xs text-muted-foreground">
					{!hasRoomForFile && archive.length > 0
						? t('documents.limitHint')
						: t('documents.archiveHint')}
				</p>
				{documents.some((document) => document.category === 'declaration') && (
					<p className="text-xs text-muted-foreground">{t('documents.declarationHint')}</p>
				)}
			</section>

			{/* Earlier versions */}
			{(archive.length > 0 || removedArchiveIds.size > 0) && (
				<section className="space-y-3">
					{sectionTitle(t('archive.title'), t('archive.description'))}
					{archive.length > 0 && (
						<ul className="divide-y rounded-lg border bg-white">
							{archive.map((entry) => (
								<li key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
									<DocumentTextIcon className="size-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{entry.title || t(`documents.categories.${entry.category}`)} ·{' '}
											{languageName(entry.language)}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{[
												entry.version,
												tPage('period', {
													from: formatDate(entry.validFrom) ?? '…',
													until: formatDate(entry.validUntil) ?? '…',
												}),
												formatBytes(entry.fileSize),
											]
												.filter(Boolean)
												.join(' · ')}
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-8 shrink-0"
										onClick={() =>
											onChange({
												...value,
												removeArchiveIds: [...(value.removeArchiveIds ?? []), entry.id],
											})
										}
										disabled={locked}
										aria-label={t('archive.remove')}
										title={t('archive.remove')}
									>
										<TrashIcon className="size-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
					{removedArchiveIds.size > 0 && (
						<p className="text-xs text-muted-foreground">
							{t('archive.pendingRemoval', { count: removedArchiveIds.size })}{' '}
							<button
								type="button"
								className="cursor-pointer font-medium text-foreground underline underline-offset-2"
								onClick={() => onChange({ ...value, removeArchiveIds: undefined })}
							>
								{t('archive.undo')}
							</button>
						</p>
					)}
				</section>
			)}

			{/* Manufacturer */}
			<section className="space-y-4">
				{sectionTitle(t('manufacturer.title'), t('manufacturer.description'))}
				{lastData && manufacturerEmpty && (
					<Button type="button" variant="outline" size="sm" onClick={adoptManufacturer}>
						{t('manufacturer.prefill')}
					</Button>
				)}
				{textField('manufacturerName', `${t('party.name')}*`, { max: 120 })}
				{textArea('manufacturerAddress', `${t('party.address')}*`, {
					placeholder: t('party.addressPlaceholder'),
					max: 300,
					rows: 3,
				})}
				<div className="grid gap-5 sm:grid-cols-2">
					{textField('manufacturerEmail', t('party.email'), { max: 255, type: 'email' })}
					{textField('manufacturerPhone', t('party.phone'), { max: 40, type: 'tel' })}
				</div>
				{textField('manufacturerWebsite', t('party.website'), {
					max: 500,
					placeholder: tPdf('link.urlPlaceholder'),
				})}
			</section>

			{/* EU representative */}
			<section className="space-y-4">
				{sectionTitle(t('euRepresentative.title'), t('euRepresentative.description'))}
				{textField('euName', t('party.name'), { max: 120 })}
				{textArea('euAddress', t('party.address'), {
					placeholder: t('party.addressPlaceholder'),
					max: 300,
					rows: 2,
				})}
				{textField('euEmail', t('party.email'), { max: 255, type: 'email' })}
			</section>

			{/* Safety information */}
			<section className="space-y-2">
				{textArea('safetyNotice', t('safety.title'), {
					placeholder: t('safety.placeholder'),
					max: SAFETY_MAX,
					rows: 4,
					counter: true,
				})}
				<p className="text-xs text-muted-foreground">{t('safety.hint')}</p>
			</section>

			{/* Paper copy on request */}
			<section className="space-y-3">
				<div className="flex items-start justify-between gap-4">
					{sectionTitle(t('paperRequest.title'), t('paperRequest.description'))}
					<Switch
						checked={value.paperRequest?.enabled ?? false}
						onCheckedChange={(enabled) =>
							onChange({
								...value,
								paperRequest:
									enabled || fields.paperEmail.trim()
										? { enabled, email: fields.paperEmail.trim() || undefined }
										: undefined,
							})
						}
						disabled={locked}
						aria-label={t('paperRequest.title')}
					/>
				</div>
				{value.paperRequest?.enabled &&
					textField('paperEmail', `${t('paperRequest.email')}*`, { max: 255, type: 'email' })}
			</section>

			{/* Images */}
			<section className="grid gap-5 sm:grid-cols-2">
				{imageField(
					'coverKey',
					t('cover.label'),
					tPdf('cover.hint', { maxSize: Math.round(maxImageBytes / MB) }),
				)}
				{imageField(
					'logoKey',
					tPdf('logo.label'),
					tPdf('logo.hint', { maxSize: Math.round(maxImageBytes / MB) }),
				)}
			</section>
			{textField('brandName', tPdf('brandName.label'), { max: 80 })}

			{/* Link button */}
			<section className="space-y-3">
				{sectionTitle(tPdf('link.title'), t('link.description'))}
				<div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
					<Input
						value={fields.linkLabel}
						maxLength={40}
						placeholder={t('link.labelPlaceholder')}
						onChange={(e) => setField('linkLabel', e.target.value)}
						disabled={locked}
						aria-label={tPdf('link.label')}
					/>
					<Input
						value={fields.linkUrl}
						maxLength={500}
						placeholder={tPdf('link.urlPlaceholder')}
						onChange={(e) => setField('linkUrl', e.target.value)}
						onBlur={(e) => {
							const url = e.target.value.trim();
							if (url && !/^https?:\/\//i.test(url)) setField('linkUrl', `https://${url}`);
						}}
						disabled={locked}
						aria-label={tPdf('link.url')}
					/>
				</div>
			</section>

			<HostedPageDesignFields
				value={{ theme: value.theme, hideBranding: value.hideBranding }}
				onChange={(design) => onChange({ ...value, ...design })}
				disabled={uploadsLocked}
			/>

			{openIssues.length > 0 && !locked && (
				<div className="rounded-lg border bg-white p-4 text-sm" role="status">
					<p className="font-medium">{t('issues.title')}</p>
					<ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
						{openIssues.map((issue) => (
							<li key={issue}>{issue}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

function areProductPropsEqual(prev: ProductSectionProps, next: ProductSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const ProductSection = memo(ProductSectionBase, areProductPropsEqual);
