import { type TQrCodeContent, type TQrCodeOptions, type TShortUrl } from '@shared/schemas';
import { createStore } from 'zustand/vanilla';

export type QrCodeGeneratorState = {
	id?: string;
	name?: string;
	config: TQrCodeOptions;
	content: TQrCodeContent;
	shortUrl?: TShortUrl;
	latestQrCode?: {
		name?: string;
		config: TQrCodeOptions;
		content: TQrCodeContent;
	};
};

export type QrCodeGeneratorActions = {
	updateName: (name: string) => void;
	updateConfig: (config: Partial<TQrCodeOptions>) => void;
	updateContent: (content: TQrCodeContent) => void;
	updateLatestQrCode: (
		latestQrCode:
			| {
					config: TQrCodeOptions;
					content: TQrCodeContent;
			  }
			| undefined,
	) => void;
};

export type QrCodeGeneratorStore = QrCodeGeneratorState & QrCodeGeneratorActions;

export const createQrCodeGeneratorStore = (initState: QrCodeGeneratorState) => {
	// Check if we're in a browser environment
	if (typeof window !== 'undefined') {
		// Check for unsavedQrConfig in localStorage
		const savedConfig = localStorage.getItem('unsavedQrConfig');
		if (savedConfig) {
			try {
				const parsedConfig = JSON.parse(savedConfig) as Partial<TQrCodeOptions>;
				initState.config = {
					...initState.config,
					...parsedConfig,
				};
				// Clear the unsavedQrConfig from localStorage
				localStorage.removeItem('unsavedQrConfig');
			} catch (error) {
				console.error('Failed to parse unsavedQrConfig from localStorage:', error);
			}
		}

		const savedContent = localStorage.getItem('unsavedQrContent');
		if (savedContent) {
			try {
				const parsedContent = JSON.parse(savedContent) as TQrCodeContent;
				initState.content = {
					...initState.content,
					...parsedContent,
				};
				// Clear the unsavedQrContent from localStorage
				localStorage.removeItem('unsavedQrContent');
			} catch (error) {
				console.error('Failed to parse unsavedQrContent from localStorage:', error);
			}
		}
	}

	return createStore<QrCodeGeneratorStore>()((set) => ({
		...initState,
		updateName: (name) => set({ name }),
		updateConfig: (config) => {
			set((state) => ({
				config: {
					...state.config,
					...config,
					imageOptions: {
						...state.config.imageOptions,
						...config.imageOptions,
					},
					dotsOptions: {
						...state.config.dotsOptions,
						...config.dotsOptions,
					},
					backgroundOptions: {
						...state.config.backgroundOptions,
						...config.backgroundOptions,
					},
					cornersSquareOptions: {
						...state.config.cornersSquareOptions,
						...config.cornersSquareOptions,
					},
					cornersDotOptions: {
						...state.config.cornersDotOptions,
						...config.cornersDotOptions,
					},
				},
			}));
		},
		updateContent: (content) => set({ content }),
		updateLatestQrCode: (latestQrCode) => set({ latestQrCode }),
	}));
};
