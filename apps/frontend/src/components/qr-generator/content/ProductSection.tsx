'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import posthog from 'posthog-js';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowPathIcon, CubeIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
	HOSTED_DOCUMENT_CATEGORIES,
	HOSTED_DOCUMENT_LANGUAGES,
	HOSTED_PRODUCT_MAX_DOCUMENTS,
	getStylePresetTheme,
	getTemplateTheme,
	productPageType,
	type THostedDocumentCategory,
	type THostedDocumentLanguage,
	type THostedPageTemplateId,
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
import { resolveActiveTemplate, templateImageKey } from '@/components/hosted-page/preview';
import { isProductContentUntouched } from '@/components/hosted-page/page-types/product.preview';
import { HostedPagesOfflineNotice } from '@/components/hosted-page/HostedPagesOfflineNotice';
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
import { HostedPageTemplates, type HostedTemplateChoice } from './HostedPageTemplates';
import { EditorSection, EditorSections } from './EditorSections';

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

// where the validation reports each field
const FIELD_ISSUE: Record<keyof TextFields, string> = {
	title: 'title',
	model: 'model',
	articleNumber: 'articleNumber',
	gtin: 'gtin',
	description: 'description',
	brandName: 'brandName',
	manufacturerName: 'manufacturer.name',
	manufacturerAddress: 'manufacturer.address',
	manufacturerEmail: 'manufacturer.email',
	manufacturerWebsite: 'manufacturer.website',
	manufacturerPhone: 'manufacturer.phone',
	euName: 'euRepresentative.name',
	euAddress: 'euRepresentative.address',
	euEmail: 'euRepresentative.email',
	safetyNotice: 'safetyNotice',
	paperEmail: 'paperRequest.email',
	linkLabel: 'link.label',
	linkUrl: 'link.url',
};
// optional groups: once the owner starts one, what it still lacks shows at once
const STARTED_GROUPS = ['link', 'eu', 'paper'];

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
		hostedTemplate,
		setHostedTemplate,
		hostedAdopted,
		setHostedAdopted,
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
	// The sample only illustrates; the owner's first own change ends it. Without a chosen template
	// the owner works on the blank page from then on, so the picker and the preview agree.
	const onChange = (next: TProductInput) => {
		if (!mounted.current) return;
		if (hostedSampleTemplate) {
			setHostedSampleTemplate(null);
			if (!hostedTemplate) {
				setHostedTemplate('blank');
				if (next.theme === value.theme) next = { ...next, theme: getStylePresetTheme('technical') };
			}
		}
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
		// the owner picks the type; saving waits until every document has one
		const document = {
			id: crypto.randomUUID(),
			language,
			fileKey: uploaded.fileKey,
			fileName: uploaded.fileName,
			fileSize: uploaded.fileSize,
		} as THostedProductDocument;
		onChange({ ...latest.current, documents: [...current, document] });
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

	// Adopting a template copies its design, texts and images into the page. A field is written only
	// while it is empty or still holds what the previous template put there.
	const tTemplates = useTranslations('generator.contentSwitch.hosted.templates');
	const activeTemplate = resolveActiveTemplate(hostedTemplate, value.theme);
	const fromTemplate = (field: 'title' | 'description' | 'brandName' | 'coverKey' | 'logoKey') => {
		const current = value[field];
		return !current || current === hostedAdopted?.[field];
	};
	const adoptTemplate = (id: THostedPageTemplateId) => {
		const adopted: NonNullable<typeof hostedAdopted> = {};
		const next: TProductInput = { ...value, theme: getTemplateTheme(id) };
		for (const field of ['title', 'description', 'brandName'] as const) {
			if (fromTemplate(field)) {
				next[field] = tTemplates(`${id}.sample.${field}`);
				adopted[field] = next[field];
			}
		}
		for (const slot of ['coverKey', 'logoKey'] as const) {
			if (fromTemplate(slot)) {
				next[slot] = templateImageKey(id, slot);
				adopted[slot] = next[slot];
			}
		}
		setHostedSampleTemplate(null);
		setHostedAdopted(adopted);
		if (mounted.current) commitToStore(next);
	};
	const chooseTemplate = (choice: HostedTemplateChoice) => {
		posthog.capture('hosted-template:selected', { type: 'product', template: choice });
		setHostedTemplate(choice);
		if (choice !== 'blank') {
			adoptTemplate(choice);
			return;
		}
		// clears what a template wrote; whatever the owner typed or uploaded stays
		setHostedSampleTemplate(null);
		setHostedAdopted(null);
		if (!mounted.current) return;
		commitToStore({
			...value,
			theme: getStylePresetTheme('technical'),
			title: fromTemplate('title') ? '' : value.title,
			description: fromTemplate('description') ? undefined : value.description,
			brandName: fromTemplate('brandName') ? undefined : value.brandName,
			coverKey: fromTemplate('coverKey') ? undefined : value.coverKey,
			logoKey: fromTemplate('logoKey') ? undefined : value.logoKey,
		});
	};
	// a template requested from outside (a landing page's "use template") is picked like a click
	const { hostedTemplateRequest, setHostedTemplateRequest } = useQrCodeGeneratorStore(
		(state) => state,
	);
	useEffect(() => {
		if (!hostedTemplateRequest) return;
		setHostedTemplateRequest(null);
		chooseTemplate(hostedTemplateRequest);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hostedTemplateRequest]);

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
		posthog.capture('product-page:manufacturer-prefilled');
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

	// inside a step the step names the party already; the list below the steps needs it
	const issueLabel = (path: string, withParty = true): string => {
		const partyField = (party: string) => {
			const field = path.split('.')[1] as 'name' | 'address' | 'email' | 'website' | 'phone';
			// a missing digital contact is reported on the e-mail field
			const missingContact = path === 'manufacturer.email' && !fields.manufacturerEmail.trim();
			const label = missingContact ? t('issues.contact') : t(`party.${field}`);
			return withParty ? `${party}: ${label}` : label;
		};
		if (path === 'title') return t('name.label');
		if (path === 'model') return t('model.label');
		if (path === 'gtin') return t('gtin.label');
		if (path === 'articleNumber') return t('articleNumber.label');
		if (path === 'documents') return t('issues.documents');
		if (path === 'documents.category') return t('issues.category');
		if (path.startsWith('manufacturer.')) return partyField(t('manufacturer.title'));
		if (path.startsWith('euRepresentative.')) return partyField(t('euRepresentative.title'));
		if (path.startsWith('paperRequest')) return `${t('paperRequest.title')}: ${t('party.email')}`;
		if (path.startsWith('link')) return tPdf('link.title');
		return t('issues.other');
	};
	const openIssues = [...new Set(issues.map((path) => issueLabel(path)))];

	// a field turns red once the owner left it empty or wrong, a saved page shows everything
	const [touched, setTouched] = useState<ReadonlySet<keyof TextFields>>(() => new Set());
	const touch = (key: keyof TextFields) =>
		setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
	const contactMissing =
		issues.includes('manufacturer.email') &&
		!fields.manufacturerEmail.trim() &&
		!fields.manufacturerWebsite.trim();
	/** null: fine; '': red without a note; otherwise the note under the field */
	const fieldError = (key: keyof TextFields): string | null => {
		const contactField = key === 'manufacturerEmail' || key === 'manufacturerWebsite';
		const failing = contactField && contactMissing ? true : issues.includes(FIELD_ISSUE[key]);
		if (!failing) return null;
		const filled = fields[key].trim() !== '';
		const started = STARTED_GROUPS.some((group) => key.startsWith(group));
		// a value in the making is judged once the owner leaves the field
		if (filled ? !touched.has(key) : !isExistingPage && !started && !touched.has(key)) return null;
		if (contactField && contactMissing) {
			return key === 'manufacturerWebsite' ? t('issues.contactMissing') : '';
		}
		if (filled) return tPdf('fieldInvalid');
		if (key === 'linkUrl') return tPdf('link.urlMissing');
		if (key === 'linkLabel') return tPdf('link.labelMissing');
		return tPdf('fieldRequired');
	};
	const fieldProps = (key: keyof TextFields) => {
		const error = fieldError(key);
		return {
			onBlur: () => touch(key),
			'aria-invalid': error !== null || undefined,
			'aria-describedby': error ? `product-${key}-error` : undefined,
		};
	};
	const fieldNote = (key: keyof TextFields) => {
		const error = fieldError(key);
		return error ? (
			<p id={`product-${key}-error`} className="text-xs text-destructive">
				{error}
			</p>
		) : null;
	};
	const labelClass = (key: keyof TextFields) =>
		fieldError(key) !== null ? 'text-destructive' : undefined;

	const textField = (
		key: keyof TextFields,
		label: string,
		options: { placeholder?: string; max: number; type?: string; hint?: string } = { max: 120 },
	) => (
		<div className="space-y-2">
			<Label htmlFor={`product-${key}`} className={labelClass(key)}>
				{label}
			</Label>
			<Input
				id={`product-${key}`}
				type={options.type ?? 'text'}
				value={fields[key]}
				maxLength={options.max}
				placeholder={options.placeholder}
				onChange={(e) => setField(key, e.target.value)}
				disabled={locked}
				{...fieldProps(key)}
			/>
			{fieldNote(key)}
			{options.hint && <p className="text-xs text-muted-foreground">{options.hint}</p>}
		</div>
	);

	const textArea = (
		key: keyof TextFields,
		label: string,
		options: { placeholder?: string; max: number; rows: number; counter?: boolean },
	) => (
		<div className="space-y-2">
			<Label htmlFor={`product-${key}`} className={labelClass(key)}>
				{label}
			</Label>
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
					{...fieldProps(key)}
				/>
				{options.counter && (
					<div className="absolute right-3 bottom-2">
						<CharacterCounter current={fields[key].length} max={options.max} />
					</div>
				)}
			</div>
			{fieldNote(key)}
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

	// what each step still lacks, named the way the issue list names it
	const issuesOf = (...prefixes: string[]) => [
		...new Set(
			issues
				.filter((path) =>
					prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}.`)),
				)
				.map((path) => issueLabel(path, false)),
		),
	];
	const missingSummary = (missing: string[]) =>
		missing.length > 0 ? t('sections.missing', { fields: missing.join(', ') }) : undefined;
	const productMissing = issuesOf('title', 'model', 'articleNumber', 'gtin');
	const documentsMissing = issuesOf('documents');
	const manufacturerMissing = issuesOf('manufacturer', 'euRepresentative');
	const safetyMissing = issuesOf('paperRequest');
	const designMissing = issuesOf('link');
	const documentLanguages = new Set(documents.map((document) => document.language)).size;
	const [showEu, setShowEu] = useState(() => Boolean(value.euRepresentative));
	// a new page starts with its look, so a template can fill in the rest; a saved one opens where something is missing
	const [openSections, setOpenSections] = useState<string[]>(() => {
		if (!isExistingPage) return ['design'];
		const steps: [string, string[]][] = [
			['design', designMissing],
			['product', productMissing],
			['documents', documentsMissing],
			['manufacturer', manufacturerMissing],
			['safety', safetyMissing],
		];
		const first = steps.find(([, missing]) => missing.length > 0);
		return first ? [first[0]] : [];
	});

	// the template the picker shows as chosen; until one is, the look is not done
	const pickedTemplate = hostedSampleTemplate
		? null
		: (hostedTemplate ??
			(isProductContentUntouched(value) && !hostedAdopted ? 'blank' : activeTemplate));
	const designPicked = isExistingPage || pickedTemplate !== null;

	return (
		<div className="space-y-6">
			{!isExistingPage && (
				<div className="rounded-xl border bg-white/70 p-4">
					<div className="flex items-start gap-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
							<CubeIcon className="size-5" aria-hidden="true" />
						</span>
						<div className="min-w-0 space-y-1">
							<p className="font-semibold">{t('explainer.title')}</p>
							<p className="text-sm text-muted-foreground">
								{t('explainer.description')} {t('intro.pro')}
							</p>
						</div>
					</div>
				</div>
			)}
			{planLocked ? (
				<HostedPageProGate />
			) : (
				<HostedPageUsage draft={projected} qrCodeId={qrCodeId ?? null} direct={false} />
			)}
			<HostedPagesOfflineNotice scope="page" type="product" />

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

			<EditorSections type="product" value={openSections} onValueChange={setOpenSections}>
				<EditorSection
					value="design"
					step={1}
					title={t('sections.design')}
					summary={
						missingSummary(designMissing) ??
						(!designPicked
							? tPdf('sections.designPick')
							: pickedTemplate === 'blank'
								? tTemplates('blank.name')
								: activeTemplate
									? tTemplates(`${activeTemplate}.name`)
									: t('sections.designCustom'))
					}
					missing={designMissing.length > 0}
					complete={designMissing.length === 0 && designPicked}
				>
					<HostedPageTemplates
						type="product"
						activeId={pickedTemplate}
						disabled={uploadsLocked}
						onSelect={chooseTemplate}
						showBlank={!isExistingPage}
					/>
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
					</div>
					{textField('brandName', tPdf('brandName.label'), { max: 80 })}
					<div className="space-y-3">
						{sectionTitle(tPdf('link.title'), t('link.description'))}
						<div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
							<Input
								value={fields.linkLabel}
								maxLength={40}
								placeholder={t('link.labelPlaceholder')}
								onChange={(e) => setField('linkLabel', e.target.value)}
								disabled={locked}
								aria-label={tPdf('link.label')}
								{...fieldProps('linkLabel')}
							/>
							<Input
								value={fields.linkUrl}
								{...fieldProps('linkUrl')}
								maxLength={500}
								placeholder={tPdf('link.urlPlaceholder')}
								onChange={(e) => setField('linkUrl', e.target.value)}
								onBlur={(e) => {
									touch('linkUrl');
									const url = e.target.value.trim();
									if (url && !/^https?:\/\//i.test(url)) setField('linkUrl', `https://${url}`);
								}}
								disabled={locked}
								aria-label={tPdf('link.url')}
							/>
						</div>
						{fieldNote('linkLabel')}
						{fieldNote('linkUrl')}
					</div>
					<HostedPageDesignFields
						value={{ theme: value.theme, hideBranding: value.hideBranding }}
						onChange={(design) => onChange({ ...value, ...design })}
						disabled={uploadsLocked}
					/>
				</EditorSection>

				<EditorSection
					value="product"
					step={2}
					title={t('sections.product')}
					summary={
						missingSummary(productMissing) ?? [value.title, value.model].filter(Boolean).join(' · ')
					}
					missing={productMissing.length > 0}
					complete={productMissing.length === 0}
				>
					{textField('title', `${t('name.label')}*`, {
						placeholder: t('name.placeholder'),
						max: 120,
					})}
					{textField('model', `${t('model.label')}*`, {
						placeholder: t('model.placeholder'),
						max: 120,
						hint: t('model.hint'),
					})}
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
						{textField('articleNumber', t('articleNumber.label'), { max: 60 })}
						{textField('gtin', t('gtin.label'), { max: 14 })}
					</div>
					{textArea('description', tPdf('description.label'), {
						placeholder: tPdf('description.placeholder'),
						max: DESCRIPTION_MAX,
						rows: 3,
						counter: true,
					})}
				</EditorSection>

				<EditorSection
					value="documents"
					step={3}
					title={tPdf('documents.title')}
					summary={
						missingSummary(documentsMissing) ??
						t('sections.documentsSummary', {
							count: documents.length,
							languages: documentLanguages,
							archived: archive.length,
						})
					}
					missing={documentsMissing.length > 0}
					complete={documentsMissing.length === 0}
				>
					<div className="flex justify-end">
						<span className="text-xs text-muted-foreground">
							{tPdf('documents.count', {
								count: documents.length,
								max: HOSTED_PRODUCT_MAX_DOCUMENTS,
							})}
						</span>
					</div>
					{documents.map((document) => {
						const since = formatDate(document.validFrom);
						return (
							<div
								key={document.id ?? document.fileKey}
								className="space-y-2 rounded-lg border bg-white p-3"
							>
								<div className="flex items-center gap-2">
									<Select
										value={document.category ?? ''}
										onValueChange={(category) =>
											updateDocument(document.id, { category: category as THostedDocumentCategory })
										}
										disabled={locked}
									>
										<SelectTrigger
											className={cn(
												'h-8 min-w-0 flex-1',
												!document.category && 'border-amber-500 text-muted-foreground',
											)}
											aria-label={t('documents.category')}
											aria-invalid={!document.category}
										>
											<SelectValue placeholder={t('documents.categoryPlaceholder')} />
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
										<SelectTrigger
											className="h-8 w-36 shrink-0"
											aria-label={t('documents.language')}
										>
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
										disabled={
											uploadsLocked || replacing !== null || !document.id || !hasRoomForFile
										}
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
					{(archive.length > 0 || removedArchiveIds.size > 0) && (
						<section className="space-y-3 border-t pt-5">
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
				</EditorSection>

				<EditorSection
					value="manufacturer"
					step={4}
					title={t('manufacturer.title')}
					summary={missingSummary(manufacturerMissing) ?? value.manufacturer.name}
					missing={manufacturerMissing.length > 0}
					complete={manufacturerMissing.length === 0}
				>
					<p className="text-xs text-muted-foreground">{t('manufacturer.description')}</p>
					{lastData && manufacturerEmpty && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-auto max-w-full self-start py-1.5 text-left whitespace-normal"
							onClick={adoptManufacturer}
						>
							{t('manufacturer.prefill')}
						</Button>
					)}
					{textField('manufacturerName', `${t('party.name')}*`, { max: 120 })}
					{textArea('manufacturerAddress', `${t('party.address')}*`, {
						placeholder: t('party.addressPlaceholder'),
						max: 300,
						rows: 3,
					})}
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
						{textField('manufacturerEmail', t('party.email'), { max: 255, type: 'email' })}
						{textField('manufacturerPhone', t('party.phone'), { max: 40, type: 'tel' })}
					</div>
					{textField('manufacturerWebsite', t('party.website'), {
						max: 500,
						placeholder: tPdf('link.urlPlaceholder'),
					})}
					<div className="space-y-4 border-t pt-4">
						{showEu ? (
							<>
								{sectionTitle(t('euRepresentative.title'), t('euRepresentative.description'))}
								{textField('euName', t('party.name'), { max: 120 })}
								{textArea('euAddress', t('party.address'), {
									placeholder: t('party.addressPlaceholder'),
									max: 300,
									rows: 2,
								})}
								{textField('euEmail', t('party.email'), { max: 255, type: 'email' })}
							</>
						) : (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowEu(true)}
								disabled={locked}
							>
								{t('euRepresentative.add')}
							</Button>
						)}
					</div>
				</EditorSection>

				<EditorSection
					value="safety"
					step={5}
					title={t('sections.safety')}
					summary={
						missingSummary(safetyMissing) ??
						[
							t(value.safetyNotice ? 'sections.safetySet' : 'sections.safetyNone'),
							t(value.paperRequest?.enabled ? 'sections.paperOn' : 'sections.paperOff'),
						].join(' · ')
					}
					missing={safetyMissing.length > 0}
					complete={safetyMissing.length === 0}
				>
					{textArea('safetyNotice', t('safety.title'), {
						placeholder: t('safety.placeholder'),
						max: SAFETY_MAX,
						rows: 4,
						counter: true,
					})}
					<p className="text-xs text-muted-foreground">{t('safety.hint')}</p>
					<div className="space-y-3 border-t pt-5">
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
					</div>
				</EditorSection>
			</EditorSections>

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
