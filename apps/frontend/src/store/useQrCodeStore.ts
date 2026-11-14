'use client';

import type { ApiError } from '@/lib/api/ApiError';
import {
	QrCodeOptionsSchema,
	QrCodeContent,
	isHostedPageType,
	type THostedPageTemplateId,
	type TQrCodeContent,
	type TQrCodeOptions,
	type TShortUrl,
} from '@shared/schemas';
import { createStore } from 'zustand/vanilla';
import { safeLocalStorage } from '@/lib/utils';
import { freshHostedDraft } from '@/lib/hosted-draft';
import type { HostedTemplateChoice } from '@/components/hosted-page/preview';

export type QrCodeGeneratorState = {
	id?: string;
	name?: string;
	config: TQrCodeOptions;
	content: TQrCodeContent;
	shortUrl?: TShortUrl;
	latestQrCode?: {
		name?: string | null;
		config: TQrCodeOptions;
		content: TQrCodeContent;
	};
	lastError?: ApiError;
	bulkMode: {
		isBulkMode: boolean;
		file?: File;
	};
	/** Public URLs of files uploaded in this session, by storage key, for the hosted page preview */
	hostedAssetUrls?: Record<string, string>;
	/** Template images uploaded in this session, by `<template>:<slot>`, so a template picked again reuses them */
	hostedTemplateUploads?: Record<string, { fileKey: string; uploadedAt: number }>;
	/** Which side of the output column is shown for hosted content */
	hostedPreviewView?: 'qr' | 'page';
	/** Template whose sample content fills the preview until the owner edits anything */
	hostedSampleTemplate?: THostedPageTemplateId | null;
	/** Template or blank sheet the owner picked in this session; unset for a loaded page */
	hostedTemplate?: HostedTemplateChoice | null;
	/** A template to adopt as soon as the editor is ready, e.g. from a landing page's "use template" */
	hostedTemplateRequest?: THostedPageTemplateId | null;
	/** What the last adopted template wrote, so the next template may replace exactly that */
	hostedAdopted?: Partial<
		Record<'title' | 'description' | 'brandName' | 'buttonLabel' | 'coverKey' | 'logoKey', string>
	> | null;
	/** Hosted-page uploads still running; saving waits for them, or their result would be lost */
	hostedUploadsPending?: number;
};

export type QrCodeGeneratorActions = {
	updateName: (name: string) => void;
	updateConfig: (config: Partial<TQrCodeOptions>) => void;
	updateContent: (content: TQrCodeContent) => void;
	updateLatestQrCode: (
		latestQrCode:
			| {
					name?: string | null;
					config: TQrCodeOptions;
					content: TQrCodeContent;
			  }
			| undefined,
	) => void;
	updateLastError: (lastError: ApiError) => void;
	updateBulkMode: (isBulkMode: boolean, file?: File) => void;
	rememberHostedAsset: (fileKey: string, url: string | null) => void;
	rememberTemplateUpload: (slotKey: string, fileKey: string) => void;
	setHostedPreviewView: (view: 'qr' | 'page') => void;
	setHostedSampleTemplate: (id: THostedPageTemplateId | null) => void;
	setHostedTemplate: (choice: HostedTemplateChoice | null) => void;
	setHostedTemplateRequest: (id: THostedPageTemplateId | null) => void;
	setHostedAdopted: (adopted: QrCodeGeneratorState['hostedAdopted']) => void;
	startHostedUpload: () => void;
	finishHostedUpload: () => void;
	resetStore: () => void;
};

export type QrCodeGeneratorStore = QrCodeGeneratorState & QrCodeGeneratorActions;

/**
 * QR config has nested option objects (e.g. dotsOptions, imageOptions).
 * A plain spread would replace the entire nested object, losing unset keys.
 * This merges one level deep so partial updates work correctly.
 */
const NESTED_CONFIG_KEYS = [
	'imageOptions',
	'dotsOptions',
	'backgroundOptions',
	'cornersSquareOptions',
	'cornersDotOptions',
] as const;

function deepMergeConfig(current: TQrCodeOptions, update: Partial<TQrCodeOptions>): TQrCodeOptions {
	const merged = { ...current, ...update };
	for (const key of NESTED_CONFIG_KEYS) {
		if (update[key] !== undefined) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- spread of dynamic nested config key requires assertion
			merged[key] = { ...current[key], ...update[key] } as any;
		}
	}
	return merged;
}

export const createQrCodeGeneratorStore = (initState: QrCodeGeneratorState) => {
	// Restore unsaved config/content from localStorage (saved before auth redirects).
	// Validated with Zod to discard corrupted or outdated data from previous versions.
	if (typeof window !== 'undefined') {
		const savedConfig = safeLocalStorage.getItem('unsavedQrConfig');
		if (savedConfig) {
			try {
				const parsed = JSON.parse(savedConfig);
				const result = QrCodeOptionsSchema.safeParse({ ...initState.config, ...parsed });
				if (result.success) {
					initState.config = result.data;
				}
				safeLocalStorage.removeItem('unsavedQrConfig');
			} catch {}
		}

		const savedContent = safeLocalStorage.getItem('unsavedQrContent');
		if (savedContent) {
			try {
				const parsed = JSON.parse(savedContent) as { type?: unknown };
				const result = QrCodeContent.safeParse(parsed);
				if (result.success) {
					initState.content = result.data;
				} else if (typeof parsed?.type === 'string' && isHostedPageType(parsed.type)) {
					// a hosted draft saved before login has no file yet and never validates; the
					// visitor comes back to a fresh page of the same type instead of the URL tab
					const draft = freshHostedDraft(parsed.type);
					initState.content = draft.content;
					initState.hostedSampleTemplate = draft.sampleTemplate;
					initState.hostedPreviewView = 'page';
				}
				safeLocalStorage.removeItem('unsavedQrContent');
			} catch {}
		}
	}

	return createStore<QrCodeGeneratorStore>()((set) => ({
		...initState,
		updateName: (name) => set({ name }),
		updateConfig: (config) => {
			set((state) => ({
				config: deepMergeConfig(state.config, config),
			}));
		},
		updateContent: (content) => set({ content }),
		updateLatestQrCode: (latestQrCode) => set({ latestQrCode }),
		updateLastError: (lastError) => set({ lastError }),
		updateBulkMode: (isBulkMode, file) =>
			set({
				bulkMode: {
					isBulkMode,
					file,
				},
			}),
		rememberHostedAsset: (fileKey, url) => {
			// only images have a public URL; documents are served through their page
			if (!url) return;
			set((state) => ({ hostedAssetUrls: { ...state.hostedAssetUrls, [fileKey]: url } }));
		},
		rememberTemplateUpload: (slotKey, fileKey) =>
			set((state) => ({
				hostedTemplateUploads: {
					...state.hostedTemplateUploads,
					[slotKey]: { fileKey, uploadedAt: Date.now() },
				},
			})),
		setHostedPreviewView: (hostedPreviewView) => set({ hostedPreviewView }),
		setHostedSampleTemplate: (hostedSampleTemplate) => set({ hostedSampleTemplate }),
		setHostedTemplate: (hostedTemplate) => set({ hostedTemplate }),
		setHostedTemplateRequest: (hostedTemplateRequest) => set({ hostedTemplateRequest }),
		setHostedAdopted: (hostedAdopted) => set({ hostedAdopted }),
		startHostedUpload: () =>
			set((state) => ({ hostedUploadsPending: (state.hostedUploadsPending ?? 0) + 1 })),
		finishHostedUpload: () =>
			set((state) => ({
				hostedUploadsPending: Math.max(0, (state.hostedUploadsPending ?? 0) - 1),
			})),
		// a saved page owns its template images now; the next page must upload its own. Uploads
		// still running finish later and count themselves off.
		resetStore: () =>
			set((state) => ({
				...initState,
				hostedTemplateUploads: undefined,
				hostedUploadsPending: state.hostedUploadsPending,
			})),
	}));
};
