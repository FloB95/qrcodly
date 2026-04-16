'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { ApiKeyListItemActions } from './ApiKeyListItemActions';
import { useRevokeApiKeyMutation } from '@/lib/api/api-key';
import { cn } from '@/lib/utils';
import type { ApiKey } from './types';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

interface ApiKeyListItemProps {
	apiKey: ApiKey;
	handleRevalidate: () => void;
}

export function ApiKeyListItem({ apiKey, handleRevalidate }: ApiKeyListItemProps) {
	const revoke = useRevokeApiKeyMutation();
	const isRevoking = revoke.isPending;
	const t = useTranslations('settings.apiKeys');

	const formatDate = (ms: number | null | undefined) =>
		ms ? new Date(ms).toLocaleDateString() : null;
	const createdAt = formatDate(apiKey.createdAt) ?? '-';
	const lastUsedAt = formatDate(apiKey.lastUsedAt) ?? '-';
	const expiresAt = formatDate(apiKey.expiration) ?? t('neverExpires');

	async function onRevoke() {
		try {
			await revoke.mutateAsync(apiKey.id);
			posthog.capture('api-key:revoked', { apiKeyId: apiKey.id });
			handleRevalidate();
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:api-key-revoke', { error, apiKeyId: apiKey.id });
			throw error;
		}
	}

	return (
		<TableRow className={cn(isRevoking && 'opacity-50 pointer-events-none')}>
			<TableCell className="font-medium">{apiKey.name ?? '—'}</TableCell>
			<TableCell>{apiKey.description ?? ''}</TableCell>

			<TableCell className="text-muted-foreground">{expiresAt}</TableCell>
			<TableCell className="text-muted-foreground">{lastUsedAt}</TableCell>
			<TableCell className="text-muted-foreground">{createdAt}</TableCell>

			<TableCell className="px-2 sticky right-0 sticky-action-cell">
				<ApiKeyListItemActions apiKey={apiKey} isRevoking={isRevoking} onRevoke={onRevoke} />
			</TableCell>
		</TableRow>
	);
}
