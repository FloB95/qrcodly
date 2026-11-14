'use client';

import { useTranslations } from 'next-intl';
import { SparklesIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function ApiKeyRequiredBadge() {
	const t = useTranslations('general');

	return (
		<Link href="/dashboard/settings/api-keys">
			<Badge variant="secondary" className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
				<SparklesIcon className="size-3 mr-1" />
				{t('apiKeyRequired')}
			</Badge>
		</Link>
	);
}
