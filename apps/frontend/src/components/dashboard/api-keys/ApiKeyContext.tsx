'use client';

import { createContext, useContext } from 'react';
import { useListApiKeysQuery } from '@/lib/api/api-key';

type ApiKeyContextType = {
	apiKeys: ReturnType<typeof useListApiKeysQuery>;
};

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

type ApiKeyProviderProps = {
	children: React.ReactNode;
};

export function ApiKeyProvider({ children }: ApiKeyProviderProps) {
	const apiKeys = useListApiKeysQuery();
	return <ApiKeyContext.Provider value={{ apiKeys }}>{children}</ApiKeyContext.Provider>;
}

export function useApiKeysContext() {
	const context = useContext(ApiKeyContext);
	if (!context) {
		throw new Error('useApiKeysContext must be used within ApiKeyProvider');
	}
	return context;
}
