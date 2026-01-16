'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';

export function useApiKeyMutations(apiKeyId: string) {
	const clerk = useClerk();
	const [isRevoking, setIsRevoking] = useState(false);

	const handleRevoke = async () => {
		try {
			setIsRevoking(true);
			await clerk.apiKeys.revoke({ apiKeyID: apiKeyId });
		} finally {
			setIsRevoking(false);
		}
	};

	return {
		isRevoking,
		handleRevoke,
	};
}
