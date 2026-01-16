'use client';

import { createContext, useContext } from 'react';
import { useAPIKeys } from '@clerk/nextjs/experimental';
import { useClerk } from '@clerk/nextjs';
import { toast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';

interface ApiKeyContextType {
	apiKeys: ReturnType<typeof useAPIKeys>;
	createApiKey: (data: {
		name: string;
		description?: string;
		expiresInDays?: number | null;
	}) => Promise<string | null>;
	revokeApiKey: (id: string) => Promise<void>;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

interface ApiKeyProviderProps {
	userId: string;
	children: React.ReactNode;
}

export function ApiKeyProvider({ userId, children }: ApiKeyProviderProps) {
	const t = useTranslations('dashboard.apiKeys');
	const clerk = useClerk();
	const apiKeys = useAPIKeys({ subject: userId });

	const createApiKey = async (data: {
		name: string;
		description?: string;
		expiresInDays?: number | null;
	}) => {
		try {
			const key = await clerk.apiKeys.create({
				name: data.name,
				description: data.description,
				secondsUntilExpiration: data.expiresInDays ? data.expiresInDays * 86400 : undefined,
			});
			apiKeys.revalidate();
			return key.secret ?? null;
		} catch (err: any) {
			toast({
				title: t('errorTitle'),
				description: err.message || t('errorDescription'),
				variant: 'destructive',
			});
			return null;
		}
	};

	const revokeApiKey = async (id: string) => {
		try {
			await clerk.apiKeys.revoke({ apiKeyID: id });
			apiKeys.revalidate();
			toast({ title: t('revoked'), description: t('revokedDescription') });
		} catch (err: any) {
			toast({
				title: t('errorTitle'),
				description: err.message || t('errorDescription'),
				variant: 'destructive',
			});
		}
	};

	return (
		<ApiKeyContext.Provider value={{ apiKeys, createApiKey, revokeApiKey }}>
			{children}
		</ApiKeyContext.Provider>
	);
}

export function useApiKeysContext() {
	const context = useContext(ApiKeyContext);
	if (!context) {
		throw new Error('useApiKeysContext must be used within ApiKeyProvider');
	}
	return context;
}
