'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';

export default function PrintButton() {
	const t = useTranslations('legal');

	return (
		<Button variant="outline" size="sm" onClick={() => window.print()}>
			<Printer className="mr-2 h-4 w-4" />
			{t('printButton')}
		</Button>
	);
}
