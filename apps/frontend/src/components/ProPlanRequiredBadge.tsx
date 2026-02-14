'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { SparklesIcon } from '@heroicons/react/24/outline';

export function ProPlanRequiredBadge() {
	const t = useTranslations('general');

	return (
		<Link href="/dashboard/settings/billing">
			<Badge className="bg-teal-600 hover:bg-teal-800 py-2 px-4 text-white" variant="secondary">
				<SparklesIcon className="size-4 mr-2" />
				{t('proRequired')}
			</Badge>
		</Link>
	);
}
