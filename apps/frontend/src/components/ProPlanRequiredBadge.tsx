'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { SparklesIcon } from '@heroicons/react/24/outline';

export function ProPlanRequiredBadge({ source = 'unknown' }: { source?: string }) {
	const t = useTranslations('general');

	useEffect(() => {
		posthog.capture('pro_gate_viewed', { source });
	}, [source]);

	return (
		<Link href="/plans" onClick={() => posthog.capture('pro_gate_clicked', { source })}>
			<Badge className="bg-teal-600 hover:bg-teal-800 py-2 px-4 text-white" variant="secondary">
				<SparklesIcon className="size-4 mr-2" />
				{t('proRequired')}
			</Badge>
		</Link>
	);
}
