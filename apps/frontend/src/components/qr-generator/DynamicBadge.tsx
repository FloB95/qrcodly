import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Badge } from '../ui/badge';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type DynamicBadgeProps = {
	className?: string;
};

export const DynamicBadge = ({ className = '' }: DynamicBadgeProps) => {
	const t = useTranslations();
	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<Badge className={cn('py-2 bg-teal-800 hover:bg-teal-900', className)}>
					Dynamic <CheckBadgeIcon className="ml-2 h-5 w-5" />
				</Badge>
			</HoverCardTrigger>
			<HoverCardContent className="w-80 py-4 text-sm leading-relaxed">
				{t('general.dynamicDescription')}
			</HoverCardContent>
		</HoverCard>
	);
};
