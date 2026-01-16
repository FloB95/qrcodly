'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty';
import { KeyRound } from 'lucide-react';
import { ApiKeyListItem } from './ApiKeyListItem';
import { useApiKeysContext } from './ApiKeyContext';

export function ApiKeyList() {
	const t = useTranslations('settings.apiKeys');
	const { apiKeys } = useApiKeysContext();
	const [hasFetched, setHasFetched] = useState(false);

	useEffect(() => {
		if (apiKeys.isFetching || apiKeys.isLoading || apiKeys.data?.length > 0) {
			setHasFetched(true);
		}
	}, [apiKeys.isFetching, apiKeys.isLoading]);

	function handleRevalidate() {
		apiKeys.revalidate();
	}

	if (!hasFetched || apiKeys.isLoading || apiKeys.isFetching) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		);
	}

	if (apiKeys.error) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<KeyRound className="h-12 w-12 text-muted-foreground" />
					</EmptyMedia>
					<EmptyTitle>{t('errorTitle')}</EmptyTitle>
					<EmptyDescription>{apiKeys.error.message}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	if (!apiKeys.data || apiKeys.data.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<KeyRound className="h-12 w-12 text-muted-foreground" />
					</EmptyMedia>
					<EmptyTitle>{t('emptyTitle')}</EmptyTitle>
					<EmptyDescription>{t('emptyDescription')}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border">
			<Table>
				<TableHeader className="bg-muted sticky top-0 z-10">
					<TableRow>
						<TableHead>{t('name')}</TableHead>
						<TableHead>{t('descriptionLabel')}</TableHead>
						<TableHead>{t('expiresAt')}</TableHead>
						<TableHead>{t('lastUsedAt')}</TableHead>
						<TableHead>{t('createdAt')}</TableHead>
						<TableHead className="w-[100px]">{t('actions')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{apiKeys.data.map((apiKey) => (
						<ApiKeyListItem key={apiKey.id} apiKey={apiKey} handleRevalidate={handleRevalidate} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}
