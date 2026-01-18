'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

export function useApiKeyMutations(apiKeyId: string) {
	const clerk = useClerk();
	const [isRevoking, setIsRevoking] = useState(false);

	const handleRevoke = async () => {
		try {
			setIsRevoking(true);
			await clerk.apiKeys.revoke({ apiKeyID: apiKeyId });
			posthog.capture('api-key:revoked', { apiKeyId });
		} catch (error) {
			Sentry.captureException(error);
			posthog.capture('error:api-key-revoke', { error, apiKeyId });
			throw error;
		} finally {
			setIsRevoking(false);
		}
	};

	return {
		isRevoking,
		handleRevoke,
	};
}
