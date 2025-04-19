import {
	QrCodeDefaults,
	type TQrCodeContent,
	type TQrCodeContentType,
	type TQrCodeOptions,
} from '@shared/schemas';
import { createStore } from 'zustand/vanilla';

export type QrCodeGeneratorState = {
	config: TQrCodeOptions;
	content: TQrCodeContent;
	contentType: TQrCodeContentType;
};

export type QrCodeGeneratorActions = {
	updateConfig: (config: Partial<TQrCodeOptions>) => void;
	updateContent: (content: TQrCodeContent) => void;
	updateContentType: (contentType: TQrCodeContentType) => void;
};

export type QrCodeGeneratorStore = QrCodeGeneratorState & QrCodeGeneratorActions;

export const defaultInitState: QrCodeGeneratorState = {
	config: QrCodeDefaults,
	content: '',
	contentType: 'url',
};

export const createQrCodeGeneratorStore = (initState: QrCodeGeneratorState = defaultInitState) => {
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
		updateContentType: (contentType) => set({ contentType }),
	}));
};
