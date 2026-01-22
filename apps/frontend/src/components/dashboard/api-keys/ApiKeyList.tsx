'use client';

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
import { ApiKeyListItem } from './ApiKeyListItem';
import { useApiKeysContext } from './ApiKeyContext';
import { KeyIcon } from '@heroicons/react/24/outline';

export function ApiKeyList() {
	const t = useTranslations('settings.apiKeys');
	const { apiKeys } = useApiKeysContext();

	const handleRevalidate = () => apiKeys.revalidate();

	if (apiKeys.isLoading) {
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
						<KeyIcon className="h-12 w-12 text-muted-foreground" />
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
						<KeyIcon className="h-12 w-12 text-muted-foreground" />
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
