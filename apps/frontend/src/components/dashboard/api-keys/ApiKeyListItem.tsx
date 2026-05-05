'use client';

import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ApiKeyListItemActions } from './ApiKeyListItemActions';
import { EditApiKeyDialog } from './EditApiKeyDialog';
import { useRevokeApiKeyMutation } from '@/lib/api/api-key';
import { cn } from '@/lib/utils';
import type { ApiKey } from './types';
import { API_KEY_SCOPES } from '@shared/schemas';
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
	const [showEdit, setShowEdit] = useState(false);

	const formatDate = (ms: number | null | undefined) =>
		ms ? new Date(ms).toLocaleDateString() : null;
	const createdAt = formatDate(apiKey.createdAt) ?? '-';
	const lastUsedAt = formatDate(apiKey.lastUsedAt) ?? '-';
	const expiresAt = formatDate(apiKey.expiration) ?? t('neverExpires');
	const scopes = apiKey.scopes ?? [];
	const hasFullAccess =
		scopes.length === 0 ||
		(scopes.length === API_KEY_SCOPES.length && API_KEY_SCOPES.every((s) => scopes.includes(s)));

	async function onRevoke() {
		try {
			await revoke.mutateAsync(apiKey.id);
			posthog.capture('api-key:revoked', { apiKeyId: apiKey.id });
			handleRevalidate();
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:api-key-revoke', {
				errorName: error instanceof Error ? error.name : 'UnknownError',
				errorMessage: error instanceof Error ? error.message : String(error),
				apiKeyId: apiKey.id,
			});
			throw error;
		}
	}

	return (
		<>
			<TableRow className={cn(isRevoking && 'opacity-50 pointer-events-none')}>
				<TableCell className="font-medium">{apiKey.name ?? '—'}</TableCell>
				<TableCell>{apiKey.description ?? ''}</TableCell>

				<TableCell>
					{hasFullAccess ? (
						<Badge>{t('scopesFullAccess')}</Badge>
					) : (
						<div className="flex flex-wrap gap-1">
							{scopes.map((s) => {
								const labelKey = `scope${s.charAt(0).toUpperCase()}${s.slice(1)}` as
									| 'scopeRead'
									| 'scopeWrite'
									| 'scopeUpdate'
									| 'scopeDelete';
								return <Badge key={s}>{t(labelKey)}</Badge>;
							})}
						</div>
					)}
				</TableCell>

				<TableCell className="text-muted-foreground">{expiresAt}</TableCell>
				<TableCell className="text-muted-foreground">{lastUsedAt}</TableCell>
				<TableCell className="text-muted-foreground">{createdAt}</TableCell>

				<TableCell className="px-2 sticky right-0 sticky-action-cell">
					<ApiKeyListItemActions
						apiKey={apiKey}
						isRevoking={isRevoking}
						onRevoke={onRevoke}
						onEdit={() => setShowEdit(true)}
					/>
				</TableCell>
			</TableRow>

			<EditApiKeyDialog apiKey={apiKey} open={showEdit} onOpenChange={setShowEdit} />
		</>
	);
}
