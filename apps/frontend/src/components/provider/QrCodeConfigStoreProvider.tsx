'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';
import { useStore } from 'zustand';

import {
	type QrCodeGeneratorState,
	type QrCodeGeneratorStore,
	createQrCodeGeneratorStore,
} from '@/store/useQrCodeStore';
import { QrCodeDefaults } from '@shared/schemas';

export const defaultInitState: QrCodeGeneratorState = {
	config: QrCodeDefaults,
	content: {
		type: 'url',
		data: {
			url: '',
			isEditable: false,
		},
	},
	latestQrCode: undefined,
};

export type QrCodeGeneratorStoreApi = ReturnType<typeof createQrCodeGeneratorStore>;

export const QrCodeGeneratorStoreContext = createContext<QrCodeGeneratorStoreApi | undefined>(
	undefined,
);

export interface QrCodeGeneratorStoreProviderProps {
	children: ReactNode;
	initState?: QrCodeGeneratorState;
}

export const QrCodeGeneratorStoreProvider = ({
	children,
	initState,
}: QrCodeGeneratorStoreProviderProps) => {
	const storeRef = useRef<QrCodeGeneratorStoreApi | null>(null);
	storeRef.current ??= createQrCodeGeneratorStore(initState ?? defaultInitState);

	return (
		<QrCodeGeneratorStoreContext.Provider value={storeRef.current}>
			{children}
		</QrCodeGeneratorStoreContext.Provider>
	);
};

export const useQrCodeGeneratorStore = <T,>(selector: (store: QrCodeGeneratorStore) => T): T => {
	const qrCodeGeneratorStoreContext = useContext(QrCodeGeneratorStoreContext);

	if (!qrCodeGeneratorStoreContext) {
		throw new Error(`useQrCodeGeneratorStore must be used within QrCodeGeneratorStoreProvider`);
	}

	return useStore(qrCodeGeneratorStoreContext, selector);
};
