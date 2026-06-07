'use client';

import type { ApiError } from '@/lib/api/ApiError';
import {
	QrCodeOptionsSchema,
	QrCodeContent,
	type TQrCodeContent,
	type TQrCodeOptions,
	type TShortUrl,
} from '@shared/schemas';
import { createStore } from 'zustand/vanilla';
import { safeLocalStorage } from '@/lib/utils';

export type QrCodeGeneratorState = {
	id?: string;
	name?: string;
	config: TQrCodeOptions;
	content: TQrCodeContent;
	shortUrl?: TShortUrl;
	// Pro-only overrides for the linked short URL of a dynamic QR. Wired
	// through to the backend at create time; not persisted on their own.
	// `customDomainId`: undefined = backend picks the user's default; null =
	// explicitly the system domain (qrcodly.de); string = a specific custom
	// domain owned by the user. `customSlug`: undefined/empty = no slug.
	customDomainId?: string | null;
	customSlug?: string;
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
};

export type QrCodeGeneratorActions = {
	updateName: (name: string) => void;
	updateConfig: (config: Partial<TQrCodeOptions>) => void;
	updateContent: (content: TQrCodeContent) => void;
	updateCustomSlug: (customSlug: string | undefined) => void;
	updateCustomDomainId: (customDomainId: string | null | undefined) => void;
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
				const parsed = JSON.parse(savedContent);
				const result = QrCodeContent.safeParse(parsed);
				if (result.success) {
					initState.content = result.data;
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
		updateCustomSlug: (customSlug) => set({ customSlug }),
		updateCustomDomainId: (customDomainId) => set({ customDomainId }),
		updateLatestQrCode: (latestQrCode) => set({ latestQrCode }),
		updateLastError: (lastError) => set({ lastError }),
		updateBulkMode: (isBulkMode, file) =>
			set({
				bulkMode: {
					isBulkMode,
					file,
				},
			}),
		resetStore: () => set({ ...initState }),
	}));
};
