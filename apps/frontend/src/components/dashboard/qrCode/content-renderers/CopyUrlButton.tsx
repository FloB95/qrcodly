'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

interface CopyUrlButtonProps {
	url: string;
}

export const CopyUrlButton = ({ url }: CopyUrlButtonProps) => {
	const t = useTranslations();
	const [copied, setCopied] = useState(false);

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			toast({
				title: t('qrCode.table.urlCopied'),
			});
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast({
				variant: 'destructive',
				description: t('general.copyFailed'),
			});
		}
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={handleCopy}
					className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/url:opacity-100"
					aria-label={t('qrCode.table.copyUrl')}
				>
					{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">{t('qrCode.table.copyUrl')}</TooltipContent>
		</Tooltip>
	);
};
