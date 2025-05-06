import { QrCodeDefaults, type TQrCodeContent, type TQrCodeOptions } from '@shared/schemas';
import { createStore } from 'zustand/vanilla';

export type QrCodeGeneratorState = {
	config: TQrCodeOptions;
	content: TQrCodeContent;
};

export type QrCodeGeneratorActions = {
	updateConfig: (config: Partial<TQrCodeOptions>) => void;
	updateContent: (content: TQrCodeContent) => void;
};

export type QrCodeGeneratorStore = QrCodeGeneratorState & QrCodeGeneratorActions;

export const defaultInitState: QrCodeGeneratorState = {
	config: QrCodeDefaults,
	content: {
		type: 'url',
		data: {
			url: '',
			isEditable: false,
		},
	},
};

export const createQrCodeGeneratorStore = (initState: QrCodeGeneratorState = defaultInitState) => {
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
				console.log('Parsed content from localStorage:', parsedContent);
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
	}));
};
