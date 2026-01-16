'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { ApiKeyListItemActions } from './ApiKeyListItemActions';
import { useApiKeyMutations } from './hooks/useApiKeyMutations';
import { cn } from '@/lib/utils';
import type { ApiKey } from './types';
import { useTranslations } from 'next-intl';

interface ApiKeyListItemProps {
	apiKey: ApiKey;
	handleRevalidate: () => void;
}

export function ApiKeyListItem({ apiKey, handleRevalidate }: ApiKeyListItemProps) {
	const { isRevoking, handleRevoke } = useApiKeyMutations(apiKey.id);
	const t = useTranslations('settings.apiKeys');

	const createdAt = apiKey.createdAt.toLocaleDateString();
	const lastUsedAt = apiKey.lastUsedAt ? apiKey.lastUsedAt.toLocaleDateString() : '-';
	const expiresAt = apiKey.expiration ? apiKey.expiration.toLocaleDateString() : t('neverExpires');

	async function onRevoke() {
		await handleRevoke();
		handleRevalidate();
	}

	return (
		<TableRow
			className={cn(
				'transition-opacity duration-200 hover:bg-muted/40',
				isRevoking && 'opacity-50 pointer-events-none',
			)}
		>
			<TableCell className="font-medium">{apiKey.name ?? '—'}</TableCell>
			<TableCell>{apiKey.description ?? ''}</TableCell>

			<TableCell className="text-muted-foreground">{expiresAt}</TableCell>
			<TableCell className="text-muted-foreground">{lastUsedAt}</TableCell>
			<TableCell className="text-muted-foreground">{createdAt}</TableCell>

			<TableCell>
				<ApiKeyListItemActions apiKey={apiKey} isRevoking={isRevoking} onRevoke={onRevoke} />
			</TableCell>
		</TableRow>
	);
}
